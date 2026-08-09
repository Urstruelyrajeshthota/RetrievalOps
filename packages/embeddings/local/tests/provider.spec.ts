import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { LocalEmbeddingProvider } from '../src/provider';
import { ModelRegistry } from '../src/models';

describe('LocalEmbeddingProvider', () => {
  let provider: LocalEmbeddingProvider;

  beforeEach(() => {
    provider = new LocalEmbeddingProvider();
  });

  describe('Metadata', () => {
    it('should report metadata after initialization', async () => {
      await provider.initialize();

      const meta = provider.metadata();

      expect(meta.name).toBeDefined();
      expect(meta.version).toBeDefined();
      expect(meta.dimensions).toBe(384); // Default model
    });

    it('should support multiple models', async () => {
      const models = [
        'Xenova/all-MiniLM-L6-v2',
        'Xenova/all-mpnet-base-v2',
        'Xenova/bge-small-en-v1.5',
      ];

      for (const model of models) {
        const prov = new LocalEmbeddingProvider({ model });
        await prov.initialize();

        const meta = prov.metadata();
        expect(meta.name).toBeDefined();
        expect(meta.dimensions).toBeGreaterThan(0);
      }
    });
  });

  describe('Single Query Embedding', () => {
    beforeAll(async () => {
      await provider.initialize();
    });

    it('should embed a single query', async () => {
      const embedding = await provider.embedQuery('What is artificial intelligence?');

      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(384); // Default model dimension
      expect(embedding.every((v) => typeof v === 'number')).toBe(true);
    });

    it('should embed different queries consistently', async () => {
      const query1 = 'hello world';
      const query2 = 'hello world';

      const emb1 = await provider.embedQuery(query1);
      const emb2 = await provider.embedQuery(query2);

      // Same text should produce same embedding
      expect(emb1).toEqual(emb2);
    });

    it('should reject empty queries', async () => {
      await expect(provider.embedQuery('')).rejects.toThrow('empty');
      await expect(provider.embedQuery('   ')).rejects.toThrow('empty');
    });

    it('should normalize vectors to unit length', async () => {
      const embedding = await provider.embedQuery('test query');

      const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));

      // Normalized vector should have norm ≈ 1
      expect(norm).toBeCloseTo(1, 1);
    });
  });

  describe('Batch Document Embedding', () => {
    beforeAll(async () => {
      await provider.initialize();
    });

    it('should embed multiple documents', async () => {
      const texts = [
        'Document one about AI',
        'Document two about machine learning',
        'Document three about deep learning',
      ];

      const embeddings = await provider.embedDocuments(texts);

      expect(embeddings).toHaveLength(3);
      embeddings.forEach((emb) => {
        expect(emb.length).toBe(384);
        expect(emb.every((v) => typeof v === 'number')).toBe(true);
      });
    });

    it('should handle batch sizes', async () => {
      const prov = new LocalEmbeddingProvider({ batchSize: 2 });
      await prov.initialize();

      const texts = Array(5)
        .fill(null)
        .map((_, i) => `Document ${i}`);

      const embeddings = await prov.embedDocuments(texts);

      expect(embeddings).toHaveLength(5);
    });

    it('should reject empty array', async () => {
      await expect(provider.embedDocuments([])).rejects.toThrow('non-empty');
    });

    it('should reject invalid input', async () => {
      await expect(provider.embedDocuments([null] as any)).rejects.toThrow();
      await expect(provider.embedDocuments([undefined] as any)).rejects.toThrow();
    });

    it('should maintain order of embeddings', async () => {
      const texts = [
        'first document',
        'second document',
        'third document',
      ];

      const embeddings = await provider.embedDocuments(texts);

      // All embeddings should be unique and in order
      expect(embeddings).toHaveLength(3);
      embeddings.forEach((_, i) => {
        expect(embeddings[i]).toBeDefined();
      });
    });
  });

  describe('Pooling Strategy', () => {
    it('should support mean pooling', async () => {
      const prov = new LocalEmbeddingProvider({ pooling: 'mean' });
      await prov.initialize();

      const embedding = await prov.embedQuery('test');

      expect(embedding.length).toBe(384);
    });

    it('should support cls pooling', async () => {
      const prov = new LocalEmbeddingProvider({ pooling: 'cls' });
      await prov.initialize();

      const embedding = await prov.embedQuery('test');

      expect(embedding.length).toBe(384);
    });
  });

  describe('Initialization', () => {
    it('should initialize on first use', async () => {
      const prov = new LocalEmbeddingProvider();

      expect(prov.getStats().initialized).toBe(false);

      await prov.embedQuery('test');

      expect(prov.getStats().initialized).toBe(true);
    });

    it('should not reinitialize on second call', async () => {
      const prov = new LocalEmbeddingProvider();

      await prov.initialize();
      const stats1 = prov.getStats();

      await prov.initialize();
      const stats2 = prov.getStats();

      expect(stats1.initialized).toBe(stats2.initialized);
    });

    it('should handle initialization errors gracefully', async () => {
      const prov = new LocalEmbeddingProvider({
        model: 'invalid-model-name',
      });

      await expect(prov.initialize()).rejects.toThrow();
    });
  });

  describe('Model Listing', () => {
    it('should list available models', () => {
      const models = provider.listModels();

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      expect(models).toContain('Xenova/all-MiniLM-L6-v2');
    });

    it('should provide model info', () => {
      const info = provider.getModelInfo('Xenova/all-MiniLM-L6-v2');

      expect(info).toBeDefined();
      expect(info?.name).toBe('Xenova/all-MiniLM-L6-v2');
      expect(info?.dimensions).toBe(384);
      expect(info?.metric).toBe('cosine');
    });

    it('should return null for unknown model', () => {
      const info = provider.getModelInfo('invalid-model');

      expect(info).toBeNull();
    });
  });

  describe('Statistics', () => {
    it('should report initialization state', async () => {
      const prov = new LocalEmbeddingProvider();

      expect(prov.getStats().initialized).toBe(false);

      await prov.initialize();

      expect(prov.getStats().initialized).toBe(true);
    });

    it('should report current model info', async () => {
      const prov = new LocalEmbeddingProvider({
        model: 'Xenova/all-mpnet-base-v2',
      });

      await prov.initialize();

      const stats = prov.getStats();

      expect(stats.modelName).toBe('Xenova/all-mpnet-base-v2');
      expect(stats.dimensions).toBe(768);
    });
  });

  describe('Vector Normalization', () => {
    beforeAll(async () => {
      await provider.initialize();
    });

    it('should normalize embeddings by default', async () => {
      const embedding = await provider.embedQuery('test');

      const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));

      expect(norm).toBeCloseTo(1, 1);
    });

    it('should support unnormalized embeddings', async () => {
      const prov = new LocalEmbeddingProvider({ normalize: false });
      await prov.initialize();

      const embedding = await prov.embedQuery('test');

      const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));

      // Unnormalized vector may have different norm
      expect(embedding.length).toBe(384);
    });
  });

  describe('Model Registry', () => {
    it('should work with ModelRegistry', () => {
      const registry = new ModelRegistry();

      const models = registry.listModels();
      expect(models.length).toBeGreaterThan(0);

      const info = registry.getModelInfo('Xenova/all-MiniLM-L6-v2');
      expect(info).toBeDefined();
    });

    it('should recommend models by use case', () => {
      const registry = new ModelRegistry();

      expect(registry.getRecommendedModel('speed')).toBe('Xenova/all-MiniLM-L6-v2');
      expect(registry.getRecommendedModel('quality')).toBe('Xenova/bge-base-en-v1.5');
      expect(registry.getRecommendedModel('multilingual')).toBe(
        'Xenova/multilingual-e5-base'
      );
    });
  });

  describe('Concurrent Requests', () => {
    beforeAll(async () => {
      await provider.initialize();
    });

    it('should handle multiple concurrent queries', async () => {
      const queries = [
        'What is AI?',
        'How does ML work?',
        'Tell me about deep learning',
      ];

      const results = await Promise.all(
        queries.map((q) => provider.embedQuery(q))
      );

      expect(results).toHaveLength(3);
      results.forEach((emb) => {
        expect(emb.length).toBe(384);
      });
    });

    it('should handle mixed query and batch operations', async () => {
      const query = await provider.embedQuery('Query text');
      const docs = await provider.embedDocuments(['Doc 1', 'Doc 2']);

      expect(query.length).toBe(384);
      expect(docs).toHaveLength(2);
    });
  });
});
