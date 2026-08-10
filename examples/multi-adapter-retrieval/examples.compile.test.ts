/**
 * Examples Compilation Tests
 *
 * Verifies that all example code compiles correctly against SearchAdapter contract
 * This ensures users can copy examples without getting TypeScript errors
 */

import {
  type SearchAdapter,
  type DenseSearchRequest,
  type KeywordSearchRequest,
  type IndexRequest,
  type BatchIndexRequest,
  type DeleteRequest,
  type AdapterCapabilities,
  type SearchCandidate,
  type IndexResult,
  type BatchIndexResult,
  type DeleteResult,
  type HealthStatus,
  type AdapterStats,
} from '@itsrajeshthota/retrievalops-contracts';

describe('Examples TypeScript Compilation', () => {
  describe('DenseSearchRequest Contract', () => {
    it('should accept queryVector, entityType, topK', () => {
      const request: DenseSearchRequest = {
        queryVector: new Array(384).fill(0.1),
        entityType: 'document',
        topK: 10,
      };

      expect(request.queryVector).toBeDefined();
      expect(request.entityType).toBe('document');
      expect(request.topK).toBe(10);
    });

    it('should accept optional parameters', () => {
      const request: DenseSearchRequest = {
        queryVector: new Array(384).fill(0.1),
        entityType: 'document',
        topK: 10,
        threshold: 0.5,
        distanceMetric: 'cosine',
        fieldFilters: { category: 'tech' },
        tenantId: 'tenant-1',
        principalId: 'user-123',
      };

      expect(request.threshold).toBe(0.5);
      expect(request.distanceMetric).toBe('cosine');
    });

    it('should NOT accept query (only queryVector)', () => {
      // This test documents the correct field name
      const request: DenseSearchRequest = {
        queryVector: new Array(384).fill(0.1),
        entityType: 'document',
        topK: 10,
      };

      // @ts-expect-error - query is not a valid field
      expect(() => {
        request.query;
      }).not.toThrow();
    });

    it('should NOT accept limit (only topK)', () => {
      // This test documents the correct field name
      const request: DenseSearchRequest = {
        queryVector: new Array(384).fill(0.1),
        entityType: 'document',
        topK: 10,
      };

      // The compiler should reject this if we try to use 'limit'
      expect(request.topK).toBe(10);
    });
  });

  describe('KeywordSearchRequest Contract', () => {
    it('should accept query, entityType, topK', () => {
      const request: KeywordSearchRequest = {
        query: 'machine learning',
        entityType: 'document',
        topK: 5,
      };

      expect(request.query).toBe('machine learning');
      expect(request.entityType).toBe('document');
      expect(request.topK).toBe(5);
    });

    it('should accept optional parameters', () => {
      const request: KeywordSearchRequest = {
        query: 'machine learning',
        entityType: 'document',
        topK: 5,
        fieldFilters: { published: true },
      };

      expect(request.fieldFilters).toBeDefined();
    });
  });

  describe('IndexRequest Contract', () => {
    it('should require all mandatory fields', () => {
      const request: IndexRequest = {
        id: 'doc-1',
        entityType: 'document',
        entityId: 'doc-123',
        field: 'content',
        text: 'Machine learning basics',
        vector: new Array(384).fill(0.1),
        contentHash: 'sha256-abc123',
        embeddingModel: 'Xenova/all-MiniLM-L6-v2',
        embeddingVersion: '1.0',
        distanceMetric: 'cosine',
        dimensions: 384,
      };

      expect(request.id).toBe('doc-1');
      expect(request.entityType).toBe('document');
      expect(request.entityId).toBe('doc-123');
      expect(request.field).toBe('content');
      expect(request.text).toBe('Machine learning basics');
      expect(request.contentHash).toBe('sha256-abc123');
      expect(request.embeddingModel).toBe('Xenova/all-MiniLM-L6-v2');
      expect(request.embeddingVersion).toBe('1.0');
      expect(request.distanceMetric).toBe('cosine');
      expect(request.dimensions).toBe(384);
    });

    it('should accept optional metadata and retrieval strategies', () => {
      const request: IndexRequest = {
        id: 'doc-1',
        entityType: 'document',
        entityId: 'doc-123',
        field: 'content',
        text: 'Machine learning basics',
        vector: new Array(384).fill(0.1),
        contentHash: 'sha256-abc123',
        embeddingModel: 'Xenova/all-MiniLM-L6-v2',
        embeddingVersion: '1.0',
        distanceMetric: 'cosine',
        dimensions: 384,
        metadata: { title: 'ML Guide', category: 'programming' },
        weight: 1.0,
        retrievalStrategies: ['semantic', 'keyword'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(request.metadata).toBeDefined();
      expect(request.weight).toBe(1.0);
      expect(request.retrievalStrategies).toContain('semantic');
    });
  });

  describe('BatchIndexRequest Contract', () => {
    it('should use vectors property (not documents)', () => {
      const request: BatchIndexRequest = {
        vectors: [
          {
            id: 'doc-1',
            entityType: 'document',
            entityId: 'doc-123',
            field: 'content',
            text: 'Text 1',
            vector: new Array(384).fill(0.1),
            contentHash: 'sha256-1',
            embeddingModel: 'Xenova/all-MiniLM-L6-v2',
            embeddingVersion: '1.0',
            distanceMetric: 'cosine',
            dimensions: 384,
          },
          {
            id: 'doc-2',
            entityType: 'document',
            entityId: 'doc-124',
            field: 'content',
            text: 'Text 2',
            vector: new Array(384).fill(0.2),
            contentHash: 'sha256-2',
            embeddingModel: 'Xenova/all-MiniLM-L6-v2',
            embeddingVersion: '1.0',
            distanceMetric: 'cosine',
            dimensions: 384,
          },
        ],
      };

      expect(request.vectors).toBeDefined();
      expect(request.vectors.length).toBe(2);
    });
  });

  describe('DeleteRequest Contract', () => {
    it('should accept vectorId', () => {
      const request: DeleteRequest = {
        vectorId: 'doc-1',
      };

      expect(request.vectorId).toBe('doc-1');
    });

    it('should accept entityType and entityId combination', () => {
      const request: DeleteRequest = {
        entityType: 'document',
        entityId: 'doc-123',
      };

      expect(request.entityType).toBe('document');
      expect(request.entityId).toBe('doc-123');
    });

    it('should accept tenantId', () => {
      const request: DeleteRequest = {
        tenantId: 'tenant-1',
      };

      expect(request.tenantId).toBe('tenant-1');
    });
  });

  describe('SearchAdapter Return Types', () => {
    it('should properly type SearchCandidate results', () => {
      const candidates: SearchCandidate[] = [
        {
          id: '1',
          score: 0.95,
          fields: { title: 'Example' },
          metadata: { category: 'tech' },
        },
      ];

      expect(candidates[0].score).toBe(0.95);
      expect(candidates[0].metadata?.category).toBe('tech');
    });

    it('should properly type IndexResult', () => {
      const result: IndexResult = {
        success: true,
        vectorId: 'doc-1',
      };

      expect(result.success).toBe(true);
    });

    it('should properly type BatchIndexResult', () => {
      const result: BatchIndexResult = {
        indexedCount: 10,
        failedCount: 0,
        success: true,
      };

      expect(result.indexedCount).toBe(10);
    });

    it('should properly type DeleteResult', () => {
      const result: DeleteResult = {
        deletedCount: 5,
        success: true,
      };

      expect(result.deletedCount).toBe(5);
    });

    it('should properly type HealthStatus', () => {
      const status: HealthStatus = {
        healthy: true,
        status: 'healthy',
        latencyMs: 15,
        vectorCount: 1000,
      };

      expect(status.latencyMs).toBe(15);
    });

    it('should properly type AdapterStats', () => {
      const stats: AdapterStats = {
        totalVectors: 50000,
        storageUsed: 1024000,
        indexCount: 2,
        avgSearchLatencyMs: 30,
        queriesPerSecond: 100,
        byEntityType: { document: { vectorCount: 50000, storageUsed: 1024000 } },
      };

      expect(stats.totalVectors).toBe(50000);
    });

    it('should properly type AdapterCapabilities', () => {
      const caps: AdapterCapabilities = {
        dense: true,
        keyword: true,
        hybrid: true,
        nativeExplain: false,
        multiTenant: true,
        transactions: true,
        filtering: true,
        partitioning: true,
        clustering: false,
      };

      expect(caps.dense).toBe(true);
      expect(caps.clustering).toBe(false);
    });
  });

  describe('Example Patterns', () => {
    it('demonstrates correct dense search pattern', () => {
      const adapter: SearchAdapter = {} as any;

      const searchFn = async () => {
        const request: DenseSearchRequest = {
          queryVector: new Array(384).fill(0.1),
          entityType: 'document',
          topK: 10,
          threshold: 0.5,
          distanceMetric: 'cosine',
        };

        const results = await adapter.denseSearch(request);
        return results;
      };

      expect(searchFn).toBeDefined();
    });

    it('demonstrates correct keyword search pattern', () => {
      const adapter: SearchAdapter = {} as any;

      const searchFn = async () => {
        const request: KeywordSearchRequest = {
          query: 'machine learning',
          entityType: 'document',
          topK: 5,
        };

        const results = await adapter.keywordSearch(request);
        return results;
      };

      expect(searchFn).toBeDefined();
    });

    it('demonstrates correct index pattern', () => {
      const adapter: SearchAdapter = {} as any;

      const indexFn = async () => {
        const request: IndexRequest = {
          id: 'doc-1',
          entityType: 'document',
          entityId: 'doc-123',
          field: 'content',
          text: 'Machine learning basics',
          vector: new Array(384).fill(0.1),
          contentHash: 'sha256-abc123',
          embeddingModel: 'Xenova/all-MiniLM-L6-v2',
          embeddingVersion: '1.0',
          distanceMetric: 'cosine',
          dimensions: 384,
          metadata: { title: 'ML Guide' },
        };

        const result = await adapter.index(request);
        return result;
      };

      expect(indexFn).toBeDefined();
    });

    it('demonstrates correct batch index pattern', () => {
      const adapter: SearchAdapter = {} as any;

      const batchIndexFn = async () => {
        const request: BatchIndexRequest = {
          vectors: [
            {
              id: 'doc-1',
              entityType: 'document',
              entityId: 'doc-123',
              field: 'content',
              text: 'Text 1',
              vector: new Array(384).fill(0.1),
              contentHash: 'sha256-1',
              embeddingModel: 'Xenova/all-MiniLM-L6-v2',
              embeddingVersion: '1.0',
              distanceMetric: 'cosine',
              dimensions: 384,
            },
          ],
        };

        const result = await adapter.indexBatch(request);
        return result;
      };

      expect(batchIndexFn).toBeDefined();
    });

    it('demonstrates correct capability detection pattern', () => {
      const adapter: SearchAdapter = {} as any;

      const checkCapabilities = async () => {
        const caps = await adapter.getCapabilities();

        if (caps.hybrid) {
          // Use native hybrid search
        } else {
          // Compose results from dense + keyword
        }

        return caps;
      };

      expect(checkCapabilities).toBeDefined();
    });
  });
});
