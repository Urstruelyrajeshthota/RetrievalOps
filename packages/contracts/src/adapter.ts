/**
 * Search Adapter Contract
 *
 * All adapters must implement this interface to be compatible with RetrievalOps.
 * This ensures consistent behavior across different storage backends.
 */

import { SearchCandidate, AdapterCapabilities, AdapterHealth } from './index';

export interface IndexRequest {
  entityType: string;
  entityId: string;
  field: string;
  text: string;
  vector: number[];
  metadata?: Record<string, unknown>;
  contentHash: string;
  embeddingModel: string;
  embeddingVersion: string;
  distanceMetric: 'cosine' | 'dot' | 'euclidean';
  sourceUpdatedAt: Date;
}

export interface IndexResult {
  success: boolean;
  indexed: boolean;
  error?: string;
  message?: string;
}

export interface DenseSearchRequest {
  entityType: string;
  vector: number[];
  topK: number;
  filter?: Record<string, unknown>;
  distanceMetric?: 'cosine' | 'dot' | 'euclidean';
}

export interface KeywordSearchRequest {
  entityType: string;
  query: string;
  topK: number;
  filter?: Record<string, unknown>;
  fields?: string[];
}

export interface ExactMatchRequest {
  entityType: string;
  field: string;
  value: string | number | boolean;
}

export interface DeleteRequest {
  entityType: string;
  entityId: string;
  field?: string;
}

export interface BatchIndexRequest {
  requests: IndexRequest[];
}

export interface BatchDeleteRequest {
  requests: DeleteRequest[];
}

/**
 * Core adapter interface that all storage backends must implement.
 *
 * Adapters are responsible for:
 * - Managing vector storage and retrieval
 * - Providing keyword search capabilities
 * - Executing exact-match queries
 * - Handling filters and access control
 * - Reporting health and capabilities
 */
export interface SearchAdapter {
  /**
   * Report the capabilities of this adapter.
   *
   * Helps RetrievalOps decide which retrieval strategies are available.
   */
  capabilities(): AdapterCapabilities;

  /**
   * Index a single document with embeddings.
   *
   * Must store complete provenance: model, version, metric, timestamp.
   * Should use SHA-256 content hash to deduplicate identical embeddings.
   */
  index(request: IndexRequest): Promise<IndexResult>;

  /**
   * Index multiple documents in a single request.
   *
   * Adapters should optimize for batch operations where possible.
   * If not supported, default implementation falls back to individual index() calls.
   */
  batchIndex?(request: BatchIndexRequest): Promise<IndexResult[]>;

  /**
   * Dense vector search (semantic).
   *
   * Returns top-K candidates sorted by similarity score.
   * Scores must be in range [0, 1] for cosine similarity.
   */
  denseSearch(request: DenseSearchRequest): Promise<SearchCandidate[]>;

  /**
   * Keyword/full-text search.
   *
   * Optional capability. Implementations should provide BM25 or TF-IDF scoring.
   * Scores normalized to [0, 1] for consistency with dense search.
   */
  keywordSearch?(request: KeywordSearchRequest): Promise<SearchCandidate[]>;

  /**
   * Exact match search.
   *
   * Optional capability. For filtering on exact field values.
   * Used for categorical and ID-based filtering.
   */
  exactMatch?(request: ExactMatchRequest): Promise<SearchCandidate[]>;

  /**
   * Delete a document or specific field vectors.
   *
   * Must be idempotent. Deleting non-existent documents should not error.
   */
  delete(request: DeleteRequest): Promise<void>;

  /**
   * Batch delete multiple documents.
   *
   * Optional capability. Adapters should optimize for batch operations.
   */
  batchDelete?(request: BatchDeleteRequest): Promise<void>;

  /**
   * Report the health of the adapter and underlying storage.
   *
   * RetrievalOps uses this to detect connectivity issues and degraded storage.
   */
  health(): Promise<AdapterHealth>;

  /**
   * Reset the adapter state for testing.
   *
   * Optional. Used in tests to clean up between runs.
   */
  reset?(): Promise<void>;
}

/**
 * Adapter test contract.
 *
 * All adapters should pass a comprehensive test suite covering:
 * - Basic CRUD operations
 * - Batch operations
 * - Dense and keyword search
 * - Filtering and access control
 * - Health checking
 * - Error handling
 * - Concurrent operations
 * - Security isolation
 */
export interface AdapterTestContract {
  describe: (name: string, fn: () => void) => void;
  it: (name: string, fn: () => Promise<void>) => void;
  before: (fn: () => Promise<void>) => void;
  after: (fn: () => Promise<void>) => void;
  beforeEach: (fn: () => Promise<void>) => void;
  afterEach: (fn: () => Promise<void>) => void;
}

export interface AdapterTestFixture {
  adapter: SearchAdapter;
  cleanup: () => Promise<void>;
}
