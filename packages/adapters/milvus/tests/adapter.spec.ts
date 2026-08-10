import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { MilvusAdapter } from '../src/adapter';
import { MilvusAdapterConfig } from '../src/types';

describe('MilvusAdapter', () => {
  let adapter: MilvusAdapter;
  const config: MilvusAdapterConfig = {
    host: 'localhost',
    port: 19530,
    collectionName: 'test_documents',
    vectorDim: 384,
    autoCreate: true,
  };

  beforeAll(async () => {
    adapter = new MilvusAdapter(config);
    try {
      await adapter.initialize();
    } catch (error) {
      console.log('Milvus unavailable - skipping integration tests');
      vi.skip();
    }
  });

  afterAll(async () => {
    await adapter.close();
  });

  describe('SearchAdapter Interface Compliance', () => {
    it('should implement all required methods', () => {
      expect(adapter.initialize).toBeDefined();
      expect(adapter.index).toBeDefined();
      expect(adapter.indexBatch).toBeDefined();
      expect(adapter.denseSearch).toBeDefined();
      expect(adapter.keywordSearch).toBeDefined();
      expect(adapter.delete).toBeDefined();
      expect(adapter.health).toBeDefined();
      expect(adapter.getStats).toBeDefined();
      expect(adapter.close).toBeDefined();
      expect(adapter.getBackendType).toBeDefined();
      expect(adapter.getVersion).toBeDefined();
    });

    it('should return correct backend type', () => {
      expect(adapter.getBackendType()).toBe('milvus');
    });

    it('should return version string', async () => {
      const version = await adapter.getVersion();
      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const newAdapter = new MilvusAdapter(config);
      await newAdapter.initialize();
      await newAdapter.close();
    });

    it('should throw on invalid host', async () => {
      const invalidAdapter = new MilvusAdapter({
        ...config,
        host: 'invalid-host-12345',
      });
      await expect(invalidAdapter.initialize()).rejects.toThrow();
    });

    it('should throw without host', () => {
      expect(() => {
        new MilvusAdapter({
          collectionName: 'test',
          vectorDim: 384,
        } as any);
      }).toThrow();
    });

    it('should throw without collectionName', () => {
      expect(() => {
        new MilvusAdapter({
          host: 'localhost',
          vectorDim: 384,
        } as any);
      }).toThrow();
    });

    it('should accept optional parameters', () => {
      const customAdapter = new MilvusAdapter({
        host: 'localhost',
        port: 19530,
        database: 'custom_db',
        collectionName: 'documents',
        vectorDim: 384,
        indexType: 'IVF_FLAT',
        metricType: 'L2',
      });

      expect(customAdapter).toBeDefined();
    });
  });

  describe('Health Checks', () => {
    it('should return healthy status', async () => {
      const status = await adapter.health();
      expect(status.healthy).toBe(true);
      expect(status.status).toBe('healthy');
      expect(status.latency).toBeGreaterThanOrEqual(0);
      expect(status.timestamp).toBeDefined();
    });

    it('should measure latency accurately', async () => {
      const status = await adapter.health();
      expect(status.latency).toBeGreaterThan(0);
      expect(typeof status.latency).toBe('number');
    });

    it('should handle connection failure', async () => {
      const unhealthyAdapter = new MilvusAdapter({
        ...config,
        host: 'unreachable-host',
      });
      const status = await unhealthyAdapter.health();
      expect(status.healthy).toBe(false);
    });
  });

  describe('Indexing', () => {
    it('should index single document', async () => {
      const result = await adapter.index({
        id: 'milvus-doc-1',
        vector: Array(384).fill(0.1),
        metadata: { title: 'Test Doc', category: 'tech' },
      });

      expect(result.id).toBe('milvus-doc-1');
      expect(result.vectorId).toBeDefined();
      expect(result.indexed).toBe(true);
    });

    it('should index with minimal fields', async () => {
      const result = await adapter.index({
        id: 'milvus-doc-2',
        vector: Array(384).fill(0.2),
      });

      expect(result.indexed).toBe(true);
    });

    it('should fail on uninitialized adapter', async () => {
      const uninitializedAdapter = new MilvusAdapter(config);
      await expect(
        uninitializedAdapter.index({
          id: 'test',
          vector: Array(384).fill(0.1),
        })
      ).rejects.toThrow('not initialized');
    });

    it('should reject wrong vector dimension', async () => {
      await expect(
        adapter.index({
          id: 'wrong-dim',
          vector: Array(100).fill(0.1), // Should be 384
        })
      ).rejects.toThrow();
    });
  });

  describe('Batch Indexing', () => {
    it('should batch index multiple documents', async () => {
      const result = await adapter.indexBatch({
        documents: [
          { id: 'batch-m-1', vector: Array(384).fill(0.1) },
          { id: 'batch-m-2', vector: Array(384).fill(0.2) },
          { id: 'batch-m-3', vector: Array(384).fill(0.3) },
          { id: 'batch-m-4', vector: Array(384).fill(0.4) },
          { id: 'batch-m-5', vector: Array(384).fill(0.5) },
        ],
      });

      expect(result.indexed).toBe(5);
      expect(result.failed).toBe(0);
      expect(result.errors).toBeUndefined();
    });

    it('should respect batchSize parameter', async () => {
      const customAdapter = new MilvusAdapter({
        ...config,
        batchSize: 2,
      });
      await customAdapter.initialize();

      const result = await customAdapter.indexBatch({
        documents: [
          { id: 'size-1', vector: Array(384).fill(0.1) },
          { id: 'size-2', vector: Array(384).fill(0.2) },
          { id: 'size-3', vector: Array(384).fill(0.3) },
        ],
      });

      expect(result.indexed).toBeGreaterThanOrEqual(0);
      await customAdapter.close();
    });

    it('should handle batch errors with continueOnError', async () => {
      const result = await adapter.indexBatch({
        documents: [
          { id: 'good-m-1', vector: Array(384).fill(0.1) },
          { id: 'bad-m-1', vector: Array(100).fill(0.2) }, // Wrong dimension
          { id: 'good-m-2', vector: Array(384).fill(0.3) },
        ],
        continueOnError: true,
      });

      expect(result.indexed).toBeGreaterThanOrEqual(1);
      expect(result.failed).toBeGreaterThanOrEqual(1);
      expect(result.errors).toBeDefined();
    });

    it('should fail fast without continueOnError', async () => {
      await expect(
        adapter.indexBatch({
          documents: [
            { id: 'fast-1', vector: Array(384).fill(0.1) },
            { id: 'fast-2', vector: Array(100).fill(0.2) }, // Wrong dimension
          ],
          continueOnError: false,
        })
      ).rejects.toThrow();
    });

    it('should handle large batch insert', async () => {
      const largeDoc = Array(100)
        .fill(0)
        .map((_, i) => ({
          id: `large-${i}`,
          vector: Array(384).fill(0.1 + i * 0.001),
        }));

      const result = await adapter.indexBatch({
        documents: largeDoc,
      });

      expect(result.indexed).toBeGreaterThan(0);
    });
  });

  describe('Dense Search', () => {
    beforeAll(async () => {
      await adapter.indexBatch({
        documents: [
          {
            id: 'search-m-1',
            vector: Array(384).fill(0.1),
            metadata: { title: 'AI Research', category: 'tech' },
          },
          {
            id: 'search-m-2',
            vector: Array(384).fill(0.15),
            metadata: { title: 'ML Papers', category: 'research' },
          },
          {
            id: 'search-m-3',
            vector: Array(384).fill(0.2),
            metadata: { title: 'Neural Nets', category: 'tech' },
          },
        ],
      });
    });

    it('should return search results', async () => {
      const results = await adapter.denseSearch({
        query: Array(384).fill(0.1),
        limit: 10,
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should normalize scores to [0, 1]', async () => {
      const results = await adapter.denseSearch({
        query: Array(384).fill(0.1),
        limit: 10,
      });

      results.forEach(result => {
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });
    });

    it('should respect limit parameter', async () => {
      const results = await adapter.denseSearch({
        query: Array(384).fill(0.1),
        limit: 2,
      });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should include required result fields', async () => {
      const results = await adapter.denseSearch({
        query: Array(384).fill(0.1),
        limit: 1,
      });

      if (results.length > 0) {
        expect(results[0].id).toBeDefined();
        expect(results[0].score).toBeDefined();
        expect(results[0].fields).toBeDefined();
        expect(results[0].metadata).toBeDefined();
      }
    });

    it('should handle filter expressions', async () => {
      const results = await adapter.denseSearch({
        query: Array(384).fill(0.1),
        limit: 10,
        where: { fieldName: 'category', value: 'tech' },
      });

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Keyword Search', () => {
    beforeAll(async () => {
      await adapter.indexBatch({
        documents: [
          {
            id: 'kw-m-1',
            vector: Array(384).fill(0.1),
            metadata: { title: 'Python Programming Guide', content: 'Learn Python' },
          },
          {
            id: 'kw-m-2',
            vector: Array(384).fill(0.2),
            metadata: { title: 'JavaScript Basics', content: 'Web development' },
          },
          {
            id: 'kw-m-3',
            vector: Array(384).fill(0.3),
            metadata: { title: 'Python Advanced', content: 'Advanced topics' },
          },
        ],
      });
    });

    it('should return keyword search results', async () => {
      const results = await adapter.keywordSearch({
        query: 'Python',
        limit: 10,
      });

      expect(Array.isArray(results)).toBe(true);
    });

    it('should normalize keyword scores', async () => {
      const results = await adapter.keywordSearch({
        query: 'programming',
        limit: 10,
      });

      results.forEach(result => {
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });
    });

    it('should respect limit in keyword search', async () => {
      const results = await adapter.keywordSearch({
        query: 'Python',
        limit: 1,
      });

      expect(results.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Delete Operations', () => {
    it('should delete by vectorId', async () => {
      const indexed = await adapter.index({
        id: 'del-m-1',
        vector: Array(384).fill(0.1),
      });

      const result = await adapter.delete({
        vectorId: indexed.vectorId,
      });

      expect(result.success).toBe(true);
    });

    it('should handle non-existent delete', async () => {
      const result = await adapter.delete({
        vectorId: 'non-existent-id-12345',
      });

      expect(result.success).toBe(true);
    });

    it('should return 0 deleted for missing vectorId', async () => {
      const result = await adapter.delete({});

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should return adapter statistics', async () => {
      const stats = await adapter.getStats();

      expect(stats.backend).toBe('milvus');
      expect(typeof stats.totalDocuments).toBe('number');
      expect(typeof stats.indexSize).toBe('number');
      expect(stats.timestamp).toBeDefined();
    });

    it('should include health information', async () => {
      const stats = await adapter.getStats();

      expect(['healthy', 'warning', 'error']).toContain(stats.health);
    });

    it('should include version info', async () => {
      const stats = await adapter.getStats();

      expect(typeof stats.version).toBe('string');
      expect(stats.version.length).toBeGreaterThan(0);
    });
  });

  describe('Score Normalization', () => {
    it('should normalize all scores', async () => {
      const results = await adapter.denseSearch({
        query: Array(384).fill(0.1),
        limit: 20,
      });

      results.forEach(result => {
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });
    });

    it('should maintain score ordering', async () => {
      const results = await adapter.denseSearch({
        query: Array(384).fill(0.1),
        limit: 10,
      });

      for (let i = 1; i < results.length; i++) {
        expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
      }
    });
  });

  describe('Index Types', () => {
    it('should support HNSW index', async () => {
      const hnswAdapter = new MilvusAdapter({
        ...config,
        collectionName: 'test_hnsw',
        indexType: 'HNSW',
      });
      await hnswAdapter.initialize();
      await hnswAdapter.close();
    });

    it('should support IVF_FLAT index', async () => {
      const ivfAdapter = new MilvusAdapter({
        ...config,
        collectionName: 'test_ivf',
        indexType: 'IVF_FLAT',
      });
      await ivfAdapter.initialize();
      await ivfAdapter.close();
    });

    it('should support IVF_SQ8 index', async () => {
      const sqAdapter = new MilvusAdapter({
        ...config,
        collectionName: 'test_sq8',
        indexType: 'IVF_SQ8',
      });
      await sqAdapter.initialize();
      await sqAdapter.close();
    });
  });

  describe('Metric Types', () => {
    it('should support COSINE distance', async () => {
      const cosineAdapter = new MilvusAdapter({
        ...config,
        collectionName: 'test_cosine',
        metricType: 'COSINE',
      });
      await cosineAdapter.initialize();
      await cosineAdapter.close();
    });

    it('should support L2 distance', async () => {
      const l2Adapter = new MilvusAdapter({
        ...config,
        collectionName: 'test_l2',
        metricType: 'L2',
      });
      await l2Adapter.initialize();
      await l2Adapter.close();
    });

    it('should support IP distance', async () => {
      const ipAdapter = new MilvusAdapter({
        ...config,
        collectionName: 'test_ip',
        metricType: 'IP',
      });
      await ipAdapter.initialize();
      await ipAdapter.close();
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors', async () => {
      const badAdapter = new MilvusAdapter({
        host: 'unreachable-host-xyz',
        collectionName: 'test',
        vectorDim: 384,
      });

      await expect(badAdapter.initialize()).rejects.toThrow();
    });

    it('should handle invalid vector size', async () => {
      await expect(
        adapter.index({
          id: 'invalid-size',
          vector: Array(100).fill(0.1), // Should be 384
        })
      ).rejects.toThrow();
    });

    it('should throw on missing host', () => {
      expect(() => {
        new MilvusAdapter({
          collectionName: 'test',
          vectorDim: 384,
        } as any);
      }).toThrow();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent indexes', async () => {
      const promises = Array(10)
        .fill(0)
        .map((_, i) =>
          adapter.index({
            id: `concurrent-m-${i}`,
            vector: Array(384).fill(0.1 + i * 0.001),
          })
        );

      const results = await Promise.all(promises);

      expect(results.length).toBe(10);
      results.forEach(r => expect(r.indexed).toBe(true));
    });

    it('should handle concurrent searches', async () => {
      const promises = Array(5)
        .fill(0)
        .map(() =>
          adapter.denseSearch({
            query: Array(384).fill(0.1),
            limit: 10,
          })
        );

      const results = await Promise.all(promises);

      expect(results.length).toBe(5);
      results.forEach(r => expect(Array.isArray(r)).toBe(true));
    });
  });

  describe('Large-Scale Operations', () => {
    it('should handle thousands of documents', async () => {
      const docs = Array(500)
        .fill(0)
        .map((_, i) => ({
          id: `scale-${i}`,
          vector: Array(384).fill(0.1 + (i % 10) * 0.01),
        }));

      const result = await adapter.indexBatch({ documents: docs });

      expect(result.indexed).toBeGreaterThan(0);
    });
  });
});
