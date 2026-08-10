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
   */
  async createFromEnv(typeVar = 'ADAPTER_TYPE', configVar = 'ADAPTER_CONFIG'): Promise<SearchAdapter> {
    const type = process.env[typeVar];
    const configStr = process.env[configVar];

    if (!type) {
      throw new Error(`Environment variable ${typeVar} not set`);
    }

    if (!configStr) {
      throw new Error(`Environment variable ${configVar} not set`);
    }

    const config = JSON.parse(configStr);
    return await this.create(type, config);
  }
}

/**
 * Default factory with built-in adapters
 */
export async function createDefaultFactory(): Promise<SearchAdapterFactory> {
  const factory = new SearchAdapterFactory();

  // Register PostgreSQL adapter
  factory.register('postgresql', async (config) => {
    const { PgVectorAdapter } = await import('@itsrajeshthota/retrievalops-pgvector');
    return new PgVectorAdapter(config);
  });

  // Register Qdrant adapter
  factory.register('qdrant', async (config) => {
    const { QdrantAdapter } = await import('@itsrajeshthota/retrievalops-qdrant');
    return new QdrantAdapter(config);
  });

  return factory;
}

/**
 * Environment-based adapter selection helper
 */
export function getAdapterTypeFromEnv(): 'postgresql' | 'qdrant' {
  const type = process.env.ADAPTER_TYPE?.toLowerCase() || 'postgresql';

  if (type !== 'postgresql' && type !== 'qdrant') {
    throw new Error(`Invalid ADAPTER_TYPE: ${type}. Must be 'postgresql' or 'qdrant'`);
  }

  return type as 'postgresql' | 'qdrant';
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
   * Get appropriate config based on adapter type
   */
  fromEnv(adapterType: 'postgresql' | 'qdrant'): Record<string, any> {
    switch (adapterType) {
      case 'postgresql':
        return this.postgresFromEnv();
      case 'qdrant':
        return this.qdrantFromEnv();
      default:
        throw new Error(`Unknown adapter type: ${adapterType}`);
    }
  },
};
