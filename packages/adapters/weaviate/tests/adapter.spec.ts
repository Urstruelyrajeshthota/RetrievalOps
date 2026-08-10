import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { WeaviateAdapter } from '../src/adapter';
import { WeaviateAdapterConfig } from '../src/types';

describe('WeaviateAdapter', () => {
  let adapter: WeaviateAdapter;
  const config: WeaviateAdapterConfig = {
    url: 'http://localhost:8080',
    className: 'TestDocument',
    vectorDim: 384,
    autoCreate: true,
  };

  beforeAll(async () => {
    adapter = new WeaviateAdapter(config);
    // Skip tests if Weaviate unavailable
    try {
      await adapter.initialize();
    } catch (error) {
      console.log('Weaviate unavailable - skipping integration tests');
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
      expect(adapter.getBackendType()).toBe('weaviate');
    });

    it('should return version string', async () => {
      const version = await adapter.getVersion();
      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const newAdapter = new WeaviateAdapter(config);
      await newAdapter.initialize();
      await newAdapter.close();
    });

    it('should throw on invalid URL', async () => {
      const invalidAdapter = new WeaviateAdapter({
        ...config,
        url: 'http://invalid-host-12345:9999',
      });
      await expect(invalidAdapter.initialize()).rejects.toThrow();
    });

    it('should throw without url', () => {
      expect(() => {
        new WeaviateAdapter({
          className: 'Test',
          vectorDim: 384,
        } as any);
      }).toThrow();
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

    it('should measure latency', async () => {
      const status = await adapter.health();
      expect(status.latency).toBeGreaterThan(0);
      expect(typeof status.latency).toBe('number');
    });

    it('should handle unhealthy state', async () => {
      const unhealthyAdapter = new WeaviateAdapter({
        ...config,
        url: 'http://unreachable-host:8080',
      });
      const status = await unhealthyAdapter.health();
      expect(status.healthy).toBe(false);
    });
  });

  describe('Indexing', () => {
    it('should index single document', async () => {
      const result = await adapter.index({
        id: 'doc-1',
        vector: Array(384).fill(0.1),
        metadata: { title: 'Test Document', content: 'Hello world' },
      });

      expect(result.id).toBe('doc-1');
      expect(result.vectorId).toBeDefined();
      expect(result.indexed).toBe(true);
    });

    it('should index with required fields only', async () => {
      const result = await adapter.index({
        id: 'doc-2',
        vector: Array(384).fill(0.2),
      });

      expect(result.indexed).toBe(true);
    });

    it('should throw on initialization failure', async () => {
      const uninitializedAdapter = new WeaviateAdapter(config);
      await expect(
        uninitializedAdapter.index({
          id: 'doc-3',
          vector: Array(384).fill(0.3),
        })
      ).rejects.toThrow('not initialized');
    });
  });

  describe('Batch Indexing', () => {
    it('should batch index documents', async () => {
      const result = await adapter.indexBatch({
        documents: [
          {
            id: 'batch-1',
            vector: Array(384).fill(0.1),
            metadata: { title: 'Doc 1' },
          },
          {
            id: 'batch-2',
            vector: Array(384).fill(0.2),
            metadata: { title: 'Doc 2' },
          },
          {
            id: 'batch-3',
            vector: Array(384).fill(0.3),
            metadata: { title: 'Doc 3' },
          },
        ],
      });

      expect(result.indexed).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toBeUndefined();
    });

    it('should handle batch with errors', async () => {
      const result = await adapter.indexBatch({
        documents: [
          { id: 'good-1', vector: Array(384).fill(0.1) },
          { id: 'bad-1', vector: Array(100).fill(0.2) }, // Wrong dimension
          { id: 'good-2', vector: Array(384).fill(0.3) },
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
            { id: 'doc-a', vector: Array(384).fill(0.1) },
            { id: 'doc-b', vector: Array(100).fill(0.2) }, // Wrong dimension
          ],
          continueOnError: false,
        })
      ).rejects.toThrow();
    });
  });

  describe('Dense Search', () => {
    beforeAll(async () => {
      // Index test documents
      await adapter.indexBatch({
        documents: [
          {
            id: 'search-1',
            vector: Array(384).fill(0.1),
            metadata: { title: 'Machine Learning' },
          },
          {
            id: 'search-2',
            vector: Array(384).fill(0.15),
            metadata: { title: 'Deep Learning' },
          },
          {
            id: 'search-3',
            vector: Array(384).fill(0.2),
            metadata: { title: 'Neural Networks' },
          },
        ],
      });
    });

    it('should return search results array', async () => {
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

    it('should include id and metadata in results', async () => {
      const results = await adapter.denseSearch({
        query: Array(384).fill(0.1),
        limit: 1,
      });

      if (results.length > 0) {
        expect(results[0].id).toBeDefined();
        expect(results[0].score).toBeDefined();
        expect(results[0].fields).toBeDefined();
      }
    });

    it('should handle empty results', async () => {
      const results = await adapter.denseSearch({
        query: Array(384).fill(0.99), // Unlikely to match
        limit: 10,
      });

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Keyword Search', () => {
    beforeAll(async () => {
      await adapter.indexBatch({
        documents: [
          {
            id: 'kw-1',
            vector: Array(384).fill(0.1),
            metadata: { title: 'Python Programming', content: 'Learn Python basics' },
          },
          {
            id: 'kw-2',
            vector: Array(384).fill(0.2),
            metadata: { title: 'JavaScript Guide', content: 'Web development with JS' },
          },
          {
            id: 'kw-3',
            vector: Array(384).fill(0.3),
            metadata: { title: 'Python Advanced', content: 'Advanced Python techniques' },
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
      expect(results.length).toBeGreaterThan(0);
    });

    it('should normalize keyword search scores', async () => {
      const results = await adapter.keywordSearch({
        query: 'Python',
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

    it('should handle complex queries', async () => {
      const results = await adapter.keywordSearch({
        query: 'Python programming advanced',
        limit: 10,
      });

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Delete Operations', () => {
    it('should delete by vectorId', async () => {
      // Index a document
      const indexed = await adapter.index({
        id: 'del-1',
        vector: Array(384).fill(0.1),
      });

      // Delete it
      const result = await adapter.delete({
        vectorId: indexed.vectorId,
      });

      expect(result.success).toBe(true);
      expect(result.deleted).toBeGreaterThanOrEqual(0);
    });

    it('should return success for non-existent delete', async () => {
      const result = await adapter.delete({
        vectorId: 'non-existent-id',
      });

      expect(result.success).toBe(true);
    });

    it('should handle missing vectorId', async () => {
      const result = await adapter.delete({});

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should return adapter stats', async () => {
      const stats = await adapter.getStats();

      expect(stats.backend).toBe('weaviate');
      expect(typeof stats.totalDocuments).toBe('number');
      expect(typeof stats.indexSize).toBe('number');
      expect(stats.timestamp).toBeDefined();
    });

    it('should include health status', async () => {
      const stats = await adapter.getStats();

      expect(['healthy', 'warning', 'error']).toContain(stats.health);
    });

    it('should include version', async () => {
      const stats = await adapter.getStats();

      expect(typeof stats.version).toBe('string');
      expect(stats.version.length).toBeGreaterThan(0);
    });
  });

  describe('Score Normalization', () => {
    it('should normalize raw scores', async () => {
      const results = await adapter.denseSearch({
        query: Array(384).fill(0.1),
        limit: 10,
      });

      results.forEach(result => {
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
        expect(typeof result.score).toBe('number');
      });
    });

    it('should handle edge case scores', async () => {
      // Test that adapter normalizes extreme values
      const results = await adapter.denseSearch({
        query: Array(384).fill(0.1),
        limit: 10,
      });

      const scores = results.map(r => r.score);
      expect(scores.some(s => s > 0.5)).toBe(true); // Should have variation
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const badAdapter = new WeaviateAdapter({
        url: 'http://unreachable:8080',
        className: 'Test',
        vectorDim: 384,
      });

      await expect(badAdapter.initialize()).rejects.toThrow();
    });

    it('should throw on invalid vector dimension', async () => {
      await expect(
        adapter.index({
          id: 'invalid-dim',
          vector: Array(100).fill(0.1), // Wrong size
        })
      ).rejects.toThrow();
    });

    it('should handle missing required config', () => {
      expect(() => {
        new WeaviateAdapter({ className: 'Test' } as any);
      }).toThrow();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent indexes', async () => {
      const promises = Array(5)
        .fill(0)
        .map((_, i) =>
          adapter.index({
            id: `concurrent-${i}`,
            vector: Array(384).fill(0.1 + i * 0.01),
          })
        );

      const results = await Promise.all(promises);

      expect(results.length).toBe(5);
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
});
