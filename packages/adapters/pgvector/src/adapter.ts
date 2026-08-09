/**
 * PgVector Adapter
 *
 * PostgreSQL + pgvector implementation of the SearchAdapter interface.
 * Provides dense vector search and full-text keyword search capabilities.
 */

import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import type {
  SearchAdapter,
  AdapterCapabilities,
  AdapterHealth,
  SearchCandidate,
} from '@retrievalops/contracts';
import { PgVectorAdapterConfig, VectorRecord, SearchOptions } from './types';
import { SchemaManager } from './schema';

export interface IndexRequest {
  entityType: string;
  entityId: string;
  field: string;
  text: string;
  vector: number[];
  contentHash: string;
  embeddingModel: string;
  embeddingVersion: string;
  distanceMetric: 'cosine' | 'dot' | 'euclidean';
  sourceUpdatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface IndexResult {
  success: boolean;
  indexed: boolean;
  error?: string;
}

export interface DenseSearchRequest {
  entityType: string;
  vector: number[];
  topK: number;
  filter?: Record<string, unknown>;
  distanceMetric?: 'cosine' | 'dot' | 'euclidean';
}

export class PgVectorAdapter implements SearchAdapter {
  private pool: Pool;
  private schema: SchemaManager;
  private config: PgVectorAdapterConfig;
  private initialized: boolean = false;

  constructor(config: PgVectorAdapterConfig) {
    this.config = {
      schema: 'retrieval_ops',
      tableName: 'vectors',
      maxDimensions: 3000,
      autoCreateSchema: true,
      pool: {
        min: 2,
        max: 10,
        idleTimeoutMillis: 30000,
      },
      ...config,
    };

    this.pool = new Pool({
      connectionString: this.config.connectionString,
      min: this.config.pool?.min,
      max: this.config.pool?.max,
      idleTimeoutMillis: this.config.pool?.idleTimeoutMillis,
    });

    this.schema = new SchemaManager(this.pool, this.config);
  }

  /**
   * Initialize the adapter (create schema, tables, indexes).
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.config.autoCreateSchema) {
      await this.schema.initialize();
    }

    this.initialized = true;
  }

  /**
   * Report adapter capabilities.
   */
  capabilities(): AdapterCapabilities {
    return {
      name: 'PgVectorAdapter',
      version: '0.1.0',
      supportsDenseSearch: true,
      supportsKeywordSearch: true,
      supportsExactMatch: false,
      supportsFiltering: true,
      supportsBatch: false,
      maxBatchSize: 1,
    };
  }

