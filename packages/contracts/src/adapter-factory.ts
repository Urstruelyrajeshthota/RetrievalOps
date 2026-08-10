/**
 * SearchAdapter Factory
 *
 * Provides dynamic adapter creation and selection for multi-database support.
 * Enables runtime selection of backend without code changes.
 *
 * v0.2.0+: Foundation for multi-database flexibility
 */

import { SearchAdapter } from './search-adapter';

/**
 * Adapter factory configuration
 */
export interface AdapterFactoryConfig {
  /**
   * Registered adapter constructors by type
   */
  adapters: Map<string, AdapterConstructor>;
}

/**
 * Adapter constructor signature
 */
export type AdapterConstructor = (config: Record<string, any>) => Promise<SearchAdapter>;

/**
 * SearchAdapterFactory
 *
 * Factory for creating SearchAdapter instances.
 * Supports dynamic adapter registration and selection.
 *
 * Usage:
 * ```typescript
 * const factory = new SearchAdapterFactory();
 * factory.register('postgresql', async (config) => new PgVectorAdapter(config));
 * factory.register('qdrant', async (config) => new QdrantAdapter(config));
 *
 * const adapter = await factory.create('postgresql', pgConfig);
 * ```
 */
export class SearchAdapterFactory {
  private adapters: Map<string, AdapterConstructor> = new Map();

  /**
   * Register an adapter type
   */
  register(type: string, constructor: AdapterConstructor): void {
    this.adapters.set(type.toLowerCase(), constructor);
  }

  /**
   * Create an adapter instance
   */
  async create(type: string, config: Record<string, any>): Promise<SearchAdapter> {
    const constructor = this.adapters.get(type.toLowerCase());

    if (!constructor) {
      throw new Error(
        `Unknown adapter type: ${type}. Available: ${Array.from(this.adapters.keys()).join(', ')}`
      );
    }

    return await constructor(config);
  }

  /**
   * Get available adapter types
   */
  getAvailableTypes(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Check if adapter type is registered
   */
  hasAdapter(type: string): boolean {
    return this.adapters.has(type.toLowerCase());
  }

  /**
   * Create from environment variables
   * Automatically configures adapter from backend-specific env vars
   */
  async createFromEnv(typeVar = 'ADAPTER_TYPE'): Promise<SearchAdapter> {
    const type = getAdapterTypeFromEnv();
    const config = AdapterConfigs.fromEnv(type);
    return await this.create(type, config);
  }
}

/**
 * Default factory with built-in adapters
 * Supports 4 backends: PostgreSQL, Qdrant, Weaviate, Milvus
 */
export async function createDefaultFactory(): Promise<SearchAdapterFactory> {
  const factory = new SearchAdapterFactory();

  // Register PostgreSQL adapter (vertical scaling, ACID)
  factory.register('postgresql', async (config) => {
    const { PgVectorAdapter } = await import('@itsrajeshthota/retrievalops-pgvector');
    return new PgVectorAdapter(config);
  });

  // Register Qdrant adapter (horizontal scaling, native HNSW)
  factory.register('qdrant', async (config) => {
    const { QdrantAdapter } = await import('@itsrajeshthota/retrievalops-qdrant');
    return new QdrantAdapter(config);
  });

  // Register Weaviate adapter (GraphQL, hybrid search)
  factory.register('weaviate', async (config) => {
    const { WeaviateAdapter } = await import('@itsrajeshthota/retrievalops-weaviate');
    return new WeaviateAdapter(config);
  });

  // Register Milvus adapter (distributed, massive scale)
  factory.register('milvus', async (config) => {
    const { MilvusAdapter } = await import('@itsrajeshthota/retrievalops-milvus');
    return new MilvusAdapter(config);
  });

  return factory;
}

/**
 * Supported adapter types
 */
export type AdapterType = 'postgresql' | 'qdrant' | 'weaviate' | 'milvus';

/**
 * Environment-based adapter selection helper
 */
export function getAdapterTypeFromEnv(): AdapterType {
  const type = process.env.ADAPTER_TYPE?.toLowerCase() || 'postgresql';

  if (!['postgresql', 'qdrant', 'weaviate', 'milvus'].includes(type)) {
    throw new Error(
      `Invalid ADAPTER_TYPE: ${type}. Must be 'postgresql', 'qdrant', 'weaviate', or 'milvus'`
    );
  }

  return type as AdapterType;
}

/**
 * Configuration helpers for common setups
 */
export const AdapterConfigs = {
  /**
   * PostgreSQL configuration from environment
   */
  postgresFromEnv(): Record<string, any> {
    return {
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost/retrievalops',
      schema: process.env.DB_SCHEMA || 'retrieval_ops',
      tableName: process.env.DB_TABLE || 'vectors',
      autoCreateSchema: process.env.AUTO_CREATE_SCHEMA !== 'false',
    };
  },

  /**
   * Qdrant configuration from environment
   */
  qdrantFromEnv(): Record<string, any> {
    return {
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      collectionName: process.env.QDRANT_COLLECTION || 'vectors',
      apiKey: process.env.QDRANT_API_KEY,
      vectorSize: parseInt(process.env.VECTOR_SIZE || '384'),
      autoCreateCollection: process.env.AUTO_CREATE_COLLECTION !== 'false',
    };
  },

  /**
   * Weaviate configuration from environment
   */
  weaviateFromEnv(): Record<string, any> {
    return {
      url: process.env.WEAVIATE_URL || 'http://localhost:8080',
      className: process.env.WEAVIATE_CLASS || 'Document',
      apiKey: process.env.WEAVIATE_API_KEY,
      vectorDim: parseInt(process.env.VECTOR_SIZE || '384'),
      autoCreate: process.env.AUTO_CREATE !== 'false',
    };
  },

  /**
   * Milvus configuration from environment
   */
  milvusFromEnv(): Record<string, any> {
    return {
      host: process.env.MILVUS_HOST || 'localhost',
      port: parseInt(process.env.MILVUS_PORT || '19530'),
      database: process.env.MILVUS_DATABASE || 'default',
      collectionName: process.env.MILVUS_COLLECTION || 'documents',
      vectorDim: parseInt(process.env.VECTOR_SIZE || '384'),
      indexType: process.env.MILVUS_INDEX_TYPE || 'HNSW',
      metricType: process.env.MILVUS_METRIC || 'COSINE',
      autoCreate: process.env.AUTO_CREATE !== 'false',
    };
  },

  /**
   * Get appropriate config based on adapter type
   */
  fromEnv(adapterType: AdapterType): Record<string, any> {
    switch (adapterType) {
      case 'postgresql':
        return this.postgresFromEnv();
      case 'qdrant':
        return this.qdrantFromEnv();
      case 'weaviate':
        return this.weaviateFromEnv();
      case 'milvus':
        return this.milvusFromEnv();
      default:
        throw new Error(`Unknown adapter type: ${adapterType}`);
    }
  },
};
