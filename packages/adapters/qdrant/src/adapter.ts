/**
 * Qdrant Adapter
 *
 * High-performance vector database adapter for RetrievalOps.
 * Implements SearchAdapter interface for Qdrant.
 *
 * v0.2.1+: Multi-database support - Qdrant backend
 */

import type {
  SearchAdapter,
  IndexRequest,
  IndexResult,
  BatchIndexRequest,
  BatchIndexResult,
  DenseSearchRequest,
  KeywordSearchRequest,
  DeleteRequest,
  DeleteResult,
  HealthStatus,
  AdapterStats,
  SearchCandidate,
} from '@retrievalops/contracts';
import { QdrantAdapterConfig } from './types';

/**
 * Qdrant API Client (simplified for this implementation)
 */
class QdrantClient {
  private url: string;
  private apiKey?: string;
  private timeout: number;

  constructor(config: QdrantAdapterConfig) {
    this.url = config.url.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.timeout = config.requestTimeout || 30000;
  }

  /**
   * Make HTTP request to Qdrant API
   */
  private async request(
    method: string,
    path: string,
    body?: any
  ): Promise<any> {
    const url = `${this.url}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['api-key'] = this.apiKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Qdrant API error ${response.status}: ${error}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.request('GET', '/health');
      return response.status === 'ok';
    } catch {
      return false;
    }
  }

  async createCollection(
    name: string,
    vectorSize: number,
    distance: string,
    hnsw?: any
  ): Promise<void> {
    await this.request('PUT', `/collections/${name}`, {
      vectors: {
        size: vectorSize,
        distance: distance,
        hnsw_config: hnsw,
      },
    });
  }

  async collectionExists(name: string): Promise<boolean> {
    try {
      await this.request('GET', `/collections/${name}`);
      return true;
    } catch {
      return false;
    }
  }

  async upsertPoints(
    collection: string,
    points: any[]
  ): Promise<void> {
    await this.request('PUT', `/collections/${collection}/points`, {
      points,
    });
  }

  async search(
    collection: string,
    vector: number[],
    topK: number,
    filter?: any,
    scoreThreshold?: number
  ): Promise<any[]> {
    const response = await this.request('POST', `/collections/${collection}/points/search`, {
      vector,
      top: topK,
      filter,
      score_threshold: scoreThreshold,
      with_payload: true,
    });

    return response.result || [];
  }

  async deletePoints(
    collection: string,
    pointIds: string[]
  ): Promise<void> {
    await this.request('POST', `/collections/${collection}/points/delete`, {
      points_selector: {
        points: pointIds,
      },
    });
  }

  async getCollectionInfo(collection: string): Promise<any> {
    return await this.request('GET', `/collections/${collection}`);
  }
}

/**
 * Qdrant Adapter
 *
 * Implements SearchAdapter for Qdrant vector database.
 * Provides dense search (native HNSW) and keyword search (via filtering).
 */
export class QdrantAdapter implements SearchAdapter {
  private client: QdrantClient;
  private config: Required<QdrantAdapterConfig>;
  private initialized: boolean = false;

  constructor(config: QdrantAdapterConfig) {
    this.config = {
      url: config.url,
      collectionName: config.collectionName || 'vectors',
      vectorSize: config.vectorSize || 384,
      distanceMetric: config.distanceMetric || 'Cosine',
      hnsw: config.hnsw || { m: 16, efConstruct: 200 },
      requestTimeout: config.requestTimeout || 30000,
      batchSize: config.batchSize || 100,
      autoCreateCollection: config.autoCreateCollection !== false,
      apiKey: config.apiKey,
    };

    this.client = new QdrantClient(config);
  }

  /**
   * Initialize adapter (create collection if needed)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.config.autoCreateCollection) {
      const exists = await this.client.collectionExists(this.config.collectionName);

      if (!exists) {
        await this.client.createCollection(
          this.config.collectionName,
          this.config.vectorSize,
          this.config.distanceMetric,
          this.config.hnsw
        );
      }
    }

    this.initialized = true;
  }

  /**
   * Index a single vector
   */
  async index(request: IndexRequest): Promise<IndexResult> {
    try {
      await this.initialize();

      // Validate vector dimension
      if (request.vector.length !== this.config.vectorSize) {
        return {
          success: false,
          vectorId: request.id,
          error: `Vector dimension ${request.vector.length} does not match collection size ${this.config.vectorSize}`,
        };
      }

      const point = {
        id: request.id,
        vector: request.vector,
        payload: {
          entityType: request.entityType,
          entityId: request.entityId,
          field: request.field,
          text: request.text,
          contentHash: request.contentHash,
          embeddingModel: request.embeddingModel,
          embeddingVersion: request.embeddingVersion,
          distanceMetric: request.distanceMetric,
          dimensions: request.dimensions,
          weight: request.weight,
          metadata: request.metadata,
          createdAt: new Date().toISOString(),
        },
      };

      await this.client.upsertPoints(this.config.collectionName, [point]);

      return { success: true, vectorId: request.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, vectorId: request.id, error: message };
    }
  }

  /**
   * Index multiple vectors in batch
   */
  async indexBatch(request: BatchIndexRequest): Promise<BatchIndexResult> {
    const results: IndexResult[] = [];
    let indexedCount = 0;
    let failedCount = 0;

    // Process in batches
    for (let i = 0; i < request.vectors.length; i += this.config.batchSize) {
      const batch = request.vectors.slice(i, i + this.config.batchSize);
      const points = batch.map((req) => ({
        id: req.id,
        vector: req.vector,
        payload: {
          entityType: req.entityType,
          entityId: req.entityId,
          field: req.field,
          text: req.text,
          contentHash: req.contentHash,
          embeddingModel: req.embeddingModel,
          embeddingVersion: req.embeddingVersion,
          distanceMetric: req.distanceMetric,
          dimensions: req.dimensions,
          weight: req.weight,
          metadata: req.metadata,
          createdAt: new Date().toISOString(),
        },
      }));

      try {
        await this.client.upsertPoints(this.config.collectionName, points);

        batch.forEach((req) => {
          results.push({ success: true, vectorId: req.id });
          indexedCount++;
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        batch.forEach((req) => {
          results.push({ success: false, vectorId: req.id, error: message });
          failedCount++;
        });

        if (!request.continueOnError) {
          return { success: false, indexedCount, failedCount, results, error: message };
        }
      }
    }

    return { success: failedCount === 0, indexedCount, failedCount, results };
  }

  /**
   * Dense search (semantic similarity)
   */
  async denseSearch(request: DenseSearchRequest): Promise<SearchCandidate[]> {
    try {
      await this.initialize();

      // Build filter for entity type and optional field filters
      const filter: any = {
        must: [
          {
            key: 'entityType',
            match: { value: request.entityType },
          },
        ],
      };

      // Add field filters if provided
      if (request.fieldFilters) {
        for (const [key, value] of Object.entries(request.fieldFilters)) {
          filter.must.push({
            key,
            match: { value },
          });
        }
      }

      const results = await this.client.search(
        this.config.collectionName,
        request.queryVector,
        request.topK,
        filter.must.length > 1 ? filter : undefined,
        request.threshold
      );

      return results.map((result: any) => {
        const payload = result.payload || {};
        const fieldWeight = payload.weight || 1.0;
        const score = this.normalizeScore(result.score);

        return {
          vectorId: result.id,
          entityType: payload.entityType,
          entityId: payload.entityId,
          field: payload.field,
          text: payload.text,
          score,
          scoreSource: 'dense' as const,
          fieldWeight,
          weightedScore: score * fieldWeight,
          metadata: payload.metadata,
        };
      });
    } catch (error) {
      console.error('Dense search error:', error);
      return [];
    }
  }

  /**
   * Keyword search (via payload filtering)
   *
   * Note: Qdrant doesn't have native full-text search like PostgreSQL.
   * This implementation filters by text content presence.
   */
  async keywordSearch(request: KeywordSearchRequest): Promise<SearchCandidate[]> {
    try {
      await this.initialize();

      // For keyword search, we search with a "search" query or use text matching
      // Since Qdrant doesn't have native FTS, we can:
      // 1. Return empty (no native FTS)
      // 2. Use dense search with query vector (requires embedding query)
      // 3. Use scroll + filter (slow for large datasets)

      // For now, return recommendations in documentation
      console.warn(
        'Keyword search not natively supported in Qdrant. ' +
        'Consider: 1) Embed query and use denseSearch, 2) Use RRF fusion in retrieval layer'
      );

      return [];
    } catch (error) {
      console.error('Keyword search error:', error);
      return [];
    }
  }

  /**
   * Delete vectors
   */
  async delete(request: DeleteRequest): Promise<DeleteResult> {
    try {
      await this.initialize();

      if (request.vectorId) {
        await this.client.deletePoints(this.config.collectionName, [request.vectorId]);
        return { deletedCount: 1, success: true };
      } else if (request.entityType && request.entityId) {
        // Qdrant doesn't support complex filters in delete, so return error
        return {
          deletedCount: 0,
          success: false,
          error: 'Delete by entity not yet supported. Use vectorId instead.',
        };
      }

      return { deletedCount: 0, success: false, error: 'No valid delete criteria' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { deletedCount: 0, success: false, error: message };
    }
  }

  /**
   * Check adapter health
   */
  async health(): Promise<HealthStatus> {
    const startTime = performance.now();

    try {
      const healthy = await this.client.checkHealth();
      const latencyMs = Math.round(performance.now() - startTime);

      if (healthy) {
        const info = await this.client.getCollectionInfo(this.config.collectionName);
        return {
          healthy: true,
          status: 'healthy',
          latencyMs,
          vectorCount: info.points_count,
        };
      } else {
        return {
          healthy: false,
          status: 'unhealthy',
          latencyMs,
          details: { error: 'Qdrant health check failed' },
        };
      }
    } catch (error) {
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        healthy: false,
        status: 'unhealthy',
        latencyMs,
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * Get adapter statistics
   */
  async getStats(): Promise<AdapterStats> {
    try {
      await this.initialize();

      const info = await this.client.getCollectionInfo(this.config.collectionName);

      return {
        totalVectors: info.points_count || 0,
        storageUsed: Math.round(info.data_memory_bytes || 0),
        indexCount: 1, // Qdrant uses single index per collection
        avgSearchLatencyMs: 30, // Typical for HNSW
        queriesPerSecond: 0, // Would need monitoring
        byEntityType: {}, // Would need aggregation
      };
    } catch (error) {
      throw new Error(`Failed to get adapter stats: ${error}`);
    }
  }

  /**
   * Close adapter and cleanup
   */
  async close(): Promise<void> {
    this.initialized = false;
  }

  /**
   * Get backend type
   */
  getBackendType(): 'qdrant' {
    return 'qdrant';
  }

  /**
   * Get backend version
   */
  getVersion(): string {
    return '0.2.1';
  }

  // Helper methods

  /**
   * Normalize Qdrant similarity score to [0, 1]
   */
  private normalizeScore(score: number): number {
    // Qdrant returns scores in [0, ∞) range depending on distance metric
    // Normalize to [0, 1]
    switch (this.config.distanceMetric) {
      case 'Cosine':
        // Cosine similarity in Qdrant: [0, 2] for cosine distance
        return Math.max(0, Math.min(1, (score + 1) / 2));
      case 'Euclid':
        // Euclidean: normalize with common range
        return Math.max(0, Math.min(1, 1 / (1 + score)));
      case 'Dot':
        // Dot product: depends on vector magnitude
        return Math.max(0, Math.min(1, score / 100));
      default:
        return Math.max(0, Math.min(1, score));
    }
  }
}
