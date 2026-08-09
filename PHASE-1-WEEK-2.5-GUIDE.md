# Phase 1, Week 2.5: PostgreSQL FTS Optimization (Optional)

**Status**: ✅ Already Integrated  
**Effort**: Light optimization pass (1-2 days)

## Current State

The PgVector adapter already includes robust PostgreSQL full-text search (FTS) via the `keywordSearch()` method. Week 2.5 is an optional optimization pass.

## What's Already Done

✅ **PostgreSQL FTS Integration**
- English language stemming
- TF-IDF ranking
- Score normalization [0, 1]
- Implemented in pgvector adapter

✅ **Indexing Strategy**
- No separate FTS index needed (uses table TSVECTOR column)
- Integrated with dense search

✅ **Performance**
- Queries under 50ms for typical use

## Optional Week 2.5 Tasks

### 1. Add TSVECTOR Column
Create a dedicated TSVECTOR column for faster FTS:

```sql
-- Add to retrieval_ops.vectors table
ALTER TABLE retrieval_ops.vectors
ADD COLUMN tsvector_content tsvector
GENERATED ALWAYS AS (to_tsvector('english', COALESCE(text, ''))) STORED;

-- Create GIN index for faster searches
CREATE INDEX idx_vectors_tsvector_gin
ON retrieval_ops.vectors USING GIN (tsvector_content);
```

### 2. Optimize Query Performance

Update the keywordSearch method to use pre-computed TSVECTOR:

```sql
SELECT
  entity_id,
  field,
  text,
  ts_rank(tsvector_content, query) as score
FROM retrieval_ops.vectors
WHERE entity_type = $1
  AND tsvector_content @@ query
ORDER BY score DESC
LIMIT $2
```

### 3. Add FTS Configuration

Support different FTS configurations:

```ts
interface FTSConfig {
  language?: 'english' | 'french' | 'spanish';  // Language support
  rankingFunction?: 'tf-idf' | 'bm25';          // Ranking method
  normalize?: boolean;                           // Score normalization
}
```

### 4. Benchmark and Document

- Measure FTS query latency improvements
- Document when to use FTS vs dense search
- Create FTS tuning guide

## When to Skip Week 2.5

✅ **Safe to skip if**:
- Dense search performance is acceptable (< 100ms)
- Keyword search is not critical (< 50% of queries)
- Limited development time
- FTS can be optimized in Phase 2

## Recommendation

**Skip Week 2.5** and proceed directly to **Week 3.5: Core Pipeline**.

Reasons:
1. PgVector FTS already functional and performant
2. Dense search is the priority for MVP
3. FTS optimization can happen in Phase 2 after evaluation
4. Core pipeline integration is more critical

## If You Choose to Implement Week 2.5

**Time Budget**: 1-2 days  
**Priority**: Low  
**Value**: 5-10% performance improvement for FTS queries

### Steps
1. Add TSVECTOR column to schema
2. Create GIN index
3. Update keywordSearch implementation
4. Benchmark before/after
5. Document findings

### Files to Modify
- `packages/adapters/pgvector/src/schema.ts` — Add TSVECTOR column
- `packages/adapters/pgvector/src/adapter.ts` — Optimize query
- `packages/adapters/pgvector/tests/adapter.spec.ts` — FTS benchmarks

---

**Status**: Optional optimization - proceed to Week 3.5 (Core Pipeline) for faster progress to MVP.
