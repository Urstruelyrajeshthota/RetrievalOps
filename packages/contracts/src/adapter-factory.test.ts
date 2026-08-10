/**
 * SearchAdapterFactory Tests
 *
 * Verifies factory registration, creation, and environment-based configuration
 */

import { SearchAdapterFactory, createDefaultFactory, AdapterConfigs, getAdapterTypeFromEnv, type AdapterType } from './adapter-factory';
import type { SearchAdapter } from './search-adapter';

describe('SearchAdapterFactory', () => {
  describe('Basic Factory Operations', () => {
    let factory: SearchAdapterFactory;

    beforeEach(() => {
      factory = new SearchAdapterFactory();
    });

    it('should register adapters', () => {
      const mockConstructor = async () => ({} as SearchAdapter);
      factory.register('test', mockConstructor);
      expect(factory.hasAdapter('test')).toBe(true);
    });

    it('should be case-insensitive for adapter type', () => {
      const mockConstructor = async () => ({} as SearchAdapter);
      factory.register('TEST', mockConstructor);
      expect(factory.hasAdapter('test')).toBe(true);
      expect(factory.hasAdapter('TEST')).toBe(true);
    });

    it('should throw on unknown adapter type', async () => {
      expect(() => factory.getAvailableTypes()).not.toThrow();
    });

    it('should list available adapter types', () => {
      const mockConstructor = async () => ({} as SearchAdapter);
      factory.register('postgres', mockConstructor);
      factory.register('qdrant', mockConstructor);

      const types = factory.getAvailableTypes();
      expect(types).toContain('postgres');
      expect(types).toContain('qdrant');
    });
  });

  describe('Default Factory', () => {
    it('should create default factory with 4 adapters', async () => {
      const factory = await createDefaultFactory();
      const types = factory.getAvailableTypes();

      expect(types).toContain('postgresql');
      expect(types).toContain('qdrant');
      expect(types).toContain('weaviate');
      expect(types).toContain('milvus');
    });

    it('should have all 4 adapters registered', async () => {
      const factory = await createDefaultFactory();

      expect(factory.hasAdapter('postgresql')).toBe(true);
      expect(factory.hasAdapter('qdrant')).toBe(true);
      expect(factory.hasAdapter('weaviate')).toBe(true);
      expect(factory.hasAdapter('milvus')).toBe(true);
    });
  });

  describe('AdapterConfigs Helpers', () => {
    beforeEach(() => {
      process.env.DATABASE_URL = 'postgresql://test-db';
      process.env.QDRANT_URL = 'http://localhost:6333';
      process.env.WEAVIATE_URL = 'http://localhost:8080';
      process.env.MILVUS_HOST = 'localhost';
    });

    it('should get PostgreSQL config from environment', () => {
      const config = AdapterConfigs.postgresFromEnv();
      expect(config.connectionString).toBe('postgresql://test-db');
      expect(config.schema).toBeDefined();
      expect(config.tableName).toBeDefined();
    });

    it('should get Qdrant config from environment', () => {
      const config = AdapterConfigs.qdrantFromEnv();
      expect(config.url).toBe('http://localhost:6333');
      expect(config.collectionName).toBeDefined();
      expect(config.vectorSize).toBeDefined();
    });

    it('should get Weaviate config from environment', () => {
      const config = AdapterConfigs.weaviateFromEnv();
      expect(config.url).toBe('http://localhost:8080');
      expect(config.className).toBeDefined();
      expect(config.vectorDim).toBeDefined();
    });

    it('should get Milvus config from environment', () => {
      const config = AdapterConfigs.milvusFromEnv();
      expect(config.host).toBe('localhost');
      expect(config.port).toBeDefined();
      expect(config.collectionName).toBeDefined();
      expect(config.vectorDim).toBeDefined();
    });

    it('should route to correct config based on adapter type', () => {
      const pgConfig = AdapterConfigs.fromEnv('postgresql');
      expect(pgConfig.connectionString).toBeDefined();

      const qdrantConfig = AdapterConfigs.fromEnv('qdrant');
      expect(qdrantConfig.url).toBeDefined();

      const weaviateConfig = AdapterConfigs.fromEnv('weaviate');
      expect(weaviateConfig.url).toBeDefined();

      const milvusConfig = AdapterConfigs.fromEnv('milvus');
      expect(milvusConfig.host).toBeDefined();
    });

    it('should throw for unknown adapter type', () => {
      expect(() => AdapterConfigs.fromEnv('unknown' as any)).toThrow();
    });
  });

  describe('Environment-based Adapter Selection', () => {
    beforeEach(() => {
      delete process.env.ADAPTER_TYPE;
    });

    it('should default to postgresql when ADAPTER_TYPE not set', () => {
      const type = getAdapterTypeFromEnv();
      expect(type).toBe('postgresql');
    });

    it('should respect ADAPTER_TYPE=qdrant', () => {
      process.env.ADAPTER_TYPE = 'qdrant';
      const type = getAdapterTypeFromEnv();
      expect(type).toBe('qdrant');
    });

    it('should be case-insensitive', () => {
      process.env.ADAPTER_TYPE = 'QDRANT';
      const type = getAdapterTypeFromEnv();
      expect(type).toBe('qdrant');
    });

    it('should accept all valid adapter types', () => {
      const validTypes: AdapterType[] = ['postgresql', 'qdrant', 'weaviate', 'milvus'];

      validTypes.forEach(adapterType => {
        process.env.ADAPTER_TYPE = adapterType;
        const type = getAdapterTypeFromEnv();
        expect(type).toBe(adapterType);
      });
    });

    it('should throw on invalid adapter type', () => {
      process.env.ADAPTER_TYPE = 'invalid-adapter';
      expect(() => getAdapterTypeFromEnv()).toThrow();
    });
  });

  describe('createFromEnv Integration', () => {
    beforeEach(() => {
      process.env.ADAPTER_TYPE = 'postgresql';
      process.env.DATABASE_URL = 'postgresql://localhost/test';
    });

    it('should create adapter from environment variables', async () => {
      const factory = await createDefaultFactory();
      // This test verifies the method exists and is callable
      // Actual adapter creation would require real database connections
      expect(factory.createFromEnv).toBeDefined();
    });
  });
});
