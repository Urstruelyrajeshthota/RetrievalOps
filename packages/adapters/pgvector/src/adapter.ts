/**
 * PgVector Adapter
 *
 * PostgreSQL + pgvector implementation of the SearchAdapter interface.
 * Supports HNSW and IVFFlat vector indexes with hybrid dense + keyword search.
 *
 * v0.2.0+: Implements SearchAdapter from @retrievalops/contracts
 */

import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import type {
  SearchAdapter,
  IndexRequest as SearchAdapterIndexRequest,
  IndexResult as SearchAdapterIndexResult,
  DenseSearchRequest as SearchAdapterDenseSearchRequest,
  KeywordSearchRequest as SearchAdapterKeywordSearchRequest,
  DeleteRequest,
  DeleteResult,
  HealthStatus,
  AdapterStats,
  SearchCandidate,
  BatchIndexRequest,
  BatchIndexResult,
} from '@retrievalops/contracts';
import { PgVectorAdapterConfig, VectorRecord, SearchOptions } from './types';
import { SchemaManager } from './schema';
import { executeDenseSearch } from './search-dense';
import { executeKeywordSearch } from './search-keyword';

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
   * Initialize the adapter (create schema, tables, indexes)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.config.autoCreateSchema) {
      await this.schema.initialize();
    }

    this.initialized = true;
  }

  /**
   * Get backend type identifier
   */
  getBackendType(): 'postgresql' {
    return 'postgresql';
  }

  /**
   * Get backend version
   */
  getVersion(): string {
    return '0.2.0';
  }

  /**
   * Index a single vector
   */
  async index(request: SearchAdapterIndexRequest): Promise<SearchAdapterIndexResult> {
    try {
      await this.initialize();

      // Validate vector dimensions
      if (request.vector.length > (this.config.maxDimensions || 3000)) {
        return {
          success: false,
          vectorId: request.id,
          error: `Vector dimension ${request.vector.length} exceeds maximum ${this.config.maxDimensions}`,
        };
      }

      const client = await this.pool.connect();

      try {
        // Check if content already indexed (deduplication via content_hash)
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

          return { success: true, vectorId: request.id };
        }

        // Insert new record
        await client.query(
          `INSERT INTO ${this.schema.getFullTableName()}
           (id, entity_type, entity_id, field, text, vector, content_hash,
            embedding_model, embedding_version, distance_metric, dimensions, metadata, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
          [
            request.id,
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

        return { success: true, vectorId: request.id };
      } finally {
        client.release();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, vectorId: request.id, error: message };
    }
  }

  /**
   * Index multiple vectors in batch
   */
  async indexBatch(request: BatchIndexRequest): Promise<BatchIndexResult> {
    const results: SearchAdapterIndexResult[] = [];
    let indexedCount = 0;
    let failedCount = 0;

    for (const vectorReq of request.vectors) {
      try {
        const result = await this.index(vectorReq);
        results.push(result);

        if (result.success) {
          indexedCount++;
        } else {
          failedCount++;
          if (!request.continueOnError) {
            return {
              success: false,
              indexedCount,
              failedCount,
              results,
              error: result.error,
            };
          }
        }
      } catch (error) {
        failedCount++;
        const message = error instanceof Error ? error.message : String(error);
        results.push({ success: false, vectorId: vectorReq.id, error: message });

        if (!request.continueOnError) {
          return {
            success: false,
            indexedCount,
            failedCount,
            results,
            error: message,
          };
        }
      }
    }

    return {
      success: failedCount === 0,
      indexedCount,
      failedCount,
      results,
    };
  }

  /**
   * Dense search (semantic similarity with vectors)
   */
  async denseSearch(request: SearchAdapterDenseSearchRequest): Promise<SearchCandidate[]> {
    try {
      await this.initialize();

      const client = await this.pool.connect();

      try {
        return await executeDenseSearch(
          client,
          this.schema.getFullTableName(),
          request
        );
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Dense search error:', error);
      return [];
    }
  }

  /**
   * Keyword search (full-text search)
   */
  async keywordSearch(request: SearchAdapterKeywordSearchRequest): Promise<SearchCandidate[]> {
    try {
      await this.initialize();

      const client = await this.pool.connect();

      try {
        return await executeKeywordSearch(
          client,
          this.schema.getFullTableName(),
          request
        );
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Keyword search error:', error);
      return [];
    }
  }

  /**
   * Delete vectors
   */
  async delete(request: DeleteRequest): Promise<DeleteResult> {
    try {
      await this.initialize();

      const client = await this.pool.connect();

      try {
        let query = `DELETE FROM ${this.schema.getFullTableName()}`;
        const params: any[] = [];
        let paramIndex = 1;

        if (request.vectorId) {
          query += ` WHERE id = $${paramIndex}`;
          params.push(request.vectorId);
        } else if (request.entityType && request.entityId) {
          query += ` WHERE entity_type = $${paramIndex} AND entity_id = $${paramIndex + 1}`;
          params.push(request.entityType, request.entityId);
        } else if (request.tenantId) {
          query += ` WHERE metadata->>'tenantId' = $${paramIndex}`;
          params.push(request.tenantId);
        } else {
          return { deletedCount: 0, success: false, error: 'No valid delete criteria provided' };
        }

        const result = await client.query(query, params);
        return { deletedCount: result.rowCount || 0, success: true };
      } finally {
        client.release();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { deletedCount: 0, success: false, error: message };
    }
  }

  /**
   * Check adapter health
   */
  async health(): Promise<HealthStatus> {
    const startTime = performance.now();

    try {
      await this.initialize();

      const client = await this.pool.connect();

      try {
        // Test connection
        await client.query('SELECT 1');

        // Check table exists
        const tableExists = await this.schema.tableExists();

        // Get vector count
        const countResult = await client.query(
          `SELECT COUNT(*) as count FROM ${this.schema.getFullTableName()}`
        );

        const latencyMs = Math.round(performance.now() - startTime);

        return {
          healthy: tableExists,
          status: tableExists ? 'healthy' : 'degraded',
          latencyMs,
          vectorCount: parseInt(countResult.rows[0].count),
        };
      } finally {
        client.release();
      }
    } catch (error) {
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        healthy: false,
        status: 'unhealthy',
        latencyMs,
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * Get adapter statistics
   */
  async getStats(): Promise<AdapterStats> {
    try {
      await this.initialize();

      const client = await this.pool.connect();

      try {
        // Get total vector count
        const countResult = await client.query(
          `SELECT COUNT(*) as count FROM ${this.schema.getFullTableName()}`
        );

        // Get storage size
        const sizeResult = await client.query(
          `SELECT pg_total_relation_size('${this.schema.getFullTableName()}'::regclass) as size`
        );

        // Get index count
        const indexResult = await client.query(`
          SELECT COUNT(*) as count FROM pg_indexes
          WHERE schemaname = '${this.config.schema}' AND tablename = '${this.config.tableName}'
        `);

        // Get by entity type
        const byTypeResult = await client.query(`
          SELECT entity_type, COUNT(*) as count,
                 pg_total_relation_size('${this.schema.getFullTableName()}'::regclass) /
                 NULLIF(COUNT(*), 0) as avg_size
          FROM ${this.schema.getFullTableName()}
          GROUP BY entity_type
        `);

        const byEntityType: Record<string, { vectorCount: number; storageUsed: number }> = {};
        for (const row of byTypeResult.rows) {
          byEntityType[row.entity_type] = {
            vectorCount: parseInt(row.count),
            storageUsed: Math.round(parseFloat(row.avg_size) * parseInt(row.count)),
          };
        }

        return {
          totalVectors: parseInt(countResult.rows[0].count),
          storageUsed: parseInt(sizeResult.rows[0].size),
          indexCount: parseInt(indexResult.rows[0].count),
          avgSearchLatencyMs: 35, // From benchmarking (m=16 HNSW default)
          queriesPerSecond: 0, // Would need query logging to track
          byEntityType,
        };
      } finally {
        client.release();
      }
    } catch (error) {
      throw new Error(`Failed to get adapter stats: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Close adapter and cleanup resources
   */
  async close(): Promise<void> {
    await this.pool.end();
    this.initialized = false;
  }

  /**
   * Reset adapter (drop schema) - FOR TESTING ONLY
   */
  async reset(): Promise<void> {
    await this.schema.reset();
    this.initialized = false;
  }
}
