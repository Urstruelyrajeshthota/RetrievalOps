/**
 * Core RetrievalOps Types
 *
 * Defines request/response types for indexing and searching.
 */

import { EntityDefinition } from './entity';

/**
 * Context for retrieval operations (tenant, principal, metadata).
 */
export interface RetrievalContext {
  /**
   * Tenant ID for scoped retrieval (if entity uses tenantField).
   */
  tenantId?: string;

  /**
   * Principal ID for access control (if entity uses permissionField).
   */
  principalId?: string;

  /**
   * User metadata for context (optional).
   */
  userMetadata?: Record<string, unknown>;
}

/**
 * Request to index a document.
 */
export interface IndexRequest {
  /**
   * Entity schema being indexed.
   */
  entity: EntityDefinition;

  /**
   * Document data (must include all fields defined in entity).
   *
   * Example:
   * {
   *   id: "doc-1",
   *   title: "Payment failed",
   *   content: "HTTP 503",
   *   orgId: "org-123"
   * }
   */
  document: Record<string, unknown>;

  /**
   * Retrieval context (tenant, principal).
   */
  context?: RetrievalContext;
}

/**
 * Result of indexing a document.
 */
export interface IndexResult {
  /**
   * Whether indexing succeeded.
   */
  success: boolean;

  /**
   * Which fields were indexed.
   */
  indexedFields: string[];

  /**
   * Number of vectors stored.
   */
  vectorCount: number;

  /**
   * Embedding model used.
   */
  model?: string;

  /**
   * Error message if indexing failed.
   */
  error?: string;

  /**
   * Indexing time in milliseconds.
   */
  durationMs?: number;
}

/**
 * Retrieval strategy for search.
 */
export type RetrievalStrategy =
  | 'dense'
  | 'hybrid'
  | 'field_multi_vector'
  | 'two_stage'
  | 'shadow';

/**
 * Request to search.
 */
export interface SearchRequest {
  /**
   * Entity schema to search.
   */
  entity: EntityDefinition;

  /**
   * User query (natural language).
   */
  query: string;

  /**
   * Retrieval context (tenant, principal).
   */
  context?: RetrievalContext;

  /**
   * Retrieval strategy (default: hybrid).
   */
  strategy?: RetrievalStrategy;

  /**
   * Maximum results to return (default: 10).
   */
  topK?: number;

  /**
   * Filters to apply (optional).
   */
  filters?: Record<string, unknown>;
}

/**
 * Matched field details.
 */
export interface MatchedField {
  /**
   * Field name that matched.
   */
  field: string;

  /**
   * Score for this field [0, 1].
   */
  score: number;

  /**
   * Retrieval strategy that matched (semantic, keyword, etc).
   */
  strategy?: 'semantic' | 'keyword' | 'exact';
}

/**
 * Explanation for why a result ranked.
 */
export interface ResultExplanation {
  /**
   * Detected query intent (e.g., "root_cause", "error", "how_to").
   */
  intent?: string;

  /**
   * Human-readable reason for this ranking.
   */
  reason: string;

  /**
   * Score breakdown by signal.
   */
  scores: Record<string, number>;

  /**
   * Which fields matched.
   */
  matchedFields: MatchedField[];

  /**
   * Which filters were applied.
   */
  appliedFilters?: Record<string, boolean>;

  /**
   * Whether result was reranked.
   */
  reranked?: boolean;

  /**
   * Retrieval strategy used.
   */
  strategy?: string;
}

/**
 * A single ranked search result.
 */
export interface RankedResult {
  /**
   * Entity ID (from the ID field).
   */
  id: string;

  /**
   * Entity type (from schema).
   */
  entityType: string;

  /**
   * Overall relevance score [0, 1].
   */
  score: number;

  /**
   * The original entity document.
   */
  document: Record<string, unknown>;

  /**
   * Why this result ranked.
   */
  explanation: ResultExplanation;

  /**
   * Metadata attached during indexing.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Retrieval plan explaining how the search was executed.
 */
export interface RetrievalPlan {
  /**
   * Strategy used (hybrid, dense, etc).
   */
  strategy: string;

