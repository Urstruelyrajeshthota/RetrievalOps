# RetrievalOps v0.2.0 Roadmap

Target: Q4 2026 (8-10 weeks)
Features: HNSW Indexes, Multi-DB, Query Optimization

## Feature 1: HNSW Vector Indexes

Current: IVFFlat (100-200ms latency)
Goal: HNSW (20-50ms, 5-10x faster)

Configuration:
```typescript
new PgVectorAdapter({
  indexingStrategy: "hnsw",
  hnsw: { m: 16, efConstruction: 200, ef: 100 }
});
```

Parameters:
- m=16: Balanced (default)
- efConstruction=200: Quality vs speed trade-off
- ef=100: Search parameter tuning

Performance Target:
- Latency: 20-50ms
- Recall@10: >0.95
- Index size: +20% acceptable

Timeline: Weeks 1-3
Migration: npm run retrievalops migrate:hnsw

---

## Feature 2: Multi-Database Support

Phase v0.2.0: PostgreSQL + Qdrant
Phase v0.2.1: + Weaviate, OpenSearch

SearchAdapter Interface:
```typescript
interface SearchAdapter {
  index(req: IndexRequest): Promise<IndexResult>;
  denseSearch(req: DenseSearchRequest): Promise<SearchCandidate[]>;
  keywordSearch(req: KeywordSearchRequest): Promise<SearchCandidate[]>;
  delete(req: DeleteRequest): Promise<void>;
  health(): Promise<HealthStatus>;
}
```

Qdrant Setup:
```bash
docker run -p 6333:6333 qdrant/qdrant
```

Usage:
```typescript
const adapter = new QdrantAdapter({
  url: "http://localhost:6333",
  collectionName: "tickets"
});
const retrieval = new RetrievalOps({ store: adapter });
```

Timeline: Weeks 3-5

---

## Feature 3: Query Optimization

Pipeline:
User Query → Clean → Expand → Negate → Intent → Fields → Search

Preprocessing (Week 6):
- Clean: normalize spacing/case
- Expand: add synonyms (payment → transaction)
- Negate: extract "NOT timeout"
- Intent: detect root_cause, solution, error, general
- Fields: extract "in errorMessage:" hints

Example:
Input: "why did payment fail NOT timeout?"
Output: {
  cleaned: "did payment fail",
  expanded: ["payment failure", "transaction error"],
  negations: ["timeout"],
  intent: "root_cause",
  fieldHints: []
}

Search Integration (Week 7):
- Search with base + expanded queries (parallel)
- Merge and deduplicate results
- Filter out negation terms
- Boost field-hint matches by 1.2x

Expected Improvement: +20-30% recall

Timeline: Weeks 6-7

---

## Timeline

Weeks 1-3: HNSW indexing (PostgreSQL)
Weeks 3-4: SearchAdapter abstraction
Weeks 4-5: Qdrant adapter
Week 5: Adapter factory
Week 6: Query preprocessing
Week 7: Query-aware search
Week 8: Documentation + release

---

## Success Metrics

Search Latency: 140ms → 35ms (4x faster)
Recall@10: 0.92 → 0.96+
Adapters: 1 → 2+
Query Recall Boost: +20-30%
Breaking Changes: 0

---

## No Breaking Changes

✅ All features are additive
✅ v0.1.0 schemas still work
✅ API unchanged
✅ PgVector still supported
✅ Deprecation path for IVFFlat (v0.2→0.3)

---

## What Comes Next

v0.2.1 (2 weeks after v0.2.0):
- Weaviate adapter
- OpenSearch adapter

v0.3.0:
- Additional adapters
- ML-based query rewriting
- Caching layer (Redis)
- Query cost estimation

v1.0.0:
- Distributed embeddings
- Multi-model ranking
- Production patterns
- Enterprise monitoring

---

Ready to start Week 1? 🚀
