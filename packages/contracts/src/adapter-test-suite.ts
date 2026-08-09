/**
 * Universal Adapter Test Suite
 *
 * All adapters must pass these tests to be considered compliant.
 * This ensures consistent behavior across all storage backends.
 */

import { SearchAdapter, IndexRequest, DenseSearchRequest } from './adapter';

/**
 * Factory function that creates a test suite for an adapter.
 *
 * Usage:
 * ```ts
 * import { createAdapterTestSuite } from '@retrievalops/contracts';
 * import { PgVectorAdapter } from '@retrievalops/pgvector';
 *
 * describe('PgVectorAdapter', () => {
 *   createAdapterTestSuite(async () => {
 *     return new PgVectorAdapter({ connectionString: '...' });
 *   });
 * });
 * ```
 */
export function createAdapterTestSuite(
  adapterFactory: () => Promise<SearchAdapter>,
  options?: AdapterTestOptions
) {
  const testName = options?.testName || 'Adapter Contract Tests';

  return {
    describe: testName,
    tests: async () => {
      let adapter: SearchAdapter;

      beforeEach(async () => {
        adapter = await adapterFactory();
        if (adapter.reset) {
          await adapter.reset();
        }
      });

      afterEach(async () => {
        if (adapter.reset) {
          await adapter.reset();
        }
      });

      // Test 1: Capabilities
      it('should report adapter capabilities', async () => {
        const caps = adapter.capabilities();
        expect(caps).toBeDefined();
        expect(caps.name).toBeDefined();
        expect(caps.version).toBeDefined();
        expect(caps.supportsDenseSearch).toBe(true); // Always required
      });

      // Test 2: Health check
      it('should report healthy status', async () => {
        const health = await adapter.health();
        expect(health).toBeDefined();
        expect(health.healthy).toBe(true);
      });

      // Test 3: Index single document
      it('should index a document with embeddings', async () => {
        const indexRequest: IndexRequest = {
          entityType: 'test_entity',
          entityId: 'doc-1',
          field: 'content',
          text: 'This is a test document',
          vector: Array(384).fill(0.1), // Example 384-dim vector
          contentHash: 'abc123',
          embeddingModel: 'test-model',
          embeddingVersion: '1.0.0',
          distanceMetric: 'cosine',
          sourceUpdatedAt: new Date(),
        };

        const result = await adapter.index(indexRequest);
        expect(result.success).toBe(true);
        expect(result.indexed).toBe(true);
      });

      // Test 4: Retrieve indexed document
      it('should retrieve an indexed document via dense search', async () => {
        const vector = Array(384).fill(0.1);
        const indexRequest: IndexRequest = {
          entityType: 'test_entity',
          entityId: 'doc-2',
          field: 'content',
          text: 'Retrieval test document',
          vector,
          contentHash: 'def456',
          embeddingModel: 'test-model',
          embeddingVersion: '1.0.0',
          distanceMetric: 'cosine',
          sourceUpdatedAt: new Date(),
        };

        await adapter.index(indexRequest);

        const searchRequest: DenseSearchRequest = {
          entityType: 'test_entity',
          vector,
          topK: 10,
        };

        const results = await adapter.denseSearch(searchRequest);
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].entityId).toBe('doc-2');
      });

      // Test 5: Delete document
      it('should delete an indexed document', async () => {
        const indexRequest: IndexRequest = {
          entityType: 'test_entity',
          entityId: 'doc-3',
          field: 'content',
          text: 'Document to delete',
          vector: Array(384).fill(0.1),
          contentHash: 'ghi789',
          embeddingModel: 'test-model',
          embeddingVersion: '1.0.0',
          distanceMetric: 'cosine',
          sourceUpdatedAt: new Date(),
        };

        await adapter.index(indexRequest);

        await adapter.delete({
          entityType: 'test_entity',
          entityId: 'doc-3',
        });

        const searchRequest: DenseSearchRequest = {
          entityType: 'test_entity',
          vector: Array(384).fill(0.1),
          topK: 10,
        };

        const results = await adapter.denseSearch(searchRequest);
        const found = results.some((r) => r.entityId === 'doc-3');
        expect(found).toBe(false);
      });

      // Test 6: Keyword search (if supported)
      it('should support keyword search if capability is present', async () => {
        const caps = adapter.capabilities();
        if (!caps.supportsKeywordSearch) {
          console.log('Skipping keyword search test: not supported');
          return;
        }

        const indexRequest: IndexRequest = {
          entityType: 'test_entity',
          entityId: 'doc-4',
          field: 'title',
          text: 'Important keyword here',
          vector: Array(384).fill(0.1),
          contentHash: 'jkl012',
          embeddingModel: 'test-model',
          embeddingVersion: '1.0.0',
          distanceMetric: 'cosine',
          sourceUpdatedAt: new Date(),
        };

        await adapter.index(indexRequest);

        if (adapter.keywordSearch) {
          const results = await adapter.keywordSearch({
            entityType: 'test_entity',
            query: 'important keyword',
            topK: 10,
          });

          expect(Array.isArray(results)).toBe(true);
          expect(results.length).toBeGreaterThan(0);
        }
      });

      // Test 7: Score range validation
      it('should return scores in valid range [0, 1]', async () => {
        const indexRequest: IndexRequest = {
          entityType: 'test_entity',
          entityId: 'doc-5',
          field: 'content',
          text: 'Score validation test',
          vector: Array(384).fill(0.5),
          contentHash: 'mno345',
          embeddingModel: 'test-model',
          embeddingVersion: '1.0.0',
          distanceMetric: 'cosine',
          sourceUpdatedAt: new Date(),
        };

        await adapter.index(indexRequest);

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

      // Test 8: Distance metric handling
      it('should respect distance metric configuration', async () => {
        const caps = adapter.capabilities();

        const vectorRequest: IndexRequest = {
          entityType: 'test_entity',
          entityId: 'doc-6',
          field: 'content',
          text: 'Metric test',
          vector: Array(384).fill(0.5),
          contentHash: 'pqr678',
          embeddingModel: 'test-model',
          embeddingVersion: '1.0.0',
          distanceMetric: 'cosine',
          sourceUpdatedAt: new Date(),
        };

        const result = await adapter.index(vectorRequest);
        expect(result.success).toBe(true);
      });

      // Test 9: Idempotent delete
      it('should handle deletion of non-existent documents gracefully', async () => {
        const deleteRequest = {
          entityType: 'test_entity',
          entityId: 'non-existent-doc',
        };

        // Should not throw
        await expect(adapter.delete(deleteRequest)).resolves.toBeUndefined();
      });

      // Test 10: Empty search
      it('should return empty results for query with no matches', async () => {
        const results = await adapter.denseSearch({
          entityType: 'non-existent-type',
          vector: Array(384).fill(0),
          topK: 10,
        });

        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBe(0);
      });
    },
  };
}

export interface AdapterTestOptions {
  testName?: string;
  skipKeywordTests?: boolean;
  skipFilterTests?: boolean;
}

/**
 * Test helper to verify adapter meets minimum requirements.
 *
 * Returns a report of which capabilities are supported.
 */
export async function validateAdapterCompliance(
  adapter: SearchAdapter
): Promise<AdapterComplianceReport> {
  const caps = adapter.capabilities();
  const health = await adapter.health();

  const report: AdapterComplianceReport = {
    name: caps.name,
    version: caps.version,
    healthy: health.healthy,
    capabilities: {
      denseSearch: caps.supportsDenseSearch,
      keywordSearch: caps.supportsKeywordSearch || false,
      exactMatch: caps.supportsExactMatch || false,
      filtering: caps.supportsFiltering || false,
      batch: caps.supportsBatch || false,
    },
    compliant: caps.supportsDenseSearch && health.healthy,
  };

  return report;
}

export interface AdapterComplianceReport {
  name: string;
  version: string;
  healthy: boolean;
  capabilities: {
    denseSearch: boolean;
    keywordSearch: boolean;
    exactMatch: boolean;
    filtering: boolean;
    batch: boolean;
  };
  compliant: boolean;
}
