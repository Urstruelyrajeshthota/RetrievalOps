/**
 * RetrievalOps Core
 *
 * Main orchestrator for the retrieval system.
 * Coordinates embedding, storage, and search operations.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  SearchAdapter,
  EmbeddingProvider,
  Reranker,
  QueryPlanner,
  RetrievalPolicy,
  AdapterCapabilities,
} from '@retrievalops/contracts';
import {
  EntityDefinition,
  getEmbeddableFields,
  getFieldWeight,
} from './entity';
import {
  IndexRequest,
  IndexResult,
  SearchRequest,
  SearchResult,
  RankedResult,
  ResultExplanation,
  MatchedField,
  RetrievalPlan,
  RetrievalTelemetry,
  RetrievalContext,
  DeleteRequest,
  RetrievalOpsConfig,
} from './types';
import {
  EntityRegistry,
  getGlobalRegistry,
} from './registry';
import {
  RetrievalOpsError,
  EntityNotFoundError,
  MissingFieldError,
  ModelMismatchError,
  IndexError,
  SearchError,
} from './errors';
import { Fusion } from './pipeline/fusion';

/**
 * RetrievalOps Core
 *
 * Main SDK class that orchestrates the entire retrieval system.
 *
 * @example
 * ```ts
 * const retrieval = new RetrievalOps({
 *   store: new PgVectorAdapter({ connectionString: "..." }),
 *   embeddings: new LocalEmbeddingProvider()
 * });
 *
 * // Index a document
 * await retrieval.index({
 *   entity: documentSchema,
 *   document: { id: "1", title: "...", content: "..." }
 * });
 *
 * // Search
 * const result = await retrieval.search({
 *   entity: documentSchema,
 *   query: "What is...?"
 * });
 * ```
 */
export class RetrievalOps {
  private config: RetrievalOpsConfig;
  private registry: EntityRegistry;
  private fusion: Fusion;
  private embedderMeta: {
    name: string;
    version: string;
    dimensions: number;
  } | null = null;

  constructor(config: RetrievalOpsConfig) {
    if (!config.store) {
      throw new Error('store (SearchAdapter) is required');
    }

    if (!config.embeddings) {
      throw new Error('embeddings (EmbeddingProvider) is required');
    }

    this.config = {
      hybrid: {
        denseWeight: 0.6,
        keywordWeight: 0.4,
        fusion: 'rrf',
        rrfK: 60,
      },
      cache: {
        ttlMs: 3600000,
        enabled: true,
      },
      ...config,
    };

    this.registry = getGlobalRegistry();
    this.fusion = new Fusion(this.config.hybrid);
  }

  /**
   * Register an entity schema.
   */
  registerEntity(entity: EntityDefinition): void {
    this.registry.register(entity);
  }

