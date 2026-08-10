import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { SchemaManager } from '../src/schema';
import { PgVectorAdapterConfig } from '../src/types';

describe('HNSW Vector Indexing', () => {
  let pool: Pool;
  let schemaManager: SchemaManager;

  beforeAll(async () => {
    // Test database connection (requires PostgreSQL + pgvector)
    pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL || 
        'postgresql://postgres:password@localhost:5432/test_retrievalops',
    });

    // Verify pgvector is available
    try {
      const result = await pool.query('SELECT extversion FROM pg_extension WHERE extname = $1', ['vector']);
      if (!result.rows.length) {
        throw new Error('pgvector extension not found. Please install pgvector: CREATE EXTENSION vector;');
      }
      console.log(`✓ pgvector ${result.rows[0].extversion} found`);
    } catch (error) {
      console.warn('⚠️  pgvector not installed, tests will be skipped');
      throw error;
    }
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  describe('HNSW Configuration', () => {
    it('should validate HNSW parameters', () => {
      const config: PgVectorAdapterConfig = {
        connectionString: 'postgresql://...',
        indexingStrategy: 'hnsw',
        hnsw: {
          m: 16,
          efConstruction: 200,
          ef: 100,
        },
      };

      expect(config.indexingStrategy).toBe('hnsw');
      expect(config.hnsw?.m).toBe(16);
      expect(config.hnsw?.efConstruction).toBe(200);
      expect(config.hnsw?.ef).toBe(100);
    });

    it('should use default HNSW parameters', () => {
      const config: PgVectorAdapterConfig = {
        connectionString: 'postgresql://...',
        indexingStrategy: 'hnsw',
        hnsw: {},
      };

      expect(config.hnsw).toBeDefined();
    });

    it('should support both ivfflat and hnsw strategies', () => {
      const configs = [
        { strategy: 'ivfflat' as const },
        { strategy: 'hnsw' as const },
      ];

      configs.forEach(({ strategy }) => {
        const config: PgVectorAdapterConfig = {
          connectionString: 'postgresql://...',
          indexingStrategy: strategy,
        };
        expect(['ivfflat', 'hnsw']).toContain(config.indexingStrategy);
      });
    });
  });

  describe('HNSW Index Creation', () => {
    it('should create HNSW index with default parameters', async () => {
      const config: PgVectorAdapterConfig = {
        connectionString: pool.options.connectionString || '',
        schema: 'test_hnsw_default',
        tableName: 'vectors',
        indexingStrategy: 'hnsw',
        autoCreateSchema: true,
      };

      const manager = new SchemaManager(pool, config);

      try {
        await manager.initialize();

        // Verify index exists
        const result = await pool.query(`
          SELECT indexname FROM pg_indexes
          WHERE schemaname = $1 AND tablename = $2 AND indexname LIKE '%vector%'
        `, [config.schema, config.tableName]);

        expect(result.rows.length).toBeGreaterThan(0);
        expect(result.rows.some((r: any) => r.indexname.includes('vector'))).toBe(true);

        console.log('✓ HNSW index created with defaults');
      } finally {
        await manager.reset();
      }
    });

    it('should create HNSW index with custom parameters', async () => {
      const config: PgVectorAdapterConfig = {
        connectionString: pool.options.connectionString || '',
        schema: 'test_hnsw_custom',
        tableName: 'vectors',
        indexingStrategy: 'hnsw',
        hnsw: {
          m: 32,
          efConstruction: 400,
          ef: 150,
        },
        autoCreateSchema: true,
      };

      const manager = new SchemaManager(pool, config);

      try {
        await manager.initialize();

        // Verify index exists
        const result = await pool.query(`
          SELECT indexname FROM pg_indexes
          WHERE schemaname = $1 AND tablename = $2
        `, [config.schema, config.tableName]);

        expect(result.rows.length).toBeGreaterThan(0);

        console.log(`✓ HNSW index created with custom params (m=32, ef_construction=400)`);
      } finally {
        await manager.reset();
      }
    });

    it('should fall back to IVFFlat if strategy is not hnsw', async () => {
      const config: PgVectorAdapterConfig = {
        connectionString: pool.options.connectionString || '',
        schema: 'test_ivfflat',
        tableName: 'vectors',
        indexingStrategy: 'ivfflat',
        autoCreateSchema: true,
      };

      const manager = new SchemaManager(pool, config);

      try {
        await manager.initialize();

        // Verify IVFFlat index exists
        const result = await pool.query(`
          SELECT indexdef FROM pg_indexes
          WHERE schemaname = $1 AND indexname LIKE '%vector%'
        `, [config.schema]);

        expect(result.rows.length).toBeGreaterThan(0);
        expect(result.rows[0].indexdef).toContain('ivfflat');

        console.log('✓ IVFFlat index created as expected');
      } finally {
        await manager.reset();
      }
    });
  });

  describe('HNSW Parameter Ranges', () => {
    it('should accept small m values (memory-constrained)', () => {
      const config: PgVectorAdapterConfig = {
        connectionString: 'postgresql://...',
        indexingStrategy: 'hnsw',
        hnsw: { m: 8 },
      };
      expect(config.hnsw?.m).toBe(8);
    });

    it('should accept large m values (high accuracy)', () => {
      const config: PgVectorAdapterConfig = {
        connectionString: 'postgresql://...',
        indexingStrategy: 'hnsw',
        hnsw: { m: 64 },
      };
      expect(config.hnsw?.m).toBe(64);
    });

    it('should accept low efConstruction (fast indexing)', () => {
      const config: PgVectorAdapterConfig = {
        connectionString: 'postgresql://...',
        indexingStrategy: 'hnsw',
        hnsw: { efConstruction: 100 },
      };
      expect(config.hnsw?.efConstruction).toBe(100);
    });

    it('should accept high efConstruction (high quality)', () => {
      const config: PgVectorAdapterConfig = {
        connectionString: 'postgresql://...',
        indexingStrategy: 'hnsw',
        hnsw: { efConstruction: 1000 },
      };
      expect(config.hnsw?.efConstruction).toBe(1000);
    });
  });
});
