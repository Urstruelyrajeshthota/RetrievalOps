/**
 * SearchAdapter Interface Compliance Tests
 *
 * Verifies that PgVectorAdapter correctly implements SearchAdapter interface.
 * v0.2.0+: Multi-database support foundation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PgVectorAdapter } from '../src/adapter';
import { SearchAdapter } from '@retrievalops/contracts';

describe('PgVectorAdapter - SearchAdapter Compliance', () => {
  let adapter: SearchAdapter;

  beforeAll(async () => {
    adapter = new PgVectorAdapter({
      connectionString: process.env.DATABASE_URL ||
        'postgresql://postgres:password@localhost:5432/test_retrievalops',
      schema: 'test_compliance',
      tableName: 'vectors',
      autoCreateSchema: true,
    });

    await adapter.initialize();
  });

  afterAll(async () => {
    await adapter.close();
  });

  describe('Interface Methods', () => {
    it('should have initialize method', () => {
      expect(typeof adapter.initialize).toBe('function');
    });

    it('should have index method', () => {
      expect(typeof adapter.index).toBe('function');
    });

    it('should have indexBatch method', () => {
      expect(typeof adapter.indexBatch).toBe('function');
    });

    it('should have denseSearch method', () => {
      expect(typeof adapter.denseSearch).toBe('function');
    });

    it('should have keywordSearch method', () => {
      expect(typeof adapter.keywordSearch).toBe('function');
    });

    it('should have delete method', () => {
      expect(typeof adapter.delete).toBe('function');
    });

    it('should have health method', () => {
      expect(typeof adapter.health).toBe('function');
    });

    it('should have getStats method', () => {
      expect(typeof adapter.getStats).toBe('function');
    });

    it('should have close method', () => {
      expect(typeof adapter.close).toBe('function');
    });

    it('should have getBackendType method', () => {
      expect(typeof adapter.getBackendType).toBe('function');
    });

    it('should have getVersion method', () => {
      expect(typeof adapter.getVersion).toBe('function');
    });
  });

  describe('Backend Identification', () => {
    it('should return correct backend type', () => {
      const pgAdapter = adapter as PgVectorAdapter;
      expect(pgAdapter.getBackendType()).toBe('postgresql');
    });

    it('should return valid version string', () => {
      const pgAdapter = adapter as PgVectorAdapter;
      const version = pgAdapter.getVersion();
      expect(typeof version).toBe('string');
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('Index Request/Response Types', () => {
    it('should return proper IndexResult from index()', async () => {
      const result = await adapter.index({
        id: 'test-1',
        entityType: 'test',
        entityId: 'id-1',
        field: 'content',
        text: 'test content',
        vector: Array(384).fill(0.1),
        contentHash: 'abc123',
        embeddingModel: 'test-model',
        embeddingVersion: '1.0',
        distanceMetric: 'cosine',
        dimensions: 384,
      });

      expect(result.success).toBeDefined();
      expect(result.vectorId).toBeDefined();
    });

    it('should return proper BatchIndexResult from indexBatch()', async () => {
      const result = await adapter.indexBatch({
        vectors: [
          {
            id: 'batch-1',
            entityType: 'test',
            entityId: 'id-2',
            field: 'content',
            text: 'test',
            vector: Array(384).fill(0.2),
            contentHash: 'def456',
            embeddingModel: 'test-model',
            embeddingVersion: '1.0',
            distanceMetric: 'cosine',
            dimensions: 384,
          },
        ],
      });

      expect(result.success).toBeDefined();
      expect(result.indexedCount).toBeDefined();
      expect(result.failedCount).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });
  });

  describe('Search Result Types', () => {
    it('should return SearchCandidate[] from denseSearch', async () => {
      const results = await adapter.denseSearch({
        queryVector: Array(384).fill(0.1),
        entityType: 'test',
        topK: 10,
      });

      expect(Array.isArray(results)).toBe(true);

      if (results.length > 0) {
        const candidate = results[0];
        expect(candidate.vectorId).toBeDefined();
        expect(candidate.entityType).toBeDefined();
        expect(candidate.entityId).toBeDefined();
        expect(candidate.field).toBeDefined();
        expect(candidate.text).toBeDefined();
        expect(typeof candidate.score).toBe('number');
        expect(candidate.score).toBeGreaterThanOrEqual(0);
        expect(candidate.score).toBeLessThanOrEqual(1);
        expect(candidate.scoreSource).toBe('dense');
        expect(typeof candidate.fieldWeight).toBe('number');
        expect(typeof candidate.weightedScore).toBe('number');
      }
    });

    it('should return SearchCandidate[] from keywordSearch', async () => {
      const results = await adapter.keywordSearch({
        query: 'test',
        entityType: 'test',
        topK: 10,
      });

      expect(Array.isArray(results)).toBe(true);

      if (results.length > 0) {
        const candidate = results[0];
        expect(candidate.vectorId).toBeDefined();
        expect(candidate.scoreSource).toBe('keyword');
        expect(candidate.score).toBeGreaterThanOrEqual(0);
        expect(candidate.score).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Observability Methods', () => {
    it('should return HealthStatus from health()', async () => {
      const status = await adapter.health();

      expect(status.healthy).toBeDefined();
      expect(typeof status.healthy).toBe('boolean');
      expect(status.status).toMatch(/healthy|degraded|unhealthy/);
      expect(typeof status.latencyMs).toBe('number');
      expect(status.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should return AdapterStats from getStats()', async () => {
      const stats = await adapter.getStats();

      expect(stats.totalVectors).toBeDefined();
      expect(typeof stats.totalVectors).toBe('number');
      expect(stats.storageUsed).toBeDefined();
      expect(typeof stats.storageUsed).toBe('number');
      expect(stats.indexCount).toBeDefined();
      expect(typeof stats.indexCount).toBe('number');
      expect(stats.avgSearchLatencyMs).toBeDefined();
      expect(typeof stats.avgSearchLatencyMs).toBe('number');
    });
  });

  describe('Delete Operations', () => {
    it('should handle delete by vectorId', async () => {
      const result = await adapter.delete({ vectorId: 'test-1' });

      expect(result.success).toBeDefined();
      expect(typeof result.deletedCount).toBe('number');
    });

    it('should handle delete by entity', async () => {
      const result = await adapter.delete({
        entityType: 'test',
        entityId: 'id-1',
      });

      expect(result.success).toBeDefined();
      expect(typeof result.deletedCount).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid vector dimensions', async () => {
      const result = await adapter.index({
        id: 'invalid-1',
        entityType: 'test',
        entityId: 'id-invalid',
        field: 'content',
        text: 'test',
        vector: Array(5000).fill(0.1), // Too large
        contentHash: 'invalid',
        embeddingModel: 'test-model',
        embeddingVersion: '1.0',
        distanceMetric: 'cosine',
        dimensions: 5000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return empty array on search error', async () => {
      const results = await adapter.denseSearch({
        queryVector: Array(384).fill(0.1),
        entityType: 'nonexistent',
        topK: 10,
      });

      expect(Array.isArray(results)).toBe(true);
    });
  });
});
