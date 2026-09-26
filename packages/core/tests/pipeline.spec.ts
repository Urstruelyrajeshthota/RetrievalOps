import { describe, it, expect, beforeEach } from 'vitest';
import { RetrievalOps } from '../src/retrieval-ops';
import { defineEntity } from '../src/entity';
import { resetGlobalRegistry } from '../src/registry';
import { Fusion } from '../src/pipeline/fusion';

describe('RetrievalOps Pipeline', () => {
  let retrieval: RetrievalOps;

  const mockAdapter = {
    getCapabilities: async () => ({
      dense: true,
      keyword: true,
      hybrid: true,
      nativeExplain: false,
      multiTenant: true,
      transactions: false,
      filtering: true,
      partitioning: false,
      clustering: false,
    }),
    getBackendType: () => 'postgresql' as const,
    getVersion: () => '1.0.0',
    index: async (req: any) => ({ success: true, vectorId: req.id }),
    indexBatch: async () => ({ success: true, indexedCount: 0, failedCount: 0, results: [] }),
    denseSearch: async () => [],
    keywordSearch: async () => [],
    delete: async () => ({ success: true, deletedCount: 0 }),
    health: async () => ({ healthy: true, status: 'healthy' as const, latencyMs: 1 }),
    getStats: async () => ({ totalVectors: 0, storageUsed: 0, indexCount: 0, avgSearchLatencyMs: 0, queriesPerSecond: 0 }),
    initialize: async () => {},
    close: async () => {},
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
    resetGlobalRegistry();
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
      ).rejects.toThrow(/required/i);
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

    it('should use intent compiler output to select strategy and record decision metadata', async () => {
      resetGlobalRegistry();

      const entity = defineEntity({
        name: 'document',
        id: 'id',
        fields: {
          id: { retrieval: ['exact'] },
          title: { retrieval: ['semantic'] },
        },
      });

      const decisionProvider = {
        choose: async () => ({
          selected: 'hybrid',
          confidence: 0.91,
          reason: 'needs both semantic and keyword signals',
        }),
        score: async () => ({
          score: 0.84,
          confidence: 0.9,
          breakdown: { semantic: 0.8, keyword: 0.88 },
        }),
        evaluate: async () => 0.82,
      };

      const intentCompiler = {
        compile: async () => ({
          normalizedIntent: 'risk_assessment',
          taskType: 'risk_assessment',
          requiredEvidenceTypes: ['release_history', 'defect_log'],
          retrievalStrategyHint: 'hybrid',
          retrievalBudget: { maxCandidates: 25, maxResults: 5 },
          riskFlags: ['release_risk'],
          confidence: 0.9,
        }),
      };

      const adapted = new RetrievalOps({
        store: mockAdapter as any,
        embeddings: mockEmbeddings as any,
        intentCompiler: intentCompiler as any,
        decision: decisionProvider as any,
      });

      adapted.registerEntity(entity);

      const result = await adapted.search({
        entity,
        query: 'Why is Release 24 at risk?',
      });

      expect(result.success).toBe(true);
      expect(result.plan.strategy).toBe('hybrid');
      expect(result.plan.intent).toBe('risk_assessment');
      expect(result.plan.decisionConfidence).toBeGreaterThan(0);
      expect(result.plan.evidenceSufficiency).toBeGreaterThanOrEqual(0);
    });

    it('should authorize before invoking the decision provider', async () => {
      resetGlobalRegistry();

      const entity = defineEntity({
        name: 'document',
        id: 'id',
        fields: {
          id: { retrieval: ['exact'] },
          title: { retrieval: ['semantic'] },
        },
      });

      let decisionCalled = false;

      const adapted = new RetrievalOps({
        store: mockAdapter as any,
        embeddings: mockEmbeddings as any,
        decision: {
          choose: async () => {
            decisionCalled = true;
            return { selected: 'hybrid', confidence: 0.9, reason: 'should not run' };
          },
          score: async () => ({ score: 0.8, confidence: 0.8, reason: 'unused' }),
          evaluate: async () => 0.8,
        } as any,
        policy: {
          authorize: async () => ({ allowed: false, reason: 'tenant access denied' }),
          filter: async (candidates: any[]) => candidates,
        },
      });

      adapted.registerEntity(entity);

      const result = await adapted.search({
        entity,
        query: 'Why did this fail?',
        context: { tenantId: 'tenant-1', principalId: 'user-2' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Access denied');
      expect(decisionCalled).toBe(false);
    });

    it('should reject requests in enterprise mode when policy, tenant or principal context is missing', async () => {
      resetGlobalRegistry();

      const entity = defineEntity({
        name: 'document',
        id: 'id',
        fields: {
          id: { retrieval: ['exact'] },
          title: { retrieval: ['semantic'] },
        },
      });

      const adapted = new RetrievalOps({
        store: mockAdapter as any,
        embeddings: mockEmbeddings as any,
        security: {
          mode: 'enterprise',
          requirePolicy: true,
          requireTenantContext: true,
          requirePrincipalContext: true,
          failClosed: true,
        },
      });

      adapted.registerEntity(entity);

      const result = await adapted.search({
        entity,
        query: 'Why did this fail?',
        context: { tenantId: 'tenant-1' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/principal|policy|tenant/i);
    });

    it('should clamp decision output to policy-safe strategies and evidence budgets', async () => {
      resetGlobalRegistry();

      const entity = defineEntity({
        name: 'document',
        id: 'id',
        fields: {
          id: { retrieval: ['exact'] },
          title: { retrieval: ['semantic'] },
        },
      });

      const adapted = new RetrievalOps({
        store: mockAdapter as any,
        embeddings: mockEmbeddings as any,
        security: {
          mode: 'enterprise',
          requirePolicy: true,
          requireTenantContext: true,
          requirePrincipalContext: true,
          failClosed: true,
        },
        policy: {
          authorize: async () => ({ allowed: true, reason: 'ok' }),
          filter: async (candidates: any[]) => candidates,
        },
        decision: {
          choose: async () => ({
            selected: 'shadow',
            selectedStrategy: 'shadow',
            confidence: 0.99,
            rationale: 'invalid strategy',
            evidenceBudget: { maxDocuments: 9999, maxTokens: 999999 },
            modelVersion: 'test-model',
            requiresReview: true,
          }),
          score: async () => ({ score: 0.8, confidence: 0.8, reason: 'ok' }),
          evaluate: async () => 0.8,
        } as any,
      });

      adapted.registerEntity(entity);

      const result = await adapted.search({
        entity,
        query: 'Why did this fail?',
        context: { tenantId: 'tenant-1', principalId: 'user-1' },
      });

      expect(result.success).toBe(true);
      expect(result.audit).toBeDefined();
      expect(result.audit?.selectedStrategy).toMatch(/dense|hybrid|keyword/);
      expect(result.audit?.evidenceBudget.maxDocuments).toBeLessThanOrEqual(12);
      expect(result.audit?.evidenceBudget.maxTokens).toBeLessThanOrEqual(2400);
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
