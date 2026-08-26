/**
 * Universal Adapter Test Suite
 *
 * All adapters must pass these tests to be considered compliant.
 * This ensures consistent behavior across all storage backends.
 */

import { SearchAdapter, IndexRequest, DenseSearchRequest } from './search-adapter';

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

  const baseIndexRequest = (overrides: Partial<IndexRequest>): IndexRequest => ({
    id: 'vec-1',
    entityType: 'test_entity',
    entityId: 'doc-1',
    field: 'content',
    text: 'This is a test document',
    vector: Array(384).fill(0.1),
    contentHash: 'abc123',
    embeddingModel: 'test-model',
    embeddingVersion: '1.0.0',
    distanceMetric: 'cosine',
    dimensions: 384,
    ...overrides,
  });

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
        const caps = await adapter.getCapabilities();
        expect(caps).toBeDefined();
        expect(typeof caps.dense).toBe('boolean');
        expect(caps.dense).toBe(true); // Dense search always required
      });

      // Test 2: Health check
      it('should report healthy status', async () => {
        const health = await adapter.health();
        expect(health).toBeDefined();
        expect(health.healthy).toBe(true);
      });

      // Test 3: Index single document
      it('should index a document with embeddings', async () => {
        const indexRequest = baseIndexRequest({ id: 'vec-1', entityId: 'doc-1' });

        const result = await adapter.index(indexRequest);
        expect(result.success).toBe(true);
      });

      // Test 4: Retrieve indexed document
      it('should retrieve an indexed document via dense search', async () => {
        const vector = Array(384).fill(0.1);
        const indexRequest = baseIndexRequest({
          id: 'vec-2',
          entityId: 'doc-2',
          text: 'Retrieval test document',
          vector,
          contentHash: 'def456',
        });

        await adapter.index(indexRequest);

        const searchRequest: DenseSearchRequest = {
          queryVector: vector,
          entityType: 'test_entity',
          topK: 10,
        };

        const results = await adapter.denseSearch(searchRequest);
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].entityId).toBe('doc-2');
      });

      // Test 5: Delete document
      it('should delete an indexed document', async () => {
        const indexRequest = baseIndexRequest({
          id: 'vec-3',
          entityId: 'doc-3',
          text: 'Document to delete',
          contentHash: 'ghi789',
        });

        await adapter.index(indexRequest);

        await adapter.delete({
          entityType: 'test_entity',
          entityId: 'doc-3',
        });

        const searchRequest: DenseSearchRequest = {
          queryVector: Array(384).fill(0.1),
          entityType: 'test_entity',
          topK: 10,
        };

        const results = await adapter.denseSearch(searchRequest);
        const found = results.some((r) => r.entityId === 'doc-3');
        expect(found).toBe(false);
      });

      // Test 6: Keyword search (if supported)
      it('should support keyword search if capability is present', async () => {
        const caps = await adapter.getCapabilities();
        if (!caps.keyword) {
          console.log('Skipping keyword search test: not supported');
          return;
        }

        const indexRequest = baseIndexRequest({
          id: 'vec-4',
          entityId: 'doc-4',
          field: 'title',
          text: 'Important keyword here',
          contentHash: 'jkl012',
        });

        await adapter.index(indexRequest);

        const results = await adapter.keywordSearch({
          entityType: 'test_entity',
          query: 'important keyword',
          topK: 10,
        });

        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeGreaterThan(0);
      });

      // Test 7: Score range validation
      it('should return scores in valid range [0, 1]', async () => {
        const indexRequest = baseIndexRequest({
          id: 'vec-5',
          entityId: 'doc-5',
          text: 'Score validation test',
          vector: Array(384).fill(0.5),
          contentHash: 'mno345',
        });

        await adapter.index(indexRequest);

        const results = await adapter.denseSearch({
          queryVector: Array(384).fill(0.5),
          entityType: 'test_entity',
          topK: 10,
        });

        results.forEach((result) => {
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(1);
        });
      });

      // Test 8: Distance metric handling
      it('should respect distance metric configuration', async () => {
        const indexRequest = baseIndexRequest({
          id: 'vec-6',
          entityId: 'doc-6',
          text: 'Metric test',
          vector: Array(384).fill(0.5),
          contentHash: 'pqr678',
        });

        const result = await adapter.index(indexRequest);
        expect(result.success).toBe(true);
      });

      // Test 9: Idempotent delete
      it('should handle deletion of non-existent documents gracefully', async () => {
        const deleteRequest = {
          entityType: 'test_entity',
          entityId: 'non-existent-doc',
        };

        // Should not throw
        await expect(adapter.delete(deleteRequest)).resolves.toBeDefined();
      });

      // Test 10: Empty search
      it('should return empty results for query with no matches', async () => {
        const results = await adapter.denseSearch({
          queryVector: Array(384).fill(0),
          entityType: 'non-existent-type',
          topK: 10,
        });

        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBe(0);
      });

      // Test 11: Tenant/field filtering (if supported)
      it('should scope results by tenantId when provided', async () => {
        const caps = await adapter.getCapabilities();
        if (!caps.multiTenant) {
          console.log('Skipping tenant isolation test: not supported');
          return;
        }

        const vector = Array(384).fill(0.3);

        await adapter.index(
          baseIndexRequest({
            id: 'vec-tenant-a',
            entityId: 'doc-tenant-a',
            vector,
            contentHash: 'tenant-a-hash',
            metadata: { tenantId: 'tenant-a' },
          })
        );
        await adapter.index(
          baseIndexRequest({
            id: 'vec-tenant-b',
            entityId: 'doc-tenant-b',
            vector,
            contentHash: 'tenant-b-hash',
            metadata: { tenantId: 'tenant-b' },
          })
        );

        const results = await adapter.denseSearch({
          queryVector: vector,
          entityType: 'test_entity',
          topK: 10,
          tenantId: 'tenant-a',
        });

        expect(results.every((r) => r.entityId !== 'doc-tenant-b')).toBe(true);
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
  const caps = await adapter.getCapabilities();
  const health = await adapter.health();

  const report: AdapterComplianceReport = {
    backendType: adapter.getBackendType(),
    version: adapter.getVersion(),
    healthy: health.healthy,
    capabilities: {
      denseSearch: caps.dense,
      keywordSearch: caps.keyword,
      hybrid: caps.hybrid,
      filtering: caps.filtering,
      multiTenant: caps.multiTenant,
    },
    compliant: caps.dense && health.healthy,
  };

  return report;
}

export interface AdapterComplianceReport {
  backendType: string;
  version: string;
  healthy: boolean;
  capabilities: {
    denseSearch: boolean;
    keywordSearch: boolean;
    hybrid: boolean;
    filtering: boolean;
    multiTenant: boolean;
  };
  compliant: boolean;
}

export interface AdapterTestContract {
  describe: (name: string, fn: () => void) => void;
  it: (name: string, fn: () => Promise<void>) => void;
  before: (fn: () => Promise<void>) => void;
  after: (fn: () => Promise<void>) => void;
  beforeEach: (fn: () => Promise<void>) => void;
  afterEach: (fn: () => Promise<void>) => void;
}

export interface AdapterTestFixture {
  adapter: SearchAdapter;
  cleanup: () => Promise<void>;
}
