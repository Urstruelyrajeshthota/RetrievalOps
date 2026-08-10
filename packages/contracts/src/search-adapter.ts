/**
 * SearchAdapter Interface
 *
 * Unified abstraction for all storage backends (PostgreSQL, Qdrant, Weaviate, etc.)
 * Enables pluggable multi-database support while maintaining consistent API.
 *
 * v0.2.0+: Core interface for multi-database support
 */

/**
 * Vector representation
 */
export interface Vector {
  id: string;
  vector: number[];
  metadata?: Record<string, unknown>;
}

/**
 * Indexing request
 */
export interface IndexRequest {
  /** Unique identifier for the vector */
  id: string;

  /** Entity type (e.g., "jira_ticket", "document") */
  entityType: string;

  /** Entity ID within the type */
  entityId: string;

  /** Field name being indexed */
  field: string;

  /** Original text content */
  text: string;

  /** Dense vector (384D for all adapters) */
  vector: number[];

  /** SHA-256 hash of content for deduplication */
  contentHash: string;

  /** Embedding model used (e.g., "Xenova/all-MiniLM-L6-v2") */
  embeddingModel: string;

  /** Version of embedding model */
  embeddingVersion: string;

  /** Distance metric: cosine, dot, euclidean */
  distanceMetric: 'cosine' | 'dot' | 'euclidean';

  /** Vector dimension (typically 384) */
  dimensions: number;

  /** Arbitrary metadata for filtering/analysis */
  metadata?: Record<string, unknown>;

  /** Field weight for ranking (e.g., 1.2) */
  weight?: number;

  /** Retrieval strategies for this field (semantic, keyword, exact) */
  retrievalStrategies?: ('semantic' | 'keyword' | 'exact')[];

  /** Timestamp of content creation */
  createdAt?: Date;

  /** Timestamp of last update */
  updatedAt?: Date;
}

/**
 * Indexing result
 */
export interface IndexResult {
  /** Whether indexing succeeded */
  success: boolean;

  /** Vector ID that was indexed */
  vectorId: string;

  /** Error message if failed */
  error?: string;

  /** Time taken in milliseconds */
  latencyMs?: number;
}

/**
 * Dense search request (semantic search)
 */
export interface DenseSearchRequest {
  /** Query vector (384D) */
  queryVector: number[];

  /** Entity type to search within */
  entityType: string;

  /** Maximum number of results */
  topK: number;

  /** Minimum similarity threshold (0.0-1.0) */
  threshold?: number;

  /** Distance metric to use */
  distanceMetric?: 'cosine' | 'dot' | 'euclidean';

  /** Optional field filters */
  fieldFilters?: Record<string, unknown>;

  /** Tenant ID for multi-tenant isolation */
  tenantId?: string;

  /** Principal ID for permission checks */
  principalId?: string;
}

/**
 * Keyword search request (full-text search)
 */
export interface KeywordSearchRequest {
  /** Query text to search */
  query: string;

  /** Entity type to search within */
  entityType: string;

  /** Maximum number of results */
  topK: number;

  /** Minimum score threshold (0.0-1.0) */
  threshold?: number;

  /** Fields to search (if not specified, search all) */
  searchFields?: string[];

  /** Optional field filters */
  fieldFilters?: Record<string, unknown>;

  /** Tenant ID for multi-tenant isolation */
  tenantId?: string;

  /** Principal ID for permission checks */
  principalId?: string;
}

/**
 * Search candidate (unified result from dense or keyword search)
 */
export interface SearchCandidate {
  /** Unique vector ID */
  vectorId: string;

  /** Entity type */
  entityType: string;

  /** Entity ID */
  entityId: string;

  /** Field name */
  field: string;

  /** Original text content */
  text: string;

  /** Raw similarity/relevance score (0.0-1.0) */
  score: number;

  /** How the score was calculated (dense, keyword, hybrid) */
  scoreSource: 'dense' | 'keyword' | 'hybrid';

  /** Field weight applied */
  fieldWeight: number;

  /** Actual score after weighting */
  weightedScore: number;

  /** Metadata */
  metadata?: Record<string, unknown>;

  /** Timestamp indexed */
  indexedAt?: Date;
}

