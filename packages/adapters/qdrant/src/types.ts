/**
 * Qdrant Adapter Type Definitions
 *
 * Configuration and type interfaces for Qdrant vector database.
 */

/**
 * Qdrant Adapter Configuration
 */
export interface QdrantAdapterConfig {
  /**
   * Qdrant server URL
   * Example: "http://localhost:6333" or "https://api.qdrant.io"
   */
  url: string;

  /**
   * Collection name in Qdrant
   * Default: "vectors"
   */
  collectionName?: string;

  /**
   * API key for Qdrant Cloud (optional)
   */
  apiKey?: string;

  /**
   * Vector size (default: 384)
   * Must match your embedding model output dimension
   */
  vectorSize?: number;

  /**
   * Distance metric
   * "Cosine" (default), "Euclid", "Dot"
   */
  distanceMetric?: 'Cosine' | 'Euclid' | 'Dot';

  /**
   * HNSW indexing parameters
   */
  hnsw?: {
    /**
     * m parameter for HNSW (default: 16)
     */
    m?: number;

    /**
     * ef_construct for HNSW (default: 200)
     */
    efConstruct?: number;
  };

  /**
   * Timeout for API requests in milliseconds (default: 30000)
   */
  requestTimeout?: number;

  /**
   * Batch size for bulk operations (default: 100)
   */
  batchSize?: number;

  /**
   * Whether to automatically create collection on init (default: true)
   */
  autoCreateCollection?: boolean;
}

/**
 * Vector point in Qdrant
 */
export interface QdrantPoint {
  id: string;
  vector: number[];
  payload: {
    entityType: string;
    entityId: string;
    field: string;
    text: string;
    contentHash: string;
    embeddingModel: string;
    embeddingVersion: string;
    distanceMetric: string;
    dimensions: number;
    weight?: number;
    metadata?: Record<string, any>;
    createdAt?: string;
    updatedAt?: string;
  };
}

/**
 * Qdrant search filter
 */
export interface QdrantFilter {
  must?: Array<{
    key: string;
    match?: {
      value: string | number | boolean;
    };
  }>;
}

/**
 * Qdrant search result
 */
export interface QdrantSearchResult {
  id: string;
  score: number;
  payload?: Record<string, any>;
}