  /**
   * Index a document.
   */
  async index(request: IndexRequest): Promise<IndexResult> {
    const startTime = Date.now();

    try {
      // Validate entity exists
      if (!this.registry.has(request.entity.name)) {
        throw new EntityNotFoundError(request.entity.name);
      }

      const entity = request.entity;
      const doc = request.document as Record<string, unknown>;

      // Validate required ID field
      if (!doc[entity.id]) {
        throw new MissingFieldError(entity.id, entity.name);
      }

      const entityId = String(doc[entity.id]);

      // Get embeddings metadata on first use
      if (!this.embedderMeta) {
        this.embedderMeta = this.config.embeddings.metadata();
      }

      const indexedFields: string[] = [];
      let vectorCount = 0;

      // Index each field
      for (const fieldName of getEmbeddableFields(entity, 'semantic')) {
        const fieldValue = doc[fieldName];

        if (!fieldValue || typeof fieldValue !== 'string') {
          continue;
        }

        try {
          // Generate embedding
          const vector = await this.config.embeddings.embedQuery(fieldValue);

          // Validate dimensions
          if (vector.length !== this.embedderMeta.dimensions) {
            throw new ModelMismatchError(
              this.embedderMeta.name,
              this.embedderMeta.name,
              this.embedderMeta.dimensions,
              vector.length
            );
          }

          // Compute content hash
          const contentHash = this.computeHash(fieldValue);

          // Store in adapter
          const storeResult = await this.config.store.index({
            entityType: entity.name,
            entityId,
            field: fieldName,
            text: fieldValue,
            vector,
            contentHash,
            embeddingModel: this.embedderMeta.name,
            embeddingVersion: this.embedderMeta.version,
            distanceMetric: 'cosine',
            sourceUpdatedAt: new Date(),
          } as any);

          if (storeResult.success) {
            indexedFields.push(fieldName);
            vectorCount++;
          }
        } catch (error) {
          console.error(`Failed to index field ${fieldName}:`, error);
        }
      }

      const durationMs = Date.now() - startTime;

      return {
        success: indexedFields.length > 0,
        indexedFields,
        vectorCount,
        model: this.embedderMeta.name,
        durationMs,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new IndexError(
        `Failed to index document: ${message}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Search for documents.
   */
  async search(request: SearchRequest): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      // Validate entity exists
      if (!this.registry.has(request.entity.name)) {
        throw new EntityNotFoundError(request.entity.name);
      }

      const entity = request.entity;
      const topK = request.topK || 10;
      const context = request.context || {};

      // Get embeddings metadata
      if (!this.embedderMeta) {
        this.embedderMeta = this.config.embeddings.metadata();
      }

      // Embed query
      const queryVector = await this.config.embeddings.embedQuery(request.query);

      if (queryVector.length !== this.embedderMeta.dimensions) {
        throw new ModelMismatchError(
          this.embedderMeta.name,
          this.embedderMeta.name,
          this.embedderMeta.dimensions,
          queryVector.length
        );
      }

      const strategy = request.strategy || 'hybrid';
      let candidates = await this.executeStrategy(
        strategy,
        entity.name,
        queryVector,
        request.query,
        topK
      );

      // Deduplicate by entity
      const dedupedCandidates = this.deduplicateByEntity(candidates);

      // Apply field weighting
      const weightedCandidates = this.applyFieldWeights(
        dedupedCandidates,
        entity
      );

      // Rerank if configured
      if (this.config.reranker && weightedCandidates.length > 0) {
        weightedCandidates.sort((a, b) => b.score - a.score);
      }

      // Build ranked results
      const results = weightedCandidates.slice(0, topK).map((c) =>
        this.buildRankedResult(c, entity)
      );

      const durationMs = Date.now() - startTime;

      return {
        results,
        plan: {
          strategy,
          candidateCount: candidates.length,
          usedDenseSearch: true,
          usedKeywordSearch: strategy === 'hybrid',
          usedReranking: !!this.config.reranker,
          fusionAlgorithm: strategy === 'hybrid' ? 'rrf' : undefined,
          description: `Retrieved ${candidates.length} candidates, returned ${results.length}`,
        },
        telemetry: {
          latencyMs: durationMs,
          candidateCount: candidates.length,
          returnedCount: results.length,
          embeddingModel: this.embedderMeta.name,
          adapter: 'pgvector',
        },
        success: true,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const durationMs = Date.now() - startTime;

      return {
        results: [],
        plan: {
          strategy: request.strategy || 'hybrid',
          candidateCount: 0,
          usedDenseSearch: false,
          usedKeywordSearch: false,
          usedReranking: false,
          description: `Search failed: ${message}`,
        },
        telemetry: {
          latencyMs: durationMs,
          candidateCount: 0,
          returnedCount: 0,
          embeddingModel: this.embedderMeta?.name || 'unknown',
          adapter: 'pgvector',
        },
        success: false,
        error: message,
      };
    }
  }

  /**
   * Delete a document.
   */
  async delete(request: DeleteRequest): Promise<void> {
    if (!this.registry.has(request.entity.name)) {
      throw new EntityNotFoundError(request.entity.name);
    }

    await this.config.store.delete({
      entityType: request.entity.name,
      entityId: request.id,
    });
  }

  /**
   * Check adapter health.
   */
  async health(): Promise<{ healthy: boolean; message?: string }> {
    return await this.config.store.health();
  }

  // Private methods

  private async executeStrategy(
    strategy: string,
    entityType: string,
    queryVector: number[],
    queryText: string,
    topK: number
  ): Promise<any[]> {
    switch (strategy) {
      case 'dense':
        return await this.config.store.denseSearch({
          entityType,
          vector: queryVector,
          topK,
        } as any);

      case 'hybrid':
        return await this.executeHybridSearch(
          entityType,
          queryVector,
          queryText,
          topK
        );

      default:
        throw new SearchError(`Unknown strategy: ${strategy}`);
    }
  }

  private async executeHybridSearch(
    entityType: string,
    queryVector: number[],
    queryText: string,
    topK: number
  ): Promise<any[]> {
    const caps = this.config.store.capabilities();

    // Dense search
    const denseResults = await this.config.store.denseSearch({
      entityType,
      vector: queryVector,
      topK,
    } as any);

    // Keyword search (if supported)
    let keywordResults: any[] = [];
    if (caps.supportsKeywordSearch) {
      keywordResults = await (this.config.store as any).keywordSearch({
        entityType,
        vector: queryVector,
        topK,
        query: queryText,
      });
    }

    // Fuse results
    if (keywordResults.length > 0) {
      return this.fusion.rrf(denseResults, keywordResults);
    }

    return denseResults;
  }

  private deduplicateByEntity(candidates: any[]): any[] {
    const seen = new Map<string, any>();

    for (const candidate of candidates) {
      if (!seen.has(candidate.entityId)) {
        seen.set(candidate.entityId, candidate);
      }
    }

    return Array.from(seen.values());
  }

  private applyFieldWeights(
    candidates: any[],
    entity: EntityDefinition
  ): any[] {
    return candidates.map((c) => ({
      ...c,
      score: c.score * getFieldWeight(entity, c.field),
    }));
  }

  private buildRankedResult(
    candidate: any,
    entity: EntityDefinition
  ): RankedResult {
    return {
      id: candidate.entityId,
      entityType: entity.name,
      score: candidate.score,
      document: candidate.metadata || {},
      explanation: {
        intent: this.detectIntent(candidate.field),
        reason: `Matched field: ${candidate.field}`,
        scores: {
          dense: candidate.score,
          final: candidate.score,
        },
        matchedFields: [
          {
            field: candidate.field,
            score: candidate.score,
            strategy: 'semantic',
          },
        ],
        strategy: 'hybrid',
      },
      metadata: candidate.metadata,
    };
  }

  private detectIntent(field: string): string {
    if (field.includes('error') || field.includes('exception')) {
      return 'error';
    }
    if (field.includes('cause') || field.includes('reason')) {
      return 'root_cause';
    }
    if (field.includes('solution') || field.includes('resolution')) {
      return 'solution';
    }
    return 'general';
  }

  private computeHash(text: string): string {
    // Simple hash for now (in production, use crypto.createHash)
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

export { RetrievalOpsConfig };
