/**
 * PgVector Adapter
 *
 * PostgreSQL + pgvector adapter for RetrievalOps.
 * Provides dense vector search using pgvector and keyword search using PostgreSQL FTS.
 */

export { PgVectorAdapter } from './adapter';
export type { PgVectorAdapterConfig } from './types';
export { SchemaManager } from './schema';
