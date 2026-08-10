import { HNSWConfig } from '@itsrajeshthota/retrievalops-contracts';

export interface MilvusAdapterConfig {
  /**
   * Milvus server hostname
   * @example "localhost"
   * @example "milvus.default.svc.cluster.local"
   */
  host: string;

  /**
   * Milvus gRPC port
   * @default 19530
   */
  port?: number;

  /**
   * Database name
   * @default "default"
   */
  database?: string;

  /**
   * Collection name
   * @example "documents", "blog_posts"
   */
  collectionName: string;

  /**
   * Vector field name
   * @default "vector"
   */
  vectorField?: string;

  /**
   * Metric type for distance calculation
   * @default "COSINE"
   */
  metricType?: 'L2' | 'IP' | 'COSINE';

  /**
   * Index type for vector search
   * @default "HNSW"
   * Options: IVF_FLAT, IVF_SQ8, HNSW, SCANN
   */
  indexType?: 'IVF_FLAT' | 'IVF_SQ8' | 'HNSW' | 'SCANN';

  /**
   * HNSW index parameters
   */
  hnsw?: {
    m?: number;              // Default: 8
    efConstruction?: number; // Default: 200
  };

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;

  /**
   * Auto-create collection if it doesn't exist
   * @default true
   */
  autoCreate?: boolean;

  /**
   * Vector dimension (required if autoCreate=true)
   * @example 384 for all-MiniLM-L6-v2
   */
  vectorDim?: number;

  /**
   * Username for authentication
   * @optional
   */
  username?: string;

  /**
   * Password for authentication
   * @optional
   */
  password?: string;

  /**
   * Use TLS for connection
   * @default false
   */
  secure?: boolean;

  /**
   * Partition key for partitioning strategy
   * @optional
   */
  partitionKey?: string;

  /**
   * Batch insert size
   * @default 1000
   */
  batchSize?: number;
}

/**
 * Milvus entity/document structure
 */
export interface MilvusEntity {
  id: string | number;
  vector: number[];
  metadata?: Record<string, any>;
  [key: string]: any;
}

/**
 * Milvus search result
 */
export interface MilvusSearchResult {
  id: string | number;
  score: number;
  metadata?: Record<string, any>;
}

/**
 * Milvus collection schema
 */
export interface MilvusCollectionSchema {
  name: string;
  description?: string;
  autoId?: boolean;
  fields: Array<{
    name: string;
    type:
      | 'INT8'
      | 'INT16'
      | 'INT32'
      | 'INT64'
      | 'FLOAT'
      | 'DOUBLE'
      | 'STRING'
      | 'VARCHAR'
      | 'BOOL'
      | 'FLOAT_VECTOR'
      | 'BFLOAT16_VECTOR'
      | 'BINARY_VECTOR';
    isPartitionKey?: boolean;
    isPrimary?: boolean;
    dim?: number; // For vector fields
    params?: Record<string, any>;
  }>;
}

/**
 * Milvus index configuration
 */
export interface MilvusIndexConfig {
  fieldName: string;
  indexName: string;
  indexType: string;
  metricType: string;
  params?: Record<string, any>;
}

/**
 * Milvus collection info
 */
export interface MilvusCollectionInfo {
  name: string;
  numEntities: number;
  numPartitions: number;
  loaded: boolean;
  inMemoryPercentage: number;
}

/**
 * Milvus server info
 */
export interface MilvusServerInfo {
  version: string;
  buildTags: string[];
  buildTime: string;
}

/**
 * Milvus delete expression
 */
export interface MilvusDeleteExpression {
  collectionName: string;
  partitionName?: string;
  expr: string; // e.g., "id in [1, 2, 3]", "metadata['tag'] == 'delete'"
}

/**
 * Milvus search expression
 */
export interface MilvusSearchExpression {
  vector: number[];
  metricType: string;
  topk?: number;
  expr?: string; // Optional filter expression
  outputFields?: string[];
  params?: {
    ef?: number; // For HNSW
    nprobe?: number; // For IVF
  };
}
