/**
 * Dense Vector Search Implementation
 *
 * Handles semantic search using vector similarity with PostgreSQL + pgvector.
 * Supports HNSW and IVFFlat indexes with cosine, dot, and euclidean metrics.
 */

import { PoolClient } from 'pg';
import { DenseSearchRequest, SearchCandidate } from '@retrievalops/contracts';

/**
 * Get distance operator for pgvector
 */
export function getDistanceOperator(metric: 'cosine' | 'dot' | 'euclidean'): string {
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

/**
 * Get score expression (normalized to [0, 1])
 */
export function getScoreExpression(
  metric: 'cosine' | 'dot' | 'euclidean',
  vector: number[]
): string {
  const vectorStr = `'[${vector.join(',')}]'::vector`;
  const operator = getDistanceOperator(metric);

  switch (metric) {
    case 'dot':
      // Dot product: negate and normalize
      return `GREATEST(0, -(vector ${operator} ${vectorStr}))`;

    case 'euclidean':
      // Euclidean distance: 1 / (1 + distance)
      return `1.0 / (1.0 + (vector ${operator} ${vectorStr}))`;

    case 'cosine':
    default:
      // Cosine similarity: 1 - distance
      return `GREATEST(0, 1.0 - (vector ${operator} ${vectorStr}))`;
  }
}

/**
 * Get ORDER BY expression for efficient sorting
 */
export function getOrderExpression(
  metric: 'cosine' | 'dot' | 'euclidean',
  vector: number[]
): string {
  const vectorStr = `'[${vector.join(',')}]'::vector`;
  const operator = getDistanceOperator(metric);

  switch (metric) {
    case 'dot':
      // Dot product: order descending (higher is better)
      return `vector ${operator} ${vectorStr} DESC`;

    case 'euclidean':
      // Euclidean: order ascending (lower distance is better)
      return `vector ${operator} ${vectorStr} ASC`;

    case 'cosine':
    default:
      // Cosine: order ascending (lower distance is better)
      return `vector ${operator} ${vectorStr} ASC`;
  }
}

/**
 * Normalize score to [0, 1] range
 */
export function normalizeScore(score: number): number {
  return Math.max(0, Math.min(1, score));
}

/**
 * Execute dense search query
 */
export async function executeDenseSearch(
  client: PoolClient,
  fullTableName: string,
  request: DenseSearchRequest
): Promise<SearchCandidate[]> {
  const metric = request.distanceMetric || 'cosine';
  const scoreExpr = getScoreExpression(metric, request.queryVector);
  const orderExpr = getOrderExpression(metric, request.queryVector);

  // Build WHERE clause with optional filters
  let whereClause = 'entity_type = $1';
  const params: any[] = [request.entityType, request.topK];

  if (request.fieldFilters) {
    // Add field filters (tenant, permissions, etc.)
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
      ${scoreExpr} as score,
      metadata,
      CASE
        WHEN metadata ? 'weight' THEN (metadata->>'weight')::float
        ELSE 1.0
      END as field_weight
    FROM ${fullTableName}
    WHERE ${whereClause}
    ORDER BY ${orderExpr}
    LIMIT $2
  `;

  const result = await client.query(query, [request.entityType, request.topK, ...params.slice(2)]);

  return result.rows.map((row: any) => ({
    vectorId: row.id,
    entityType: request.entityType,
    entityId: row.entity_id,
    field: row.field,
    text: row.text,
    score: normalizeScore(parseFloat(row.score)),
    scoreSource: 'dense' as const,
    fieldWeight: row.field_weight || 1.0,
    weightedScore: normalizeScore(parseFloat(row.score)) * (row.field_weight || 1.0),
    metadata: row.metadata,
  }));
}
