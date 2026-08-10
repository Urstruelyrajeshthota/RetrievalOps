import { HNSWConfig } from '@itsrajeshthota/retrievalops-contracts';

export interface WeaviateAdapterConfig {
  /**
   * Weaviate instance URL
   * @example "http://localhost:8080"
   * @example "https://my-cluster.weaviate.network"
   */
  url: string;

  /**
   * API key for cloud instances or authentication
   * @optional
   */
  apiKey?: string;

  /**
   * Weaviate class name to store vectors
   * @example "Document", "BlogPost"
   */
  className: string;

  /**
   * Property name for vector embeddings
   * @default "vector"
   */
  vectorProperty?: string;

  /**
   * Vector distance metric
   * @default "cosine"
   */
  distanceMetric?: 'cosine' | 'euclidean' | 'manhattan';

  /**
   * HNSW index configuration
   * @default { m: 16, efConstruction: 200 }
   */
  hnsw?: HNSWConfig;

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  requestTimeout?: number;

  /**
   * Auto-create class if it doesn't exist
   * @default true
   */
  autoCreate?: boolean;

  /**
   * Vector dimension (required if autoCreate=true)
   * @example 384 for all-MiniLM-L6-v2
   * @example 1536 for OpenAI embeddings
   */
  vectorDim?: number;

  /**
   * Tenant name for multi-tenancy
   * @optional
   */
  tenant?: string;
}

/**
 * Weaviate GraphQL response structure
 */
export interface WeaviateObject {
  id: string;
  properties: Record<string, any>;
  vector?: number[];
  creationTimeUnix?: number;
  lastUpdateTimeUnix?: number;
  tenant?: string;
}

/**
 * Weaviate search result format
 */
export interface WeaviateSearchResult {
  objects?: WeaviateObject[];
  totalResults?: number;
  errors?: Array<{ message: string }>;
}

/**
 * Weaviate GraphQL response wrapper
 */
export interface WeaviateGraphQLResponse {
  data?: {
    Get?: Record<string, WeaviateObject[]>;
    Aggregate?: Record<string, Array<{ count: number }>>;
  };
  errors?: Array<{ message: string }>;
}

/**
 * Weaviate class schema
 */
export interface WeaviateClassSchema {
  class: string;
  description?: string;
  vectorizer?: string;
  vectorIndexConfig?: {
    name: string;
    hnsw?: {
      ef: number;
      efConstruction: number;
      m: number;
    };
  };
  properties: Array<{
    name: string;
    dataType: string[];
    description?: string;
    indexInverted?: boolean;
  }>;
}

/**
 * Weaviate health/meta response
 */
export interface WeaviateMeta {
  version: string;
  modules?: Record<string, any>;
}

/**
 * Hybrid search configuration
 */
export interface HybridSearchConfig {
  query: string;
  vector?: number[];
  alpha?: number; // 0=keyword only, 1=vector only, 0.5=balanced
  limit?: number;
  where?: Record<string, any>;
}

/**
 * Error details for batch operations
 */
export interface WeaviateBatchError {
  index: number;
  error: string;
  message?: string;
}
