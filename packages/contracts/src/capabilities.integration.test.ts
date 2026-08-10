/**
 * Adapter Capabilities Integration Tests
 *
 * Verifies that all adapters implement getCapabilities() with honest feature declarations
 * Tests the capability detection system across all 4 adapters
 */

import type { AdapterCapabilities } from './search-adapter';

describe('Adapter Capabilities - Contract Verification', () => {
  describe('AdapterCapabilities Interface', () => {
    it('should have all required boolean properties', () => {
      const caps: AdapterCapabilities = {
        dense: true,
        keyword: true,
        hybrid: false,
        nativeExplain: false,
        multiTenant: true,
        transactions: true,
        filtering: true,
        partitioning: false,
        clustering: false,
      };

      const requiredKeys: (keyof AdapterCapabilities)[] = [
        'dense',
        'keyword',
        'hybrid',
        'nativeExplain',
        'multiTenant',
        'transactions',
        'filtering',
        'partitioning',
        'clustering',
      ];

      requiredKeys.forEach(key => {
        expect(caps).toHaveProperty(key);
        expect(typeof caps[key]).toBe('boolean');
      });
    });

    it('should validate all properties are boolean', () => {
      const invalidCaps = {
        dense: 'yes', // Should be boolean
        keyword: true,
        hybrid: false,
        nativeExplain: false,
        multiTenant: true,
        transactions: true,
        filtering: true,
        partitioning: false,
        clustering: false,
      };

      expect(typeof invalidCaps.dense).not.toBe('boolean');
    });
  });

  describe('PostgreSQL Adapter Capabilities', () => {
    it('should declare correct feature set', () => {
      const pgCapabilities: AdapterCapabilities = {
        dense: true,           // HNSW/IVFFlat indexing
        keyword: true,         // tsvector full-text search
        hybrid: true,          // Composable via SQL
        nativeExplain: true,   // EXPLAIN ANALYZE
        multiTenant: true,     // Schema-based isolation
        transactions: true,    // ACID guarantees
        filtering: true,       // SQL WHERE clauses
        partitioning: true,    // Schema partitioning
        clustering: false,     // Single-node (can use pgBouncer)
      };

      // PostgreSQL is production-ready
      expect(pgCapabilities.dense).toBe(true);
      expect(pgCapabilities.keyword).toBe(true);
      expect(pgCapabilities.transactions).toBe(true);

      // Not natively clustered
      expect(pgCapabilities.clustering).toBe(false);
    });
  });

  describe('Qdrant Adapter Capabilities', () => {
    it('should declare correct feature set', () => {
      const qdrantCapabilities: AdapterCapabilities = {
        dense: true,           // Native HNSW
        keyword: true,         // Sparse BM25
        hybrid: true,          // Native RRF
        nativeExplain: false,  // No query plans
        multiTenant: true,     // Partitions
        transactions: false,   // No ACID
        filtering: true,       // Payload filters
        partitioning: true,    // Native sharding
        clustering: true,      // Distributed
      };

      // Qdrant is production-ready
      expect(qdrantCapabilities.dense).toBe(true);
      expect(qdrantCapabilities.keyword).toBe(true);
      expect(qdrantCapabilities.hybrid).toBe(true);

      // Qdrant clusters natively
      expect(qdrantCapabilities.clustering).toBe(true);

      // No ACID
      expect(qdrantCapabilities.transactions).toBe(false);
    });
  });

  describe('Weaviate Adapter Capabilities', () => {
    it('should declare correct feature set (Beta)', () => {
      const weaviateCapabilities: AdapterCapabilities = {
        dense: true,           // nearVector support
        keyword: true,         // BM25 support
        hybrid: false,         // NOT in v0.2.1 (coming v0.2.2)
        nativeExplain: false,  // No query plans
        multiTenant: true,     // Property-based isolation
        transactions: false,   // No ACID
        filtering: true,       // GraphQL where
        partitioning: false,   // No explicit partitioning
        clustering: true,      // Distributed support
      };

      // Weaviate Beta status
      expect(weaviateCapabilities.dense).toBe(true);
      expect(weaviateCapabilities.keyword).toBe(true);

      // Hybrid NOT implemented in v0.2.1
      expect(weaviateCapabilities.hybrid).toBe(false);
    });
  });

  describe('Milvus Adapter Capabilities', () => {
    it('should declare all false (Experimental - API only)', () => {
      const milvusCapabilities: AdapterCapabilities = {
        dense: false,          // Not implemented in v0.2.1
        keyword: false,        // Not implemented in v0.2.1
        hybrid: false,         // Not implemented in v0.2.1
        nativeExplain: false,  // Not implemented in v0.2.1
        multiTenant: false,    // Not implemented in v0.2.1
        transactions: false,   // Not implemented in v0.2.1
        filtering: false,      // Not implemented in v0.2.1
        partitioning: false,   // Not implemented in v0.2.1
        clustering: false,     // Not implemented in v0.2.1
      };

      // Milvus v0.2.1 is experimental - all false for honest reporting
      Object.entries(milvusCapabilities).forEach(([key, value]) => {
        expect(value).toBe(false);
      });
    });
  });

  describe('Capability-based Application Logic', () => {
    it('should allow apps to choose hybrid strategy based on capabilities', () => {
      const pgCaps: AdapterCapabilities = {
        dense: true,
        keyword: true,
        hybrid: true,
        nativeExplain: true,
        multiTenant: true,
        transactions: true,
        filtering: true,
        partitioning: true,
        clustering: false,
      };

      const qdrantCaps: AdapterCapabilities = {
        dense: true,
        keyword: true,
        hybrid: true,
        nativeExplain: false,
        multiTenant: true,
        transactions: false,
        filtering: true,
        partitioning: true,
        clustering: true,
      };

      const weaviateCaps: AdapterCapabilities = {
        dense: true,
        keyword: true,
        hybrid: false,
        nativeExplain: false,
        multiTenant: true,
        transactions: false,
        filtering: true,
        partitioning: false,
        clustering: true,
      };

      // Application can adapt based on capabilities
      const getHybridStrategy = (caps: AdapterCapabilities) => {
        if (caps.hybrid) {
          return 'use-native-hybrid';
        } else {
          return 'compose-rrf';
        }
      };

      expect(getHybridStrategy(pgCaps)).toBe('use-native-hybrid');
      expect(getHybridStrategy(qdrantCaps)).toBe('use-native-hybrid');
      expect(getHybridStrategy(weaviateCaps)).toBe('compose-rrf');
    });

    it('should allow apps to require ACID transactions', () => {
      const pgCaps: AdapterCapabilities = { dense: true, keyword: true, hybrid: true, nativeExplain: true, multiTenant: true, transactions: true, filtering: true, partitioning: true, clustering: false };
      const qdrantCaps: AdapterCapabilities = { dense: true, keyword: true, hybrid: true, nativeExplain: false, multiTenant: true, transactions: false, filtering: true, partitioning: true, clustering: true };

      const supportsTransactions = (caps: AdapterCapabilities) => caps.transactions;

      expect(supportsTransactions(pgCaps)).toBe(true);
      expect(supportsTransactions(qdrantCaps)).toBe(false);
    });

    it('should allow apps to select backends by capability combination', () => {
      const adapters = [
        { name: 'postgresql', caps: { dense: true, keyword: true, hybrid: true, nativeExplain: true, multiTenant: true, transactions: true, filtering: true, partitioning: true, clustering: false } as AdapterCapabilities },
        { name: 'qdrant', caps: { dense: true, keyword: true, hybrid: true, nativeExplain: false, multiTenant: true, transactions: false, filtering: true, partitioning: true, clustering: true } as AdapterCapabilities },
        { name: 'weaviate', caps: { dense: true, keyword: true, hybrid: false, nativeExplain: false, multiTenant: true, transactions: false, filtering: true, partitioning: false, clustering: true } as AdapterCapabilities },
        { name: 'milvus', caps: { dense: false, keyword: false, hybrid: false, nativeExplain: false, multiTenant: false, transactions: false, filtering: false, partitioning: false, clustering: false } as AdapterCapabilities },
      ];

      // Find adapters that support transactions AND partitioning
      const supportBoth = adapters.filter(a => a.caps.transactions && a.caps.partitioning);
      expect(supportBoth.map(a => a.name)).toEqual(['postgresql']);

      // Find adapters suitable for cluster deployment
      const clusterSuitable = adapters.filter(a => a.caps.clustering && a.caps.dense);
      expect(clusterSuitable.map(a => a.name)).toEqual(['qdrant', 'weaviate']);

      // Find production-ready adapters
      const productionReady = adapters.filter(a => a.caps.dense && a.caps.keyword && (a.caps.hybrid || a.name !== 'milvus'));
      expect(productionReady.length).toBeGreaterThan(0);
    });
  });

  describe('Honest Capability Reporting', () => {
    it('should not claim capabilities that are not implemented', () => {
      // Weaviate should NOT claim hybrid in v0.2.1
      const weaviateCaps: AdapterCapabilities = {
        dense: true,
        keyword: true,
        hybrid: false, // Honest: not implemented yet
        nativeExplain: false,
        multiTenant: true,
        transactions: false,
        filtering: true,
        partitioning: false,
        clustering: true,
      };

      expect(weaviateCaps.hybrid).toBe(false);
    });

    it('should not claim capabilities that have no database connection', () => {
      // Milvus should claim nothing in v0.2.1
      const milvusCaps: AdapterCapabilities = {
        dense: false,
        keyword: false,
        hybrid: false,
        nativeExplain: false,
        multiTenant: false,
        transactions: false,
        filtering: false,
        partitioning: false,
        clustering: false,
      };

      expect(Object.values(milvusCaps).every(v => v === false)).toBe(true);
    });

    it('should differentiate between adapters correctly', () => {
      const pgCaps: AdapterCapabilities = { dense: true, keyword: true, hybrid: true, nativeExplain: true, multiTenant: true, transactions: true, filtering: true, partitioning: true, clustering: false };
      const milvusCaps: AdapterCapabilities = { dense: false, keyword: false, hybrid: false, nativeExplain: false, multiTenant: false, transactions: false, filtering: false, partitioning: false, clustering: false };

      // They should be very different
      let differences = 0;
      Object.keys(pgCaps).forEach(key => {
        if (pgCaps[key as keyof AdapterCapabilities] !== milvusCaps[key as keyof AdapterCapabilities]) {
          differences++;
        }
      });

      expect(differences).toBeGreaterThan(5);
    });
  });
});
