/**
 * RetrievalOps Core
 *
 * Main orchestrator for the retrieval system.
 * Coordinates embedding, storage, and search operations.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  DenseSearchRequest,
  KeywordSearchRequest,
  SearchCandidate,
  IndexRequest as AdapterIndexRequest,
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
  MatchedField,
  RetrievalContext,
  DeleteRequest,
  RetrievalOpsConfig,
} from './types';
import {
  EntityRegistry,
  getGlobalRegistry,
} from './registry';
import {
  EntityNotFoundError,
  MissingFieldError,
  ModelMismatchError,
  IndexError,
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
      const embedderMeta = this.embedderMeta;

      // Metadata carried alongside every vector so it can be matched by
      // tenantId/principalId/fieldFilters at search time. Includes tenant
      // and permission values from the entity's security config, plus the
      // raw value of every field marked for exact-match retrieval.
      const filterMetadata = this.buildIndexMetadata(entity, doc, request.context);

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
          if (vector.length !== embedderMeta.dimensions) {
            throw new ModelMismatchError(
              embedderMeta.name,
              embedderMeta.name,
              embedderMeta.dimensions,
              vector.length
            );
          }

          // Compute content hash
          const contentHash = this.computeHash(fieldValue);

          const adapterRequest: AdapterIndexRequest = {
            id: uuidv4(),
            entityType: entity.name,
            entityId,
            field: fieldName,
            text: fieldValue,
            vector,
            contentHash,
            embeddingModel: embedderMeta.name,
            embeddingVersion: embedderMeta.version,
            distanceMetric: 'cosine',
            dimensions: vector.length,
            weight: getFieldWeight(entity, fieldName),
            retrievalStrategies: entity.fields[fieldName]?.retrieval,
            metadata: filterMetadata,
            createdAt: new Date(),
          };

          // Store in adapter
          const storeResult = await this.config.store.index(adapterRequest);

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
        model: embedderMeta.name,
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
    const strategyRequested = request.strategy || 'hybrid';

    try {
      // Validate entity exists
      if (!this.registry.has(request.entity.name)) {
        throw new EntityNotFoundError(request.entity.name);
      }

      const entity = request.entity;
      const topK = request.topK || 10;
      const context = request.context || {};

      // Access control: ask the policy engine before running the search.
      // RetrievalOps surfaces evidence; it does not decide access on its own.
      if (this.config.policy) {
        const decision = await this.config.policy.authorize({
          entityType: entity.name,
          tenantId: context.tenantId,
          principalId: context.principalId,
          action: 'search',
        });

        if (!decision.allowed) {
          const durationMs = Date.now() - startTime;
          return {
            results: [],
            plan: {
              strategy: strategyRequested,
              candidateCount: 0,
              usedDenseSearch: false,
              usedKeywordSearch: false,
              usedReranking: false,
              description: `Access denied: ${decision.reason || 'not authorized'}`,
            },
            telemetry: {
              latencyMs: durationMs,
              candidateCount: 0,
              returnedCount: 0,
              embeddingModel: this.embedderMeta?.name || 'unknown',
              adapter: this.config.store.getBackendType(),
            },
            success: false,
            error: `Access denied: ${decision.reason || 'not authorized'}`,
          };
        }
      }

      // Get embeddings metadata
      if (!this.embedderMeta) {
        this.embedderMeta = this.config.embeddings.metadata();
      }
      const embedderMeta = this.embedderMeta;

      // Embed query
      const queryVector = await this.config.embeddings.embedQuery(request.query);

      if (queryVector.length !== embedderMeta.dimensions) {
        throw new ModelMismatchError(
          embedderMeta.name,
          embedderMeta.name,
          embedderMeta.dimensions,
          queryVector.length
        );
      }

      let strategy: string = strategyRequested;

      // Let a configured query planner pick the strategy when the caller
      // didn't explicitly request one.
      if (this.config.planner && !request.strategy) {
        try {
          const plan = await this.config.planner.plan({
            query: request.query,
            entityType: entity.name,
            context: context as Record<string, unknown>,
          });
          if (plan.strategy) {
            strategy = plan.strategy;
          }
        } catch (error) {
          console.error('Query planner failed, falling back to default strategy:', error);
        }
      }

      const denseStart = Date.now();
      const { fused: candidates, denseResults, keywordResults, usedKeywordSearch } =
        await this.executeStrategy(
          strategy,
          entity.name,
          queryVector,
          request.query,
          topK,
          context,
          request.filters
        );
      const searchMs = Date.now() - denseStart;

      // Preserve every field that matched per entity (across dense and
      // keyword search) so the explanation can cite all matching evidence,
      // not just whichever field happened to win the fused ranking.
      const matchedFieldsByEntity = this.buildMatchedFieldsIndex(
        denseResults,
        keywordResults
      );

      // Deduplicate by entity (fused ranking already collapses per entity;
      // this keeps the highest-ranked candidate as the representative row).
      let workingCandidates = this.deduplicateByEntity(candidates);

      // Apply field weighting
      workingCandidates = this.applyFieldWeights(workingCandidates, entity);

      // Policy-level document filtering (e.g. per-document ACLs). Applied
      // after retrieval so the policy engine sees the actual candidate set.
      if (this.config.policy) {
        workingCandidates = (await this.config.policy.filter(
          workingCandidates as SearchCandidate[],
          context as RetrievalContext
        )) as any[];
      }

      // Rerank if configured
      let reranked = false;
      const rerankStart = Date.now();
      if (this.config.reranker && workingCandidates.length > 0) {
        try {
          const rerankedCandidates = await this.config.reranker.rerank(
            request.query,
            workingCandidates as SearchCandidate[]
          );
          workingCandidates = rerankedCandidates.map((c) => ({
            ...c,
            score: c.rerankScore ?? c.score,
          }));
          reranked = true;
        } catch (error) {
          console.error('Reranking failed, falling back to fused scores:', error);
        }
      }
      const rerankingMs = this.config.reranker ? Date.now() - rerankStart : undefined;

      workingCandidates.sort((a, b) => b.score - a.score);

      // Build ranked results
      const results = workingCandidates.slice(0, topK).map((c) =>
        this.buildRankedResult(
          c,
          entity,
          matchedFieldsByEntity.get(c.entityId) || [],
          reranked
        )
      );

      const durationMs = Date.now() - startTime;

      return {
        results,
        plan: {
          strategy,
          candidateCount: candidates.length,
          usedDenseSearch: true,
          usedKeywordSearch,
          usedReranking: reranked,
          fusionAlgorithm: usedKeywordSearch ? this.config.hybrid?.fusion || 'rrf' : undefined,
          description: `Retrieved ${candidates.length} candidates, returned ${results.length}`,
        },
        telemetry: {
          latencyMs: durationMs,
          candidateCount: candidates.length,
          returnedCount: results.length,
          denseSearchMs: searchMs,
          keywordSearchMs: usedKeywordSearch ? searchMs : undefined,
          rerankingMs,
          embeddingModel: embedderMeta.name,
          adapter: this.config.store.getBackendType(),
        },
        success: true,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const durationMs = Date.now() - startTime;

      return {
        results: [],
        plan: {
          strategy: strategyRequested,
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
          adapter: this.config.store.getBackendType?.() || 'unknown',
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
    const status = await this.config.store.health();
    return { healthy: status.healthy, message: status.status };
  }

  // Private methods

  /**
   * Build the metadata stored alongside every vector for a document.
   * Carries tenant/principal scoping plus the raw value of any field
   * marked "exact" so search-time filters can match against it.
   */
  private buildIndexMetadata(
    entity: EntityDefinition,
    doc: Record<string, unknown>,
    context?: RetrievalContext
  ): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};

    const tenantId =
      context?.tenantId ??
      (entity.security?.tenantField ? doc[entity.security.tenantField] : undefined);
    if (tenantId !== undefined) {
      metadata.tenantId = tenantId;
    }

    if (entity.security?.permissionField) {
      metadata.permittedPrincipals = doc[entity.security.permissionField];
    }

    for (const fieldName of getEmbeddableFields(entity, 'exact')) {
      metadata[fieldName] = doc[fieldName];
    }

    return metadata;
  }

  private async executeStrategy(
    strategy: string,
    entityType: string,
    queryVector: number[],
    queryText: string,
    topK: number,
    context: RetrievalContext,
    filters?: Record<string, unknown>
  ): Promise<{
    fused: SearchCandidate[];
    denseResults: SearchCandidate[];
    keywordResults: SearchCandidate[];
    usedKeywordSearch: boolean;
  }> {
    switch (strategy) {
      case 'dense': {
        const denseResults = await this.config.store.denseSearch(
          this.buildDenseSearchRequest(entityType, queryVector, topK, context, filters)
        );
        return { fused: denseResults, denseResults, keywordResults: [], usedKeywordSearch: false };
      }

      case 'hybrid':
      default:
        return await this.executeHybridSearch(
          entityType,
          queryVector,
          queryText,
          topK,
          context,
          filters
        );
    }
  }

  private buildDenseSearchRequest(
    entityType: string,
    queryVector: number[],
    topK: number,
    context: RetrievalContext,
    filters?: Record<string, unknown>
  ): DenseSearchRequest {
    return {
      queryVector,
      entityType,
      topK,
      fieldFilters: filters,
      tenantId: context.tenantId,
      principalId: context.principalId,
    };
  }

  private buildKeywordSearchRequest(
    entityType: string,
    queryText: string,
    topK: number,
    context: RetrievalContext,
    filters?: Record<string, unknown>
  ): KeywordSearchRequest {
    return {
      query: queryText,
      entityType,
      topK,
      fieldFilters: filters,
      tenantId: context.tenantId,
      principalId: context.principalId,
    };
  }

  private async executeHybridSearch(
    entityType: string,
    queryVector: number[],
    queryText: string,
    topK: number,
    context: RetrievalContext,
    filters?: Record<string, unknown>
  ): Promise<{
    fused: SearchCandidate[];
    denseResults: SearchCandidate[];
    keywordResults: SearchCandidate[];
    usedKeywordSearch: boolean;
  }> {
    const caps = await this.config.store.getCapabilities();

    // Dense search
    const denseResults = await this.config.store.denseSearch(
      this.buildDenseSearchRequest(entityType, queryVector, topK, context, filters)
    );

    // Keyword search (if supported)
    let keywordResults: SearchCandidate[] = [];
    if (caps.keyword) {
      keywordResults = await this.config.store.keywordSearch(
        this.buildKeywordSearchRequest(entityType, queryText, topK, context, filters)
      );
    }

    // Fuse results
    const fused =
      keywordResults.length > 0
        ? this.fusion.rrf(denseResults, keywordResults)
        : denseResults;

    return { fused, denseResults, keywordResults, usedKeywordSearch: keywordResults.length > 0 };
  }

  /**
   * Group raw dense/keyword candidates by entity so an entity's
   * explanation can cite every field that matched, not just the one
   * field that happened to win the fused ranking.
   */
  private buildMatchedFieldsIndex(
    denseResults: SearchCandidate[],
    keywordResults: SearchCandidate[]
  ): Map<string, MatchedField[]> {
    const index = new Map<string, MatchedField[]>();

    const add = (candidate: SearchCandidate, strategy: 'semantic' | 'keyword') => {
      const list = index.get(candidate.entityId) || [];
      list.push({ field: candidate.field, score: candidate.score, strategy });
      index.set(candidate.entityId, list);
    };

    denseResults.forEach((c) => add(c, 'semantic'));
    keywordResults.forEach((c) => add(c, 'keyword'));

    return index;
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
    entity: EntityDefinition,
    matchedFields: MatchedField[],
    reranked: boolean
  ): RankedResult {
    const fields = matchedFields.length > 0
      ? matchedFields
      : [{ field: candidate.field, score: candidate.score, strategy: 'semantic' as const }];

    const strategies = Array.from(new Set(fields.map((f) => f.strategy)));
    const fieldNames = Array.from(new Set(fields.map((f) => f.field)));

    return {
      id: candidate.entityId,
      entityType: entity.name,
      score: candidate.score,
      document: candidate.metadata || {},
      explanation: {
        intent: this.detectIntent(candidate.field),
        reason:
          fieldNames.length > 1
            ? `Matched fields: ${fieldNames.join(', ')} (${strategies.join(' + ')})`
            : `Matched field: ${candidate.field}`,
        scores: {
          dense: candidate.originalScores?.dense ?? candidate.score,
          keyword: candidate.originalScores?.keyword ?? 0,
          final: candidate.score,
        },
        matchedFields: fields,
        reranked,
        strategy: strategies.length > 1 ? 'hybrid' : strategies[0],
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