  /**
   * Index a document with embeddings.
   */
  async index(request: IndexRequest): Promise<IndexResult> {
    try {
      await this.initialize();

      // Validate vector dimensions
      if (request.vector.length > (this.config.maxDimensions || 3000)) {
        return {
          success: false,
          indexed: false,
          error: `Vector dimension ${request.vector.length} exceeds maximum ${this.config.maxDimensions}`,
        };
      }

      const client = await this.pool.connect();

      try {
        // Check if content already indexed (deduplication)
        const existing = await client.query(
          `SELECT id FROM ${this.schema.getFullTableName()}
           WHERE content_hash = $1 AND entity_type = $2 AND field = $3`,
          [request.contentHash, request.entityType, request.field]
        );

        if (existing.rows.length > 0) {
          // Update existing record
          await client.query(
            `UPDATE ${this.schema.getFullTableName()}
             SET text = $1, vector = $2, updated_at = NOW(), metadata = $3
             WHERE id = $4`,
            [
              request.text,
              `[${request.vector.join(',')}]`,
              JSON.stringify(request.metadata),
              existing.rows[0].id,
            ]
          );

          return { success: true, indexed: true };
        }

        // Insert new record
        await client.query(
          `INSERT INTO ${this.schema.getFullTableName()}
           (id, entity_type, entity_id, field, text, vector, content_hash,
            embedding_model, embedding_version, distance_metric, dimensions, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            uuidv4(),
            request.entityType,
            request.entityId,
            request.field,
            request.text,
            `[${request.vector.join(',')}]`,
            request.contentHash,
            request.embeddingModel,
            request.embeddingVersion,
            request.distanceMetric,
            request.vector.length,
            JSON.stringify(request.metadata),
          ]
        );

        return { success: true, indexed: true };
      } finally {
        client.release();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, indexed: false, error: message };
    }
  }

  /**
   * Dense vector search (semantic similarity).
   */
  async denseSearch(request: DenseSearchRequest): Promise<SearchCandidate[]> {
    try {
      await this.initialize();

      const client = await this.pool.connect();

      try {
        const metric = request.distanceMetric || 'cosine';
        const operator = this.getDistanceOperator(metric);

        const query = `
          SELECT
            entity_id,
            field,
            text,
            ${this.getScoreExpression(metric, request.vector)} as score,
            embedding_model,
            embedding_version,
            metadata
          FROM ${this.schema.getFullTableName()}
          WHERE entity_type = $1
          ORDER BY ${this.getOrderExpression(metric, request.vector)}
          LIMIT $2
        `;

        const result = await client.query(query, [
          request.entityType,
          request.topK,
        ]);

        return result.rows.map((row: any) => ({
          entityId: row.entity_id,
          field: row.field,
          score: this.normalizeScore(row.score, metric),
          metadata: row.metadata,
        }));
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Dense search error:', error);
      return [];
    }
  }

  /**
   * Keyword search using PostgreSQL full-text search.
   */
  async keywordSearch(request: DenseSearchRequest): Promise<SearchCandidate[]> {
    try {
      await this.initialize();

      const client = await this.pool.connect();

      try {
        const query = `
          SELECT
            entity_id,
            field,
            text,
            ts_rank(to_tsvector('english', COALESCE(text, '')),
                   plainto_tsquery('english', $2)) as score,
            metadata
          FROM ${this.schema.getFullTableName()}
          WHERE entity_type = $1
            AND to_tsvector('english', COALESCE(text, '')) @@
                plainto_tsquery('english', $2)
          ORDER BY score DESC
          LIMIT $3
        `;

        const result = await client.query(query, [
          request.entityType,
          request.vector.toString(), // Query text
          request.topK,
        ]);

        return result.rows.map((row: any) => ({
          entityId: row.entity_id,
          field: row.field,
          score: Math.min(row.score, 1.0), // Normalize to [0, 1]
          metadata: row.metadata,
        }));
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Keyword search error:', error);
      return [];
    }
  }

  /**
   * Delete a document.
   */
  async delete(request: { entityType: string; entityId: string }): Promise<void> {
    try {
      await this.initialize();

      const client = await this.pool.connect();

      try {
        await client.query(
          `DELETE FROM ${this.schema.getFullTableName()}
           WHERE entity_type = $1 AND entity_id = $2`,
          [request.entityType, request.entityId]
        );
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  }

  /**
   * Check adapter health.
   */
  async health(): Promise<AdapterHealth> {
    try {
      await this.initialize();

      const client = await this.pool.connect();

      try {
        const result = await client.query('SELECT 1');
        const tableExists = await this.schema.tableExists();

        return {
          healthy: result.rows.length > 0 && tableExists,
          message: 'Database connection OK',
        };
      } finally {
        client.release();
      }
    } catch (error) {
      return {
        healthy: false,
        message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Reset the adapter (drop schema).
   */
  async reset(): Promise<void> {
    await this.schema.reset();
    this.initialized = false;
  }

  /**
   * Shutdown the adapter (close pool).
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  // Helper methods

  private getDistanceOperator(metric: string): string {
    switch (metric) {
      case 'dot':
        return '<#>';
      case 'euclidean':
        return '<->';
      case 'cosine':
      default:
        return '<<=>';
    }
  }

  private getScoreExpression(metric: string, vector: number[]): string {
    const vectorStr = `'[${vector.join(',')}]'::vector`;

    switch (metric) {
      case 'dot':
        return `-(vector ${this.getDistanceOperator('dot')} ${vectorStr})`;
      case 'euclidean':
        return `1 / (1 + (vector ${this.getDistanceOperator('euclidean')} ${vectorStr}))`;
      case 'cosine':
      default:
        return `1 - (vector ${this.getDistanceOperator('cosine')} ${vectorStr})`;
    }
  }

  private getOrderExpression(metric: string, vector: number[]): string {
    const vectorStr = `'[${vector.join(',')}]'::vector`;

    switch (metric) {
      case 'dot':
        return `vector ${this.getDistanceOperator('dot')} ${vectorStr}`;
      case 'euclidean':
        return `vector ${this.getDistanceOperator('euclidean')} ${vectorStr}`;
      case 'cosine':
      default:
        return `vector ${this.getDistanceOperator('cosine')} ${vectorStr}`;
    }
  }

  private normalizeScore(score: number, metric: string): number {
    // All scores should be normalized to [0, 1]
    return Math.max(0, Math.min(1, score));
  }
}
