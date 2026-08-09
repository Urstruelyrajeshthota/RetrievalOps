# Phase 1: Functional SDK — Kickoff Guide

**Timeline**: 5-6 weeks  
**Goal**: Deliver a working RetrievalOps SDK with pgvector adapter and hybrid retrieval  
**Exit Condition**: Jira PAY-142 example runs end-to-end

## What You're Building

A TypeScript SDK that orchestrates retrieval. By end of Phase 1:

```ts
import { RetrievalOps } from "@retrievalops/core";
import { PgVectorAdapter } from "@retrievalops/pgvector";
import { LocalEmbeddingProvider } from "@retrievalops/local";

const retrieval = new RetrievalOps({
  store: new PgVectorAdapter({ connectionString: "..." }),
  embeddings: new LocalEmbeddingProvider({ model: "..." })
});

// Index a document
await retrieval.index({
  entity: jiraTicket,
  document: { id: "PAY-142", title: "...", content: "..." }
});

// Search
const result = await retrieval.search({
  entity: jiraTicket,
  query: "Why did checkout fail?",
  context: { tenantId: "org-123", principalId: "user-456" }
});

// Result includes explanation
console.log(result.results[0].explanation);
// { intent: "root_cause", scores: { dense: 0.91, keyword: 0.73 } }
```

## Phase 1 Breakdown

### Week 1: Core Contracts & Types

**Focus**: Define what RetrievalOps does  
**Deliverables**:

- [ ] Entity schema DSL
  ```ts
  defineEntity({
    name: "jira_ticket",
    id: "id",
    fields: {
      title: { retrieval: ["semantic", "keyword"], weight: 1.0 }
    },
    security: { tenantField: "orgId" }
  })
  ```

- [ ] Retrieval request/response types
  ```ts
  interface RetrievalRequest {
    entity: EntityDefinition;
    query: string;
    context: RetrievalContext;
    strategy?: RetrievalStrategy;
  }

  interface RetrievalResult {
    results: RankedResult[];
    plan: RetrievalPlan;
    telemetry: RetrievalTelemetry;
  }
  ```

- [ ] Entity definition storage
  - In-memory registry for now
  - Future: JSON schema validation

**File Structure**:
```
packages/core/src/
├── entity.ts          # defineEntity() DSL
├── types.ts           # RetrievalRequest, Result, etc.
├── registry.ts        # Entity storage
├── index.ts           # Exports
└── errors.ts          # Custom errors
```

**Tests**:
```
packages/core/tests/
├── entity.spec.ts     # Schema definition
├── types.spec.ts      # Request/response validation
└── registry.spec.ts   # Entity lookup
```

### Week 2: PgVector Adapter

**Focus**: Implement SearchAdapter interface for PostgreSQL + pgvector  
**Deliverables**:

- [ ] PgVectorAdapter class
  ```ts
  class PgVectorAdapter implements SearchAdapter {
    async index(request: IndexRequest): Promise<IndexResult> { ... }
    async denseSearch(request: DenseSearchRequest): Promise<Candidate[]> { ... }
    async keywordSearch(request: KeywordSearchRequest): Promise<Candidate[]> { ... }
    async delete(request: DeleteRequest): Promise<void> { ... }
    async health(): Promise<AdapterHealth> { ... }
  }
  ```

- [ ] PostgreSQL schema
  - Vectors table (entity_id, field, vector, metadata, provenance)
  - FTS index for keyword search
  - Content hash index for deduplication

- [ ] Distance metric support
  - Cosine (primary)
  - L2 (Euclidean)
  - Dot product

- [ ] Pass adapter test suite
  ```bash
  npm run test --workspace=@retrievalops/pgvector
  # All 10 tests passing
  ```

**File Structure**:
```
packages/adapters/pgvector/src/
├── adapter.ts         # Main adapter class
├── schema.ts          # PostgreSQL schema
├── queries.ts         # SQL builders
├── types.ts           # PgVector-specific types
└── index.ts           # Exports
```

**Tests**:
```
packages/adapters/pgvector/tests/
├── adapter.spec.ts    # Contract compliance
├── schema.spec.ts     # Schema creation
├── search.spec.ts     # Dense and keyword search
└── integration.spec.ts # End-to-end
```

**Database Setup**:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS tsvector;