/**
 * Deletion request
 */
export interface DeleteRequest {
  /** Delete by vector ID */
  vectorId?: string;

  /** Delete by entity (type + ID) */
  entityType?: string;
  entityId?: string;

  /** Delete by field */
  field?: string;

  /** Delete all for tenant */
  tenantId?: string;

  /** Cascade delete related vectors */
  cascade?: boolean;
}

/**
 * Deletion result
 */
export interface DeleteResult {
  /** Number of vectors deleted */
  deletedCount: number;

  /** Whether deletion succeeded */
  success: boolean;

  /** Error message if failed */
  error?: string;
}

/**
 * Health check result
 */
export interface HealthStatus {
  /** Database is healthy and responding */
  healthy: boolean;

  /** Current status message */
  status: 'healthy' | 'degraded' | 'unhealthy';

  /** Latency in milliseconds */
  latencyMs: number;

  /** Approximate vector count */
  vectorCount?: number;

  /** Storage size in bytes */
  storageSize?: number;

  /** Additional details */
  details?: Record<string, unknown>;
}

/**
 * Statistics about the adapter
 */
export interface AdapterStats {
  /** Approximate total vectors */
  totalVectors: number;

  /** Approximate storage used */
  storageUsed: number;

  /** Number of indexes */
  indexCount: number;

  /** Average search latency in milliseconds */
  avgSearchLatencyMs: number;

  /** Queries per second */
  queriesPerSecond: number;

  /** Storage details by entity type */
  byEntityType?: Record<string, {
    vectorCount: number;
    storageUsed: number;
  }>;
}

/**
 * Batch indexing request
 */
export interface BatchIndexRequest {
  /** Multiple indexing requests */
  vectors: IndexRequest[];

  /** Whether to continue on individual failures */
  continueOnError?: boolean;
}

/**
 * Batch indexing result
 */
export interface BatchIndexResult {
  /** Overall success status */
  success: boolean;

  /** Total indexed */
  indexedCount: number;

  /** Total failed */
  failedCount: number;

  /** Results for each vector */
  results: IndexResult[];

  /** Error message if batch failed */
  error?: string;
}

/**
 * SearchAdapter Interface
 *
 * Unified abstraction for vector search across storage backends.
 * Implementations: PostgreSQL+pgvector, Qdrant, Weaviate, Milvus, OpenSearch, etc.
 *
 * Design principles:
 * - Consistent API across all backends
 * - Dense + keyword search support
 * - Field-level ranking via weights
 * - Multi-tenant ready
 * - Observable (latency, counts, etc.)
 */
export interface SearchAdapter {
  /**
   * Initialize the adapter (create schema, tables, indexes)
   */
  initialize(): Promise<void>;

  /**
   * Index a single vector
   */
  index(request: IndexRequest): Promise<IndexResult>;

  /**
   * Index multiple vectors
   */
  indexBatch(request: BatchIndexRequest): Promise<BatchIndexResult>;

  /**
   * Dense search (semantic search with vector similarity)
   */
  denseSearch(request: DenseSearchRequest): Promise<SearchCandidate[]>;

  /**
   * Keyword search (full-text search)
   */
  keywordSearch(request: KeywordSearchRequest): Promise<SearchCandidate[]>;

  /**
   * Delete vectors
   */
  delete(request: DeleteRequest): Promise<DeleteResult>;

  /**
   * Check adapter health
   */
  health(): Promise<HealthStatus>;

  /**
   * Get adapter statistics
   */
  getStats(): Promise<AdapterStats>;

  /**
   * Close connections and cleanup
   */
  close(): Promise<void>;

  /**
   * Backend type identifier
   */
  getBackendType(): 'postgresql' | 'qdrant' | 'weaviate' | 'milvus' | 'opensearch';

  /**
   * Backend version
   */
  getVersion(): string;
}

/**
 * SearchAdapterFactory
 *
 * Creates adapter instances based on type
 */
export interface SearchAdapterFactory {
  /**
   * Create a SearchAdapter by type
   */
  create(type: string, config: Record<string, unknown>): Promise<SearchAdapter>;

  /**
   * Get available adapter types
   */
  getAvailableTypes(): string[];
}