  /**
   * Number of candidates initially retrieved.
   */
  candidateCount: number;

  /**
   * Whether keyword search was used.
   */
  usedKeywordSearch: boolean;

  /**
   * Whether dense search was used.
   */
  usedDenseSearch: boolean;

  /**
   * Whether reranking was applied.
   */
  usedReranking: boolean;

  /**
   * Fusion algorithm used (rrf, weighted, etc).
   */
  fusionAlgorithm?: string;

  /**
   * Human-readable description.
   */
  description: string;
}

/**
 * Telemetry from search execution.
 */
export interface RetrievalTelemetry {
  /**
   * Total latency in milliseconds.
   */
  latencyMs: number;

  /**
   * Number of candidates retrieved.
   */
  candidateCount: number;

  /**
   * Number of results returned.
   */
  returnedCount: number;

  /**
   * Dense search latency (if used).
   */
  denseSearchMs?: number;

  /**
   * Keyword search latency (if used).
   */
  keywordSearchMs?: number;

  /**
   * Reranking latency (if used).
   */
  rerankingMs?: number;

  /**
   * Fusion latency.
   */
  fusionMs?: number;

  /**
   * Embedding model used.
   */
  embeddingModel: string;

  /**
   * Adapter used for storage.
   */
  adapter: string;
}

/**
 * Complete search result.
 */
export interface SearchResult {
  /**
   * Ranked results (empty if no matches).
   */
  results: RankedResult[];

  /**
   * How the search was executed.
   */
  plan: RetrievalPlan;

  /**
   * Performance metrics.
   */
  telemetry: RetrievalTelemetry;

  /**
   * Whether search succeeded.
   */
  success: boolean;

  /**
   * Error message if search failed.
   */
  error?: string;
}

/**
 * Request to delete an entity.
 */
export interface DeleteRequest {
  /**
   * Entity schema.
   */
  entity: EntityDefinition;

  /**
   * Entity ID to delete.
   */
  id: string;

  /**
   * Retrieval context (for tenant scoping).
   */
  context?: RetrievalContext;
}

/**
 * Delete result.
 */
export interface DeleteResult {
  /**
   * Whether deletion succeeded.
   */
  success: boolean;

  /**
   * Number of vectors deleted.
   */
  deletedCount: number;

  /**
   * Error message if failed.
   */
  error?: string;
}

/**
 * Configuration for RetrievalOps.
 */
export interface RetrievalOpsConfig {
  /**
   * Search adapter (pgvector, qdrant, etc).
   */
  store: any; // SearchAdapter from contracts

  /**
   * Embedding provider (openai, local, gemini, etc).
   */
  embeddings: any; // EmbeddingProvider from contracts

  /**
   * Optional: Reranker (cross-encoder, llm, etc).
   */
  reranker?: any; // Reranker from contracts

  /**
   * Optional: Policy engine for access control.
   */
  policy?: any; // RetrievalPolicy from contracts

  /**
   * Optional: Query planner for intent detection.
   */
  planner?: any; // QueryPlanner from contracts

  /**
   * Configuration for hybrid retrieval.
   */
  hybrid?: {
    /**
     * Weight for dense search [0, 1] (default: 0.6).
     */
    denseWeight?: number;

    /**
     * Weight for keyword search [0, 1] (default: 0.4).
     */
    keywordWeight?: number;

    /**
     * Fusion algorithm: "rrf" or "weighted" (default: "rrf").
     */
    fusion?: 'rrf' | 'weighted';

    /**
     * RRF parameter k (default: 60).
     */
    rrfK?: number;
  };

  /**
   * Configuration for caching.
   */
  cache?: {
    /**
     * Cache TTL in milliseconds (default: 3600000 = 1 hour).
     */
    ttlMs?: number;

    /**
     * Enable caching (default: true).
     */
    enabled?: boolean;
  };

  /**
   * Configuration for observability.
   */
  observability?: {
    /**
     * Enable telemetry collection (default: true).
     */
    enabled?: boolean;

    /**
     * Telemetry backend endpoint (optional).
     */
    endpoint?: string;
  };
}
