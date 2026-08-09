import { describe, it, expect, beforeEach } from 'vitest';
import { RetrievalOps } from '../src/retrieval-ops';
import { defineEntity } from '../src/entity';
import { Fusion } from '../src/pipeline/fusion';

describe('RetrievalOps Pipeline', () => {
  let retrieval: RetrievalOps;

  const mockAdapter = {
    capabilities: () => ({
      name: 'MockAdapter',
      version: '1.0.0',
      supportsDenseSearch: true,
      supportsKeywordSearch: true,
      supportsExactMatch: false,
      supportsFiltering: true,
      supportsBatch: false,
    }),
    index: async () => ({ success: true, indexed: true }),
    denseSearch: async () => [],
    keywordSearch: async () => [],
    delete: async () => {},
    health: async () => ({ healthy: true }),
  };

  const mockEmbeddings = {
    metadata: () => ({
      name: 'test-model',
      version: '1.0.0',
      dimensions: 384,
    }),
    embedQuery: async (text: string) => Array(384).fill(0.5),
    embedDocuments: async (texts: string[]) =>
      texts.map(() => Array(384).fill(0.5)),
  };

  beforeEach(() => {
    retrieval = new RetrievalOps({
      store: mockAdapter as any,
      embeddings: mockEmbeddings as any,
    });
  });

  describe('Entity Registration', () => {
    it('should register an entity', () => {
      const entity = defineEntity({
        name: 'test_doc',
        id: 'id',
        fields: {
          id: { retrieval: ['exact'] },
          title: { retrieval: ['semantic', 'keyword'] },
          content: { retrieval: ['semantic'] },
        },
      });

      retrieval.registerEntity(entity);

      // Should not throw when searching with registered entity
      expect(() => {
        retrieval.search({
          entity,
          query: 'test',
        });
      }).not.toThrow();
    });
  });

  describe('Indexing', () => {
    it('should index a document', async () => {
      const entity = defineEntity({
        name: 'document',
        id: 'id',
        fields: {
          id: { retrieval: ['exact'] },
          title: { retrieval: ['semantic'] },
          content: { retrieval: ['semantic'] },
        },
      });

      retrieval.registerEntity(entity);

      const result = await retrieval.index({
        entity,
        document: {
          id: 'doc-1',
          title: 'Test Document',
          content: 'This is a test document',
        },
      });

      expect(result.success).toBe(true);
      expect(result.indexedFields.length).toBeGreaterThan(0);
    });

    it('should handle missing ID field', async () => {
      const entity = defineEntity({
        name: 'document',
        id: 'id',
        fields: {
          id: { retrieval: ['exact'] },
          title: { retrieval: ['semantic'] },
        },
      });

      retrieval.registerEntity(entity);

      await expect(
        retrieval.index({
          entity,
          document: {
            title: 'Test',
            // Missing id field
          },
        })
      ).rejects.toThrow('required');
    });
  });

  describe('Search', () => {
    beforeEach(async () => {
      const entity = defineEntity({
        name: 'document',
        id: 'id',
        fields: {
          id: { retrieval: ['exact'] },
          title: { retrieval: ['semantic'] },
        },
      });

      retrieval.registerEntity(entity);
    });

    it('should search documents', async () => {
      const entity = defineEntity({
        name: 'document',
        id: 'id',
        fields: {
          id: { retrieval: ['exact'] },
          title: { retrieval: ['semantic'] },
        },
      });

      const result = await retrieval.search({
        entity,
        query: 'What is?',
      });

      expect(result.success).toBe(true);
      expect(result.results).toBeInstanceOf(Array);
      expect(result.plan).toBeDefined();
      expect(result.telemetry).toBeDefined();
    });

    it('should return empty results for non-matching query', async () => {
      const entity = defineEntity({
        name: 'document',
        id: 'id',
        fields: {
          id: { retrieval: ['exact'] },
          title: { retrieval: ['semantic'] },
        },
      });

      const result = await retrieval.search({
        entity,
        query: 'xyz abc def',
        topK: 10,
      });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(0);
    });

    it('should support hybrid strategy', async () => {
      const entity = defineEntity({
        name: 'document',
        id: 'id',
        fields: {
          id: { retrieval: ['exact'] },
          title: { retrieval: ['semantic'] },
        },
      });

      const result = await retrieval.search({
        entity,
        query: 'test',
        strategy: 'hybrid',
      });

      expect(result.success).toBe(true);
      expect(result.plan.strategy).toBe('hybrid');
    });

    it('should handle unknown entity', async () => {
      const entity = defineEntity({
        name: 'unknown_entity',
        id: 'id',
        fields: {
          id: { retrieval: ['exact'] },
          title: { retrieval: ['semantic'] },
        },
      });

      const result = await retrieval.search({
        entity,
        query: 'test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Health Check', () => {
    it('should check adapter health', async () => {
      const health = await retrieval.health();

      expect(health.healthy).toBe(true);
    });
  });
});

describe('Fusion Algorithm', () => {
  let fusion: Fusion;

  beforeEach(() => {
    fusion = new Fusion({
      denseWeight: 0.6,
      keywordWeight: 0.4,
      rrfK: 60,
    });
  });

  describe('RRF Fusion', () => {
    it('should combine dense and keyword results', () => {
      const denseResults = [
        { entityId: 'doc-1', score: 0.9, field: 'title' },
        { entityId: 'doc-2', score: 0.8, field: 'content' },
        { entityId: 'doc-3', score: 0.7, field: 'content' },
      ];

      const keywordResults = [
        { entityId: 'doc-2', score: 0.85, field: 'title' },
        { entityId: 'doc-1', score: 0.75, field: 'content' },
        { entityId: 'doc-4', score: 0.6, field: 'content' },
      ];

      const fused = fusion.rrf(denseResults, keywordResults);

      expect(fused.length).toBeGreaterThan(0);
      expect(fused[0].score).toBeGreaterThanOrEqual(0);
      expect(fused[0].score).toBeLessThanOrEqual(1);
    });

    it('should handle results from only one source', () => {
      const denseResults = [
        { entityId: 'doc-1', score: 0.9, field: 'title' },
      ];

      const fused = fusion.rrf(denseResults, []);

      expect(fused).toHaveLength(1);
      expect(fused[0].entityId).toBe('doc-1');
    });

    it('should normalize scores to [0, 1]', () => {
      const denseResults = Array(10)
        .fill(null)
        .map((_, i) => ({
          entityId: `doc-${i}`,
          score: Math.random(),
          field: 'content',
        }));

      const keywordResults = Array(10)
        .fill(null)
        .map((_, i) => ({
          entityId: `doc-${i + 5}`,
          score: Math.random(),
          field: 'title',
        }));

      const fused = fusion.rrf(denseResults, keywordResults);

      fused.forEach((result) => {
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Weighted Fusion', () => {
    it('should compute weighted average', () => {
      const denseResults = [
        { entityId: 'doc-1', score: 0.9, field: 'title' },
        { entityId: 'doc-2', score: 0.8, field: 'content' },
      ];

      const keywordResults = [
        { entityId: 'doc-1', score: 0.7, field: 'content' },
      ];

      const fused = fusion.weighted(denseResults, keywordResults);

      expect(fused.length).toBeGreaterThan(0);
      fused.forEach((result) => {
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });
    });
  });
});
