/**
 * PostgreSQL Schema Management for pgvector
 *
 * Handles table creation, indexing, and schema initialization.
 */

import { Pool } from 'pg';
import { PgVectorAdapterConfig } from './types';

export class SchemaManager {
  private pool: Pool;
  private schema: string;
  private tableName: string;
  private config: PgVectorAdapterConfig;

  constructor(pool: Pool, config: PgVectorAdapterConfig) {
    this.pool = pool;
    this.schema = config.schema || 'retrieval_ops';
    this.tableName = config.tableName || 'vectors';
    this.config = config;
  }

  /**
   * Initialize schema and tables.
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Create schema
      await client.query(`
        CREATE SCHEMA IF NOT EXISTS ${this.schema};
      `);

      // Create pgvector extension
      await client.query(`
        CREATE EXTENSION IF NOT EXISTS vector;
      `);

      // Create vectors table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.schema}.${this.tableName} (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          entity_type VARCHAR(255) NOT NULL,
          entity_id VARCHAR(255) NOT NULL,
          field VARCHAR(255) NOT NULL,
          text TEXT,
          vector vector(384),
          content_hash VARCHAR(64) NOT NULL,
          embedding_model VARCHAR(255) NOT NULL,
          embedding_version VARCHAR(20) NOT NULL,
          distance_metric VARCHAR(20) NOT NULL DEFAULT 'cosine',
          dimensions INT NOT NULL DEFAULT 384,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create indexes
      await this.createIndexes(client);

      console.log(`✓ Schema initialized: ${this.schema}.${this.tableName}`);
    } finally {
      client.release();
    }
  }

  /**
   * Create optimized indexes.
   */
  private async createIndexes(client: any): Promise<void> {
    const indexPrefix = `idx_${this.tableName}`;
    const strategy = this.config.indexingStrategy || 'ivfflat';

    // Entity lookup index
    await client.query(`
      CREATE INDEX IF NOT EXISTS ${indexPrefix}_entity
      ON ${this.schema}.${this.tableName} (entity_type, entity_id);
    `);

    // Vector similarity index
    if (strategy === 'hnsw') {
      // HNSW index for cosine distance (v0.2.0+, 4-10x faster)
      const m = this.config.hnsw?.m ?? 16;
      const efConstruction = this.config.hnsw?.efConstruction ?? 200;

      await client.query(`
        CREATE INDEX IF NOT EXISTS ${indexPrefix}_vector_cosine
        ON ${this.schema}.${this.tableName}
        USING hnsw (vector vector_cosine_ops)
        WITH (m = ${m}, ef_construction = ${efConstruction});
      `);

      console.log(`ℹ️  HNSW index created (m=${m}, ef_construction=${efConstruction})`);
    } else {
      // IVFFlat index for cosine distance (v0.1.0, default)
      await client.query(`
        CREATE INDEX IF NOT EXISTS ${indexPrefix}_vector_cosine
        ON ${this.schema}.${this.tableName}
        USING ivfflat (vector vector_cosine_ops)
        WITH (lists = 100);
      `);

      console.log(`ℹ️  IVFFlat index created (strategy=ivfflat)`);
    }

    // Content hash index (for deduplication)
    await client.query(`
      CREATE INDEX IF NOT EXISTS ${indexPrefix}_content_hash
      ON ${this.schema}.${this.tableName} (content_hash);
    `);

    // Field index
    await client.query(`
      CREATE INDEX IF NOT EXISTS ${indexPrefix}_field
      ON ${this.schema}.${this.tableName} (entity_type, field);
    `);

    // Timestamp index
    await client.query(`
      CREATE INDEX IF NOT EXISTS ${indexPrefix}_created_at
      ON ${this.schema}.${this.tableName} (created_at DESC);
    `);
  }

  /**
   * Drop all tables and schema.
   */
  async reset(): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query(`
        DROP TABLE IF EXISTS ${this.schema}.${this.tableName} CASCADE;
      `);

      await client.query(`
        DROP SCHEMA IF EXISTS ${this.schema} CASCADE;
      `);

      console.log(`✓ Schema reset: ${this.schema}`);
    } finally {
      client.release();
    }
  }

  /**
   * Check if table exists.
   */
  async tableExists(): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = $1 AND table_name = $2
        );
      `, [this.schema, this.tableName]);

      return result.rows[0].exists;
    } finally {
      client.release();
    }
  }

  /**
   * Get table statistics.
   */
  async getStats(): Promise<{
    totalRows: number;
    totalSize: string;
    indexSize: string;
  }> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(`
        SELECT
          (SELECT COUNT(*) FROM ${this.schema}.${this.tableName}) as total_rows,
          pg_size_pretty(pg_total_relation_size('${this.schema}.${this.tableName}'::regclass)) as total_size,
          pg_size_pretty(pg_indexes_size('${this.schema}.${this.tableName}'::regclass)) as index_size;
      `);

      return {
        totalRows: result.rows[0].total_rows,
        totalSize: result.rows[0].total_size,
        indexSize: result.rows[0].index_size,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get the full table name with schema.
   */
  getFullTableName(): string {
    return `${this.schema}.${this.tableName}`;
  }
}
