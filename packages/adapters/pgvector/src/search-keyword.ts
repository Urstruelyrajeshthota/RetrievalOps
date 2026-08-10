/**
 * Keyword Search Implementation
 *
 * Handles full-text search using PostgreSQL's native text search.
 * Uses tsvector and tsquery for efficient FTS.
 */

import { PoolClient } from 'pg';
import { KeywordSearchRequest, SearchCandidate } from '@retrievalops/contracts';

/**
 * Escape query text for PostgreSQL FTS
 */
export function escapeQueryText(query: string): string {
  // Replace special FTS characters
  return query.replace(/[&|!()]/g, ' ').trim();
}

/**
 * Execute keyword search query
 */
export async function executeKeywordSearch(
  client: PoolClient,
  fullTableName: string,
  request: KeywordSearchRequest
): Promise<SearchCandidate[]> {
  const escapedQuery = escapeQueryText(request.query);

  if (!escapedQuery) {
    return [];
  }

  // Build WHERE clause with optional filters
  let whereClause = `
    entity_type = $1
    AND to_tsvector('english', COALESCE(text, '')) @@
        plainto_tsquery('english', $2)
  `;
  const params: any[] = [request.entityType, escapedQuery];

  if (request.fieldFilters) {
    // Add field filters
    let filterIndex = 3;
    for (const [key, value] of Object.entries(request.fieldFilters)) {
      whereClause += ` AND metadata->>'${key}' = $${filterIndex}`;
      params.push(value);
      filterIndex++;
    }
  }

  const query = `
    SELECT
      id,
      entity_id,
      field,
      text,
      ts_rank(
        to_tsvector('english', COALESCE(text, '')),
        plainto_tsquery('english', $2)
      ) as score,
      metadata,
      CASE
        WHEN metadata ? 'weight' THEN (metadata->>'weight')::float
        ELSE 1.0
      END as field_weight
    FROM ${fullTableName}
    WHERE ${whereClause}
    ORDER BY score DESC, entity_id ASC
    LIMIT $${params.length + 1}
  `;

  params.push(request.topK);

  const result = await client.query(query, params);

  return result.rows.map((row: any) => ({
    vectorId: row.id,
    entityType: request.entityType,
    entityId: row.entity_id,
    field: row.field,
    text: row.text,
    score: normalizeScore(parseFloat(row.score)),
    scoreSource: 'keyword' as const,
    fieldWeight: row.field_weight || 1.0,
    weightedScore: normalizeScore(parseFloat(row.score)) * (row.field_weight || 1.0),
    metadata: row.metadata,
  }));
}

/**
 * Normalize BM25 score to [0, 1] range
 * PostgreSQL ts_rank returns 0-1, but cap at 1.0 for consistency
 */
export function normalizeScore(score: number): number {
  return Math.max(0, Math.min(1, score));
}
