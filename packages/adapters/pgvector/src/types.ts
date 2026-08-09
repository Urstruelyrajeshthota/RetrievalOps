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
