import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PgVectorAdapter } from '../src/adapter';

describe('PgVectorAdapter', () => {
  let adapter: PgVectorAdapter;

  // Note: These tests require a running PostgreSQL instance with pgvector extension
  // Tests can be skipped if DATABASE_URL is not set
  const hasDatabase = !!process.env.DATABASE_URL;

  const getAdapter = () => {
    return new PgVectorAdapter({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test',
      schema: 'test_retrieval_ops',
      autoCreateSchema: true,
    });
  };

  beforeAll(async () => {
    if (!hasDatabase) {
      console.log('⚠️  Skipping PgVector adapter tests: DATABASE_URL not set');
      return;
    }

    adapter = getAdapter();
    await adapter.initialize();
  });

  afterAll(async () => {
    if (!hasDatabase) return;
    await adapter.reset();
    await adapter.close();
  });

  beforeEach(async () => {
    if (!hasDatabase) return;
    await adapter.reset();
    await adapter.initialize();
  });

  describe('Adapter Capabilities', () => {
    it('should report capabilities', async () => {
      if (!hasDatabase) this.skip();

      const caps = adapter.capabilities();

      expect(caps.name).toBe('PgVectorAdapter');
      expect(caps.supportsDenseSearch).toBe(true);
      expect(caps.supportsKeywordSearch).toBe(true);
    });
  });

  describe('Health Check', () => {
    it('should report healthy status', async () => {
      if (!hasDatabase) this.skip();

      const health = await adapter.health();

      expect(health.healthy).toBe(true);
      expect(health.message).toBeDefined();
    });
  });

  describe('Indexing', () => {
    it('should index a document with embeddings', async () => {
      if (!hasDatabase) this.skip();

      const result = await adapter.index({
        entityType: 'test_entity',
        entityId: 'doc-1',
        field: 'content',
        text: 'This is a test document',
        vector: Array(384).fill(0.1),
        contentHash: 'abc123',
        embeddingModel: 'test-model',
        embeddingVersion: '1.0.0',
        distanceMetric: 'cosine',
        sourceUpdatedAt: new Date(),
      });

      expect(result.success).toBe(true);
      expect(result.indexed).toBe(true);
    });

    it('should handle duplicate content (deduplication)', async () => {
      if (!hasDatabase) this.skip();

      const vector = Array(384).fill(0.2);
      const hash = 'duplicate-hash';

      // Index same content twice
      const result1 = await adapter.index({
        entityType: 'test_entity',
        entityId: 'doc-1',
        field: 'content',
        text: 'Duplicate content',
        vector,
        contentHash: hash,
        embeddingModel: 'test-model',
        embeddingVersion: '1.0.0',
        distanceMetric: 'cosine',
        sourceUpdatedAt: new Date(),
      });

      const result2 = await adapter.index({
        entityType: 'test_entity',
        entityId: 'doc-2',
        field: 'content',
        text: 'Duplicate content',
        vector,
        contentHash: hash,
        embeddingModel: 'test-model',
        embeddingVersion: '1.0.0',
        distanceMetric: 'cosine',
        sourceUpdatedAt: new Date(),
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      // Both should be indexed but the second reuses the vector
    });
  });

  describe('Dense Search', () => {
    beforeEach(async () => {
      if (!hasDatabase) return;

      // Index test documents
      const vector = Array(384).fill(0.1);
      await adapter.index({
        entityType: 'test_entity',
        entityId: 'doc-1',
        field: 'content',
        text: 'The quick brown fox',
        vector,
        contentHash: 'hash1',
        embeddingModel: 'test-model',
        embeddingVersion: '1.0.0',
        distanceMetric: 'cosine',
        sourceUpdatedAt: new Date(),
      });

      await adapter.index({
        entityType: 'test_entity',
        entityId: 'doc-2',
        field: 'content',
        text: 'The lazy dog',
        vector: Array(384).fill(0.15),
        contentHash: 'hash2',
        embeddingModel: 'test-model',
        embeddingVersion: '1.0.0',
        distanceMetric: 'cosine',
        sourceUpdatedAt: new Date(),
      });
    });

    it('should perform dense search', async () => {
      if (!hasDatabase) this.skip();

      const results = await adapter.denseSearch({
        entityType: 'test_entity',
        vector: Array(384).fill(0.1),
        topK: 10,
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].entityId).toBeDefined();
      expect(results[0].score).toBeGreaterThanOrEqual(0);
      expect(results[0].score).toBeLessThanOrEqual(1);
    });

    it('should support cosine similarity', async () => {
      if (!hasDatabase) this.skip();

      const results = await adapter.denseSearch({
        entityType: 'test_entity',
        vector: Array(384).fill(0.1),
        topK: 10,
        distanceMetric: 'cosine',
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((r) => {
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(1);
      });
    });

    it('should support euclidean distance', async () => {
      if (!hasDatabase) this.skip();

      const results = await adapter.denseSearch({
        entityType: 'test_entity',
        vector: Array(384).fill(0.1),
        topK: 10,
        distanceMetric: 'euclidean',
      });

      expect(results.length).toBeGreaterThan(0);
    });

    it('should support dot product', async () => {
      if (!hasDatabase) this.skip();

      const results = await adapter.denseSearch({
        entityType: 'test_entity',
        vector: Array(384).fill(0.1),
        topK: 10,
        distanceMetric: 'dot',
      });

      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty for non-existent entity type', async () => {
      if (!hasDatabase) this.skip();

      const results = await adapter.denseSearch({
        entityType: 'non_existent',
        vector: Array(384).fill(0.1),
        topK: 10,
      });

      expect(results.length).toBe(0);
    });
  });

  describe('Deletion', () => {
    it('should delete a document', async () => {
      if (!hasDatabase) this.skip();

      // Index
      await adapter.index({
        entityType: 'test_entity',
        entityId: 'doc-to-delete',
        field: 'content',
        text: 'Delete me',
        vector: Array(384).fill(0.1),
        contentHash: 'to-delete-hash',
        embeddingModel: 'test-model',
        embeddingVersion: '1.0.0',
        distanceMetric: 'cosine',
        sourceUpdatedAt: new Date(),
      });

      // Delete
      await adapter.delete({
        entityType: 'test_entity',
        entityId: 'doc-to-delete',
      });

      // Verify deletion
      const results = await adapter.denseSearch({
        entityType: 'test_entity',
        vector: Array(384).fill(0.1),
        topK: 10,
      });

      expect(results.every((r) => r.entityId !== 'doc-to-delete')).toBe(true);
    });

    it('should handle deletion of non-existent documents', async () => {
      if (!hasDatabase) this.skip();

      // Should not throw
      await expect(
        adapter.delete({
          entityType: 'test_entity',
          entityId: 'non-existent',
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('Score Normalization', () => {
    beforeEach(async () => {
      if (!hasDatabase) return;

      await adapter.index({
        entityType: 'test_entity',
        entityId: 'doc-1',
        field: 'content',
        text: 'Test content',
        vector: Array(384).fill(0.5),
        contentHash: 'hash1',
        embeddingModel: 'test-model',
        embeddingVersion: '1.0.0',
        distanceMetric: 'cosine',
        sourceUpdatedAt: new Date(),
      });
    });

    it('should return scores in range [0, 1]', async () => {
      if (!hasDatabase) this.skip();

      const results = await adapter.denseSearch({
        entityType: 'test_entity',
        vector: Array(384).fill(0.5),
        topK: 10,
      });

      results.forEach((result) => {
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });
    });
  });
});
