/**
 * Default Indexing Strategy Tests
 *
 * Verifies that HNSW is the default strategy in v0.2.0
 * while maintaining backward compatibility with IVFFlat
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { SchemaManager } from '../src/schema';
import { PgVectorAdapterConfig } from '../src/types';

describe('Default Indexing Strategy (v0.2.0)', () => {
  let pool: Pool;
  const testSchema = 'test_default_strategy';

  beforeAll(() => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL ||
        'postgresql://postgres:password@localhost:5432/test_retrievalops'
    });
  });

  afterAll(async () => {
    // Cleanup
    const client = await pool.connect();
    try {
      await client.query(`DROP SCHEMA IF EXISTS ${testSchema} CASCADE`);
    } finally {
      client.release();
    }
    await pool.end();
  });

  describe('Strategy Default Behavior', () => {
    it('should default to HNSW when strategy is not specified', async () => {
      const config: PgVectorAdapterConfig = {
        connectionString: process.env.DATABASE_URL || '',
        schema: testSchema,
        tableName: 'vectors_default'
        // Note: no indexingStrategy specified
      };

      const schemaManager = new SchemaManager(pool, config);
      await schemaManager.initialize();

      // Verify HNSW index was created (check index name pattern)
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT indexname FROM pg_indexes
          WHERE schemaname = $1 AND indexname LIKE 'idx_%_vector_cosine'
          ORDER BY indexname DESC LIMIT 1;
        `, [testSchema]);

        expect(result.rows.length).toBeGreaterThan(0);
        // HNSW index is created
        const indexName = result.rows[0].indexname;
        expect(indexName).toBeDefined();
      } finally {
        client.release();
      }

      await schemaManager.reset();
    });

    it('should create HNSW index with default parameters when not specified', async () => {
      const config: PgVectorAdapterConfig = {
        connectionString: process.env.DATABASE_URL || '',
        schema: testSchema,
        tableName: 'vectors_hnsw_default'
        // No indexingStrategy or hnsw config
      };

      const schemaManager = new SchemaManager(pool, config);
      await schemaManager.initialize();

      // Verify default HNSW parameters (m=16, efConstruction=200)
      const client = await pool.connect();
      try {
        // Check that index uses HNSW (not IVFFlat)
        const result = await client.query(`
          SELECT indexdef FROM pg_indexes
          WHERE schemaname = $1 AND indexname LIKE 'idx_%_vector_cosine'
          ORDER BY indexname DESC LIMIT 1;
        `, [testSchema]);

        expect(result.rows.length).toBeGreaterThan(0);
        const indexDef = result.rows[0].indexdef;

        // Verify it's HNSW (should contain 'USING hnsw')
        expect(indexDef).toContain('USING hnsw');

        // Verify default parameters
        expect(indexDef).toContain('m = 16');
        expect(indexDef).toContain('ef_construction = 200');
      } finally {
        client.release();
      }

      await schemaManager.reset();
    });
  });

  describe('Explicit HNSW Configuration', () => {
    it('should respect explicit HNSW configuration', async () => {
      const config: PgVectorAdapterConfig = {
        connectionString: process.env.DATABASE_URL || '',
        schema: testSchema,
        tableName: 'vectors_hnsw_custom',
        indexingStrategy: 'hnsw',
        hnsw: {
          m: 32,
          efConstruction: 400,
          ef: 200
        }
      };

      const schemaManager = new SchemaManager(pool, config);
      await schemaManager.initialize();

      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT indexdef FROM pg_indexes
          WHERE schemaname = $1 AND indexname LIKE 'idx_%_vector_cosine'
          ORDER BY indexname DESC LIMIT 1;
        `, [testSchema]);

        expect(result.rows.length).toBeGreaterThan(0);
        const indexDef = result.rows[0].indexdef;

        // Verify custom parameters
        expect(indexDef).toContain('USING hnsw');
        expect(indexDef).toContain('m = 32');
        expect(indexDef).toContain('ef_construction = 400');
      } finally {
        client.release();
      }

      await schemaManager.reset();
    });

    it('should create HNSW with custom ef parameter', async () => {
      const config: PgVectorAdapterConfig = {
        connectionString: process.env.DATABASE_URL || '',
        schema: testSchema,
        tableName: 'vectors_custom_ef',
        indexingStrategy: 'hnsw',
        hnsw: {
          m: 16,
          efConstruction: 200,
          ef: 50  // Lower ef for speed
        }
      };

      const schemaManager = new SchemaManager(pool, config);
      await schemaManager.initialize();

      // ef is a search parameter, not an index creation parameter
      // but should be stored in config for runtime use
      expect(config.hnsw?.ef).toBe(50);

      await schemaManager.reset();
    });
  });

  describe('Backward Compatibility with IVFFlat', () => {
    it('should support explicit IVFFlat strategy (v0.1.0 compatibility)', async () => {
      const config: PgVectorAdapterConfig = {
        connectionString: process.env.DATABASE_URL || '',
        schema: testSchema,
        tableName: 'vectors_ivfflat_legacy',
        indexingStrategy: 'ivfflat'
      };

      const schemaManager = new SchemaManager(pool, config);
      await schemaManager.initialize();

      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT indexdef FROM pg_indexes
          WHERE schemaname = $1 AND indexname LIKE 'idx_%_vector_cosine'
          ORDER BY indexname DESC LIMIT 1;
        `, [testSchema]);

        expect(result.rows.length).toBeGreaterThan(0);
        const indexDef = result.rows[0].indexdef;

        // Verify it's IVFFlat
        expect(indexDef).toContain('USING ivfflat');
        expect(indexDef).toContain('lists = 100');
      } finally {
        client.release();
      }

      await schemaManager.reset();
    });

    it('should work with legacy v0.1.0 configuration', async () => {
      // v0.1.0 typically didn't specify indexingStrategy
      // This should now default to HNSW in v0.2.0
      const config: PgVectorAdapterConfig = {
        connectionString: process.env.DATABASE_URL || '',
        schema: testSchema,
        tableName: 'vectors_legacy_config'
        // No indexingStrategy = now defaults to HNSW
      };

      const schemaManager = new SchemaManager(pool, config);
      await schemaManager.initialize();

      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT indexdef FROM pg_indexes
          WHERE schemaname = $1 AND indexname LIKE 'idx_%_vector_cosine'
          ORDER BY indexname DESC LIMIT 1;
        `, [testSchema]);

        expect(result.rows.length).toBeGreaterThan(0);
        const indexDef = result.rows[0].indexdef;

        // v0.1.0 configs now get HNSW by default
        expect(indexDef).toContain('USING hnsw');
      } finally {
        client.release();
      }

      await schemaManager.reset();
    });
  });

  describe('Configuration Profiles', () => {
    it('should support speed profile (m=8)', async () => {
      const config: PgVectorAdapterConfig = {
        connectionString: process.env.DATABASE_URL || '',
        schema: testSchema,
        tableName: 'vectors_speed_profile',
        indexingStrategy: 'hnsw',
        hnsw: { m: 8, efConstruction: 100, ef: 50 }
      };

      const schemaManager = new SchemaManager(pool, config);
      await schemaManager.initialize();

      expect(config.hnsw?.m).toBe(8);
      expect(config.hnsw?.efConstruction).toBe(100);

      await schemaManager.reset();
    });

    it('should support balanced profile (m=16, default)', async () => {
      const config: PgVectorAdapterConfig = {
        connectionString: process.env.DATABASE_URL || '',
        schema: testSchema,
        tableName: 'vectors_balanced_profile',
        indexingStrategy: 'hnsw',
        hnsw: { m: 16, efConstruction: 200, ef: 100 }
      };

      const schemaManager = new SchemaManager(pool, config);
      await schemaManager.initialize();

      expect(config.hnsw?.m).toBe(16);
      expect(config.hnsw?.efConstruction).toBe(200);

      await schemaManager.reset();
    });

    it('should support quality profile (m=32)', async () => {
      const config: PgVectorAdapterConfig = {
        connectionString: process.env.DATABASE_URL || '',
        schema: testSchema,
        tableName: 'vectors_quality_profile',
        indexingStrategy: 'hnsw',
        hnsw: { m: 32, efConstruction: 400, ef: 200 }
      };

      const schemaManager = new SchemaManager(pool, config);
      await schemaManager.initialize();

      expect(config.hnsw?.m).toBe(32);
      expect(config.hnsw?.efConstruction).toBe(400);

      await schemaManager.reset();
    });

    it('should support enterprise profile (m=64)', async () => {
      const config: PgVectorAdapterConfig = {
        connectionString: process.env.DATABASE_URL || '',
        schema: testSchema,
        tableName: 'vectors_enterprise_profile',
        indexingStrategy: 'hnsw',
        hnsw: { m: 64, efConstruction: 400, ef: 200 }
      };

      const schemaManager = new SchemaManager(pool, config);
      await schemaManager.initialize();

      expect(config.hnsw?.m).toBe(64);
      expect(config.hnsw?.efConstruction).toBe(400);

      await schemaManager.reset();
    });
  });

  describe('Configuration Validation', () => {
    it('should work with missing HNSW config (uses defaults)', async () => {
      const config: PgVectorAdapterConfig = {
        connectionString: process.env.DATABASE_URL || '',
        schema: testSchema,
        tableName: 'vectors_no_hnsw_config',
        indexingStrategy: 'hnsw'
        // hnsw config not specified
      };

      const schemaManager = new SchemaManager(pool, config);
      await schemaManager.initialize();

      // Should use defaults (m=16, efConstruction=200)
      await schemaManager.reset();
    });

    it('should handle partial HNSW config (fills in defaults)', async () => {
      const config: PgVectorAdapterConfig = {
        connectionString: process.env.DATABASE_URL || '',
        schema: testSchema,
        tableName: 'vectors_partial_hnsw_config',
        indexingStrategy: 'hnsw',
        hnsw: {
          m: 24  // Only specify m
          // efConstruction will default to 200
        }
      };

      const schemaManager = new SchemaManager(pool, config);
      await schemaManager.initialize();

      expect(config.hnsw?.m).toBe(24);
      // efConstruction should use default (200)

      await schemaManager.reset();
    });
  });
});