CREATE TABLE vectors (
  id UUID PRIMARY KEY,
  entity_type VARCHAR NOT NULL,
  entity_id VARCHAR NOT NULL,
  field VARCHAR NOT NULL,
  text TEXT,
  vector vector(384),
  content_hash VARCHAR(64),
  embedding_model VARCHAR NOT NULL,
  embedding_version VARCHAR NOT NULL,
  distance_metric VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_entity ON vectors(entity_type, entity_id);
CREATE INDEX idx_vector ON vectors USING ivfflat (vector vector_cosine_ops);
CREATE INDEX idx_hash ON vectors(content_hash);
```

### Week 2.5: PostgreSQL Full-Text Adapter

**Focus**: Keyword search using PostgreSQL FTS  
**Deliverables**:

- [ ] Full-text search implementation
  - tsvector storage
  - tsquery parsing
  - BM25 scoring

- [ ] Unified search across adapters
  - pgvector handles dense
  - PostgreSQL FTS handles keyword

### Week 3: Local Embedding Provider

**Focus**: Implement EmbeddingProvider using transformers.js  
**Deliverables**:

- [ ] LocalEmbeddingProvider class
  ```ts
  class LocalEmbeddingProvider implements EmbeddingProvider {
    async embedDocuments(texts: string[]): Promise<number[][]> { ... }
    async embedQuery(text: string): Promise<number[]> { ... }
    metadata(): EmbeddingModelMetadata { ... }
  }
  ```

- [ ] Model loading
  - Lazy load on first use
  - Cache model in memory
  - Support multiple models

- [ ] Provenance tracking
  - Xenova/all-MiniLM-L6-v2 (default, 384D)
  - Xenova/all-mpnet-base-v2 (768D, higher quality)

- [ ] Batch processing
  - Efficient vectorization
  - Error handling

**File Structure**:
```
packages/embeddings/local/src/
├── provider.ts        # Main provider class
├── models.ts          # Model loading
├── pooling.ts         # Mean pooling
└── index.ts           # Exports
```

**Tests**:
```
packages/embeddings/local/tests/
├── provider.spec.ts   # Contract compliance
├── models.spec.ts     # Model loading
└── embedding.spec.ts  # Vector generation
```

### Week 3.5: RetrievalOps Core Pipeline

**Focus**: Orchestrate the retrieval flow  
**Deliverables**:

- [ ] RetrievalOps class
  ```ts
  class RetrievalOps {
    constructor(config: RetrievalOpsConfig);
    async index(request: IndexRequest): Promise<IndexResult>;
    async search(request: SearchRequest): Promise<SearchResult>;
  }
  ```

- [ ] Indexing flow
  1. Validate entity schema
  2. Extract fields to embed
  3. Check content hash (deduplication)
  4. Embed changed fields only
  5. Store with provenance
  6. Return success

- [ ] Search flow (basic hybrid)
  1. Validate access (stub for Phase 3)
  2. Embed query
  3. Dense search (pgvector)
  4. Keyword search (PostgreSQL FTS)
  5. RRF fusion (if both available)
  6. Return results with scores

- [ ] Explanation generation
  ```ts
  {
    intent: "root_cause",
    matchedFields: ["title", "content"],
    scores: {
      dense: 0.91,
      keyword: 0.73,
      final: 0.87
    }
  }
  ```

**File Structure**:
```
packages/core/src/
├── retrieval-ops.ts   # Main class
├── pipeline/
│   ├── index.ts       # Indexing logic
│   ├── search.ts      # Search logic
│   ├── fusion.ts      # RRF fusion
│   └── explain.ts     # Explanation generation
├── types.ts
├── registry.ts
└── index.ts
```

### Week 4: Hybrid Retrieval & Fusion

**Focus**: Combine dense and keyword signals  
**Deliverables**:

- [ ] RRF (Reciprocal Rank Fusion)
  ```ts
  // For each candidate in both result sets:
  score_rrf = 1 / (k + rank)
  // k = 60 (standard)
  
  // Example:
  // Dense: rank 1 → score = 1/61 = 0.0164
  // Keyword: rank 5 → score = 1/65 = 0.0154
  // Total: 0.0318
  ```

- [ ] Score normalization [0, 1]
  - Cosine similarity: already normalized
  - Keyword (BM25): normalize by percentile
  - Final: weighted sum

- [ ] Field weighting
  ```ts
  // Entity schema:
  fields: {
    title: { weight: 1.0 },
    content: { weight: 0.9 },
    errorMessage: { weight: 1.2 }
  }
  
  // Applied during fusion
  final_score = Σ(field_score × field_weight) / Σ(weights)
  ```

- [ ] Deduplication by entity
  - Group candidates by entityId
  - Keep highest score per entity
  - Aggregate matched fields

**Tests**:
```
packages/core/tests/
├── hybrid.spec.ts     # Hybrid retrieval
├── fusion.spec.ts     # RRF algorithm
├── weights.spec.ts    # Field weighting
└── dedup.spec.ts      # Deduplication
```

### Week 5: Jira Example

**Focus**: End-to-end working example  
**Deliverables**:

- [ ] Entity schema for Jira
  ```ts
  export const jiraTicket = defineEntity({
    name: "jira_ticket",
    id: "key",
    fields: {
      summary: { retrieval: ["semantic", "keyword"], weight: 1.0 },
      description: { retrieval: ["semantic"], weight: 0.9 },
      errorMessage: { retrieval: ["semantic", "exact"], weight: 1.2 },
      rootCause: { retrieval: ["semantic"], weight: 1.3 },
      resolution: { retrieval: ["semantic"], weight: 1.1 }
    },
    security: {
      tenantField: "projectKey",
      permissionField: null  // Stub for Phase 3
    }
  });
  ```

- [ ] Indexing script
  ```ts
  // Import sample Jira tickets (PAY-142, etc.)
  // Index with LocalEmbedding + PgVectorAdapter
  // Record indexing times and costs
  ```

- [ ] Search examples
  ```ts
  // Example queries and expected results
  "Why did checkout fail?"
  "HTTP 503 error"
  "Database certificate issue"
  ```

- [ ] Evaluation on golden set
  ```json
  {
    "queries": [
      {
        "query": "Why did checkout fail?",
        "expected": [
          { "entityId": "PAY-142", "relevance": 3, "field": "rootCause" }
        ]
      }
    ]
  }
  ```

**File Structure**:
```
examples/jira-pgvector/
├── src/
│   ├── entity.ts      # Jira entity schema
│   ├── index.ts       # Indexing script
│   ├── search.ts      # Search examples
│   └── evaluate.ts    # Golden set evaluation
├── data/
│   ├── tickets.json   # Sample data
│   └── golden.jsonl   # Evaluation dataset
├── results/
│   ├── index-log.txt
│   └── search-results.json
└── README.md          # How to run
```

### Week 5.5: Documentation & Polish

**Focus**: Explain what was built  
**Deliverables**:

- [ ] API documentation
  - RetrievalOps class
  - defineEntity() DSL
  - Adapter interface

- [ ] Strategy selection guide
  - When to use dense only
  - When to use hybrid
  - When to rerank

- [ ] Adapter implementation guide
  - How to build your own adapter
  - Passing the test suite
  - Common pitfalls

- [ ] Example walkthrough
  - Jira example step-by-step
  - Performance analysis
  - Cost breakdown

## Daily Standup Template

```
What I'm working on:
- Specific file/function

Blockers:
- None / <describe>

Help needed:
- None / <describe>

Status:
- 🟢 On track / 🟡 At risk / 🔴 Blocked
```

## Definition of Done

For each deliverable:

- [ ] Code compiles without errors
- [ ] All tests pass (unit + integration)
- [ ] Type checking passes (strict mode)
- [ ] ESLint passes (no warnings)
- [ ] Code coverage ≥80%
- [ ] Documentation updated
- [ ] PR reviewed and approved
- [ ] Merged to main

## Testing Strategy

### Unit Tests (80% of coverage)

```
packages/core/tests/
├── entity.spec.ts
├── types.spec.ts
└── pipeline/
    ├── index.spec.ts
    ├── search.spec.ts
    └── fusion.spec.ts
```

### Integration Tests (15%)

```
packages/adapters/pgvector/tests/
├── adapter.spec.ts    # Contract compliance
└── integration.spec.ts # Real PostgreSQL
```

### E2E Tests (5%)

```
examples/jira-pgvector/
└── jira.spec.ts       # Full Jira example
```

### Security Tests

```
packages/core/tests/
├── security/
│   ├── model-mismatch.spec.ts
│   └── provenance.spec.ts
```

## Performance Targets (Phase 1)

| Operation | Target | Notes |
|-----------|--------|-------|
| Index (new) | <500ms | Includes embedding |
| Index (duplicate) | <10ms | Hash match |
| Dense search | <200ms | 100 candidates |
| Keyword search | <150ms | FTS query |
| Full pipeline | <500ms | Dense + keyword + RRF |
| Startup time | <5s | Load models + connect DB |

## Rollout Plan

### Beta Release (v0.1.0-beta.1)
- Tag: after Week 3
- Feedback: internal testing
- Focus: adapter reliability

### Release Candidate (v0.1.0-rc.1)
- Tag: after Week 4.5
- Feedback: early adopters
- Focus: performance tuning

### General Availability (v0.1.0)
- Tag: end of Week 5.5
- Announcement: blog post + GitHub release
- Support: GitHub Discussions

## Common Pitfalls to Avoid

1. **Mixing embedding dimensions**
   - All indexed vectors must match query vector dimensions
   - Track model in provenance

2. **Score normalization**
   - Dense scores [0, 1]
   - Keyword scores need normalization
   - Rerank scores different scale

3. **SQL performance**
   - Use indexes! (entity, vector, hash)
   - Batch operations when possible
   - Monitor query plans

4. **Error handling**
   - Model not found → clear error
   - No results → return empty, not error
   - Adapter unreachable → fail fast

5. **Testing**
   - Deterministic tests (seed randomness)
   - Isolated DB per test
   - Clean up after tests

## Getting Help

**Questions about contracts?**
- See ADRs in docs/adr/

**Stuck on adapter implementation?**
- Check pgvector adapter reference
- Review test suite expectations
- Reach out: hello@retrievalops.dev

**Performance issues?**
- Profile with node --prof
- Check SQL query plans
- Benchmark against baselines

## Success Criteria

At end of Phase 1:

✅ Jira PAY-142 example works
✅ All unit tests pass (>80% coverage)
✅ Adapter passes contract test suite
✅ Hybrid retrieval improves over dense-only
✅ Documentation is complete
✅ Performance targets met
✅ Zero known bugs (issues tracked for Phase 2)

---

**Ready? Let's build! 🚀**

See you at the Phase 1 kickoff!
