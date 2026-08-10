/**
 * Qdrant Adapter Tests
 *
 * Validates SearchAdapter interface compliance and Qdrant-specific functionality.
 */

import { describe, it, expect, beforeAll, afterAll, skip } from 'vitest';
import { QdrantAdapter } from '../src/adapter';
import type { SearchAdapter } from '@retrievalops/contracts';

// Skip if Qdrant is not available
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';

describe.skipIf(!isQdrantAvailable())('QdrantAdapter - SearchAdapter Compliance', () => {
  let adapter: SearchAdapter;

  async function isQdrantAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${QDRANT_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  beforeAll(async () => {
    adapter = new QdrantAdapter({
      url: QDRANT_URL,
      collectionName: 'test_compliance',
      vectorSize: 384,
      autoCreateCollection: true,
    });

    await adapter.initialize();
  });

  afterAll(async () => {
    await adapter.close();
  });

  describe('Interface Methods', () => {
    it('should have all SearchAdapter methods', () => {
      expect(typeof adapter.initialize).toBe('function');
      expect(typeof adapter.index).toBe('function');
      expect(typeof adapter.indexBatch).toBe('function');
      expect(typeof adapter.denseSearch).toBe('function');
      expect(typeof adapter.keywordSearch).toBe('function');
      expect(typeof adapter.delete).toBe('function');
      expect(typeof adapter.health).toBe('function');
      expect(typeof adapter.getStats).toBe('function');
      expect(typeof adapter.close).toBe('function');
      expect(typeof adapter.getBackendType).toBe('function');
      expect(typeof adapter.getVersion).toBe('function');
    });
  });

  describe('Backend Identification', () => {
    it('should return "qdrant" as backend type', () => {
      const qdAdapter = adapter as QdrantAdapter;
      expect(qdAdapter.getBackendType()).toBe('qdrant');
    });

    it('should return valid version', () => {
      const qdAdapter = adapter as QdrantAdapter;
      const version = qdAdapter.getVersion();
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('Indexing', () => {
    it('should index a single vector', async () => {
      const result = await adapter.index({
        id: 'test-vec-1',
        entityType: 'document',
        entityId: 'doc-1',
        field: 'content',
        text: 'Test document content',
        vector: Array(384).fill(0.1),
        contentHash: 'hash1',
        embeddingModel: 'test-model',
        embeddingVersion: '1.0',
        distanceMetric: 'cosine',
        dimensions: 384,
      });

      expect(result.success).toBe(true);
      expect(result.vectorId).toBe('test-vec-1');
    });

    it('should reject vector with wrong dimensions', async () => {
      const result = await adapter.index({
        id: 'test-vec-2',
        entityType: 'document',
        entityId: 'doc-2',
        field: 'content',
        text: 'Wrong dimensions',
        vector: Array(512).fill(0.1), // Wrong size
        contentHash: 'hash2',
        embeddingModel: 'test-model',
        embeddingVersion: '1.0',
        distanceMetric: 'cosine',
        dimensions: 512,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should batch index vectors', async () => {
      const result = await adapter.indexBatch({
        vectors: [
          {
            id: 'batch-1',
            entityType: 'document',
            entityId: 'doc-3',
            field: 'content',
            text: 'Batch document 1',
            vector: Array(384).fill(0.2),
            contentHash: 'hash3',
            embeddingModel: 'test-model',
            embeddingVersion: '1.0',
            distanceMetric: 'cosine',
            dimensions: 384,
          },
          {
            id: 'batch-2',
            entityType: 'document',
            entityId: 'doc-4',
            field: 'content',
            text: 'Batch document 2',
            vector: Array(384).fill(0.3),
            contentHash: 'hash4',
            embeddingModel: 'test-model',
            embeddingVersion: '1.0',
            distanceMetric: 'cosine',
            dimensions: 384,
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.indexedCount).toBe(2);
      expect(result.failedCount).toBe(0);
    });
  });

  describe('Dense Search', () => {
    it('should return SearchCandidate array', async () => {
      const results = await adapter.denseSearch({
        queryVector: Array(384).fill(0.1),
        entityType: 'document',
        topK: 5,
      });

      expect(Array.isArray(results)).toBe(true);

      if (results.length > 0) {
        const candidate = results[0];
        expect(candidate.vectorId).toBeDefined();
        expect(candidate.entityType).toBe('document');
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

    it('should respect topK parameter', async () => {
      const results = await adapter.denseSearch({
        queryVector: Array(384).fill(0.1),
        entityType: 'document',
        topK: 2,
      });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should support field filters', async () => {
      const results = await adapter.denseSearch({
        queryVector: Array(384).fill(0.1),
        entityType: 'document',
        topK: 5,
        fieldFilters: { status: 'published' },
      });

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Keyword Search', () => {
    it('should return empty for unsupported keyword search', async () => {
      const results = await adapter.keywordSearch({
        query: 'test',
        entityType: 'document',
        topK: 5,
      });

      expect(Array.isArray(results)).toBe(true);
      // Keyword search not supported natively in Qdrant
      expect(results.length).toBe(0);
    });
  });

  describe('Observability', () => {
    it('should return health status', async () => {
      const health = await adapter.health();

      expect(health.healthy).toBeDefined();
      expect(typeof health.healthy).toBe('boolean');
      expect(health.status).toMatch(/healthy|degraded|unhealthy/);
      expect(typeof health.latencyMs).toBe('number');
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should return adapter stats', async () => {
      const stats = await adapter.getStats();

      expect(typeof stats.totalVectors).toBe('number');
      expect(typeof stats.storageUsed).toBe('number');
      expect(typeof stats.indexCount).toBe('number');
      expect(typeof stats.avgSearchLatencyMs).toBe('number');
    });
  });

  describe('Delete Operations', () => {
    it('should delete by vectorId', async () => {
      const result = await adapter.delete({
        vectorId: 'test-vec-1',
      });

      expect(result.success).toBe(true);
    });

    it('should not support delete by entity', async () => {
      const result = await adapter.delete({
        entityType: 'document',
        entityId: 'doc-1',
      });

      // Qdrant doesn't support complex delete filters
      expect(result.success).toBe(false);
    });
  });
});
