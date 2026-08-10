/**
 * PgVector Adapter Type Definitions
 */

export interface PgVectorAdapterConfig {
  /**
   * PostgreSQL connection string.
   * Example: "postgresql://user:password@localhost:5432/db"
   */
  connectionString: string;

  /**
   * Schema name (default: "retrieval_ops").
   */
  schema?: string;

  /**
   * Vector table name (default: "vectors").
   */
  tableName?: string;

  /**
   * Maximum vector dimension support (default: 3000).
   * pgvector supports up to 16,000 dimensions.
   */
  maxDimensions?: number;

  /**
   * Connection pool settings.
   */
  pool?: {
    /**
     * Minimum pool size (default: 2).
     */
    min?: number;

    /**
     * Maximum pool size (default: 10).
     */
    max?: number;

    /**
     * Idle timeout in milliseconds (default: 30000).
     */
    idleTimeoutMillis?: number;
  };

  /**
   * Create schema and tables on init (default: true).
   */
  autoCreateSchema?: boolean;

  /**
   * Indexing strategy: 'ivfflat' (v0.1.0) or 'hnsw' (v0.2.0+, default).
   * HNSW provides better performance (4-10x faster) with slightly larger index size.
   * Default: 'hnsw' for v0.2.0+
   */
  indexingStrategy?: 'ivfflat' | 'hnsw';

  /**
   * HNSW configuration (only used if indexingStrategy is 'hnsw').
   * See https://github.com/pgvector/pgvector#indexing for details.
   */
  hnsw?: {
    /**
     * Maximum number of connections per node (default: 16).
     * Typical range: 8-64. Higher values improve recall but increase memory.
     */
    m?: number;

    /**
     * Size of dynamic candidate list (default: 200).
     * Typical range: 128-2048. Higher values improve recall but slow insertion.
     */
    efConstruction?: number;

    /**
     * Size of dynamic candidate list for search (default: 100).
     * Typical range: 50-200. Higher values improve recall but slow search.
     */
    ef?: number;
  };
}

export interface VectorRecord {
  id: string;
  entity_type: string;
  entity_id: string;
  field: string;
  text: string;
  vector: number[];
  content_hash: string;
  embedding_model: string;
  embedding_version: string;
  distance_metric: 'cosine' | 'dot' | 'euclidean';
  dimensions: number;
  created_at: Date;
  updated_at: Date;
  metadata?: Record<string, unknown>;
}

export interface SearchOptions {
  /**
   * Maximum number of results to return.
   */
  topK: number;

  /**
   * Field-specific filters (optional).
   */
  filters?: Record<string, unknown>;

  /**
   * Entity type to filter by.
   */
  entityType: string;

  /**
   * Distance metric for similarity (default: cosine).
   */
  distanceMetric?: 'cosine' | 'dot' | 'euclidean';
}
