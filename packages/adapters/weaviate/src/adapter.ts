import {
  SearchAdapter,
  IndexRequest,
  IndexResult,
  BatchIndexRequest,
  BatchIndexResult,
  DenseSearchRequest,
  KeywordSearchRequest,
  SearchCandidate,
  DeleteRequest,
  DeleteResult,
  HealthStatus,
  AdapterStats,
} from '@itsrajeshthota/retrievalops-contracts';
import { WeaviateAdapterConfig } from './types';

export class WeaviateAdapter implements SearchAdapter {
  private config: WeaviateAdapterConfig;
  private initialized = false;
  private vectorDim = 384;

  constructor(config: WeaviateAdapterConfig) {
    if (!config.url || !config.className) {
      throw new Error('WeaviateAdapterConfig requires url and className');
    }
    this.config = {
      vectorProperty: 'vector',
      distanceMetric: 'cosine',
      requestTimeout: 30000,
      autoCreate: true,
      vectorDim: 384,
      ...config,
    };
    this.vectorDim = this.config.vectorDim || 384;
  }

  async initialize(): Promise<void> {
    try {
      const health = await this.checkHealth();
      if (!health) {
        throw new Error(`Cannot connect to Weaviate at ${this.config.url}`);
      }
      this.initialized = true;
    } catch (error) {
      throw new Error(
        `Weaviate initialization failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async index(request: IndexRequest): Promise<IndexResult> {
    this.ensureInitialized();
    try {
      const id = await this.indexObject(request.id, request.vector, request.metadata);
      return { id: request.id, vectorId: id, indexed: true };
    } catch (error) {
      throw new Error(
        `Failed to index ${request.id}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async indexBatch(request: BatchIndexRequest): Promise<BatchIndexResult> {
    this.ensureInitialized();
    const results = [];
    const errors = [];

    for (let i = 0; i < request.documents.length; i++) {
      try {
        const doc = request.documents[i];
        const result = await this.index({
          id: doc.id,
          vector: doc.vector,
          metadata: doc.metadata,
          tenantId: request.tenantId,
        });
        results.push(result);
      } catch (error) {
        errors.push({
          index: i,
          id: request.documents[i].id,
          error: error instanceof Error ? error.message : String(error),
        });
        if (!request.continueOnError) throw error;
      }
    }

    return { indexed: results.length, failed: errors.length, errors: errors.length > 0 ? errors : undefined };
  }

  async denseSearch(request: DenseSearchRequest): Promise<SearchCandidate[]> {
    this.ensureInitialized();
    try {
      const candidates = await this.vectorSearch(request.query, request.limit || 10);
      return candidates.map(c => ({
        id: c.id,
        score: this.normalizeScore(c.score),
        fields: c.metadata || {},
        metadata: c.metadata || {},
      }));
    } catch (error) {
      throw new Error(`Dense search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async keywordSearch(request: KeywordSearchRequest): Promise<SearchCandidate[]> {
    this.ensureInitialized();
    try {
      const candidates = await this.bm25Search(request.query, request.limit || 10);
      return candidates.map(c => ({
        id: c.id,
        score: this.normalizeScore(c.score),
        fields: c.metadata || {},
        metadata: c.metadata || {},
      }));
    } catch (error) {
      throw new Error(`Keyword search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async delete(request: DeleteRequest): Promise<DeleteResult> {
    this.ensureInitialized();
    try {
      if (request.vectorId) {
        await this.deleteObject(request.vectorId);
        return { deleted: 1, success: true };
      }
      return { deleted: 0, success: true };
    } catch (error) {
      throw new Error(`Delete failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async health(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const healthy = await this.checkHealth();
      return {
        healthy,
        latency: Date.now() - start,
        status: healthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - start,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getStats(): Promise<AdapterStats> {
    this.ensureInitialized();
    return {
      totalDocuments: 0,
      indexSize: 0,
      indexedFields: 0,
      health: 'healthy',
      backend: this.getBackendType(),
      version: await this.getVersion(),
      timestamp: new Date().toISOString(),
    };
  }

  async close(): Promise<void> {
    this.initialized = false;
  }

  getBackendType(): string {
    return 'weaviate';
  }

  async getVersion(): Promise<string> {
    try {
      const response = await fetch(`${this.config.url}/v1/meta`, {
        timeout: this.config.requestTimeout,
      });
      const data = (await response.json()) as any;
      return data.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Adapter not initialized. Call initialize() first.');
    }
  }

  private async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.url}/v1/.well-known/ready`, {
        timeout: this.config.requestTimeout,
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async indexObject(id: string, vector: number[], metadata?: Record<string, any>): Promise<string> {
    try {
      const obj = {
        class: this.config.className,
        id,
        vector,
        properties: metadata || {},
      };

      const response = await fetch(`${this.config.url}/v1/objects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obj),
        timeout: this.config.requestTimeout,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = (await response.json()) as any;
      return result.id || id;
    } catch (error) {
      throw new Error(`Failed to index object: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async vectorSearch(
    query: number[],
    limit: number
  ): Promise<Array<{ id: string; score: number; metadata?: Record<string, any> }>> {
    try {
      const graphqlQuery = `
        {
          Get {
            ${this.config.className}(
              nearVector: { vector: [${query.join(', ')}] }
              limit: ${limit}
            ) {
              _additional {
                id
                distance
              }
              properties
            }
          }
        }
      `;

      const response = await fetch(`${this.config.url}/v1/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: graphqlQuery }),
        timeout: this.config.requestTimeout,
      });

      if (!response.ok) {
        return [];
      }

      const result = (await response.json()) as any;
      const objects = result.data?.Get?.[this.config.className] || [];

      return objects.map((obj: any) => ({
        id: obj._additional?.id || '',
        score: this.distanceToScore(obj._additional?.distance || 1),
        metadata: obj.properties || {},
      }));
    } catch {
      return [];
    }
  }

  private async bm25Search(
    query: string,
    limit: number
  ): Promise<Array<{ id: string; score: number; metadata?: Record<string, any> }>> {
    try {
      const graphqlQuery = `
        {
          Get {
            ${this.config.className}(
              bm25: { query: "${query.replace(/"/g, '\\"')}" }
              limit: ${limit}
            ) {
              _additional {
                id
                score
              }
              properties
            }
          }
        }
      `;

      const response = await fetch(`${this.config.url}/v1/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: graphqlQuery }),
        timeout: this.config.requestTimeout,
      });

      if (!response.ok) {
        return [];
      }

      const result = (await response.json()) as any;
      const objects = result.data?.Get?.[this.config.className] || [];

      return objects.map((obj: any) => ({
        id: obj._additional?.id || '',
        score: this.normalizeScore(obj._additional?.score || 0),
        metadata: obj.properties || {},
      }));
    } catch {
      return [];
    }
  }

  private async deleteObject(id: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.config.url}/v1/objects/${this.config.className}/${id}`,
        {
          method: 'DELETE',
          timeout: this.config.requestTimeout,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Failed to delete object: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private distanceToScore(distance: number): number {
    // Convert Weaviate distance to similarity score [0, 1]
    // For cosine: distance is in range [0, 2], 0 = identical, 2 = opposite
    const normalizedDistance = Math.max(0, Math.min(2, distance));
    return 1 - normalizedDistance / 2;
  }

  private normalizeScore(score: number): number {
    return Math.max(0, Math.min(1, score));
  }
}

export default WeaviateAdapter;
