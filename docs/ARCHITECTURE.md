# RetrievalOps Architecture

## System Overview

RetrievalOps orchestrates retrieval across existing databases. It does not store vectors or run embeddings itself—it **coordinates** with external services.

```
┌─────────────────────────────────────────────────────────┐
│ Application (RAG, Search, etc.)                         │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────▼────────────┐
        │   RetrievalOps Core     │
        └────────────┬────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
   ┌────▼───┐  ┌─────▼──┐  ┌────▼──┐
   │ Planner│  │Pipeline│  │Policy │
   └────┬───┘  └─────┬──┘  └────┬──┘
        │            │           │
        └────────────┼───────────┘
                     │
        ┌────────────▼────────────┐
        │  Search Adapters        │
        ├─────────────────────────┤
        │ pgvector │ Qdrant │ ... │
        └────────────┬────────────┘
                     │
        ┌────────────▼────────────┐
        │   Existing Databases    │
        ├─────────────────────────┤
        │ PostgreSQL, Qdrant, ... │
        └─────────────────────────┘
```

## Core Components

### 1. Entity Schema (`@retrievalops/core`)

Defines what to embed and how to rank it:

```ts
const document = defineEntity({
  name: "document",
  id: "id",
  fields: {
    title: {
      retrieval: ["semantic", "keyword"],
      weight: 1.0
    },
    content: {
      retrieval: ["semantic"],
      weight: 1.0
    }
  }
});
```

### 2. Retrieval Planner

Analyzes the query and builds a retrieval plan:

```
Input: "Why did checkout fail?"
         ↓
Classify intent: root_cause
         ↓
Available strategies: dense, keyword, hybrid
         ↓
Plan: {
  strategy: "hybrid",
  steps: [
    { type: "dense", topK: 100 },
    { type: "keyword", topK: 100 },
    { type: "fusion", algorithm: "rrf" }
  ]
}
```

### 3. Retrieval Pipeline

Executes the plan:

```
Validate access (tenant + principal)
         ↓
Dense search (vectors)
         ↓
Keyword search (full-text)
         ↓
Fuse results (RRF)
         ↓
Deduplicate by parent
         ↓
Rerank (optional)
         ↓
Apply policy checks
         ↓
Return results with explanations
```

### 4. Search Adapters

Implement storage-specific logic:

```ts
interface SearchAdapter {
  denseSearch(request): Promise<Candidate[]>;
  keywordSearch?(request): Promise<Candidate[]>;
  exactMatch?(request): Promise<Candidate[]>;
  index(request): Promise<Result>;
  delete(request): Promise<void>;
  health(): Promise<Health>;
}
```

Each adapter passes the universal test suite.

### 5. Embedding Provider

Generates vectors for indexing and queries:

```ts
interface EmbeddingProvider {
  metadata(): ModelMetadata;
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}
```

Providers track provenance (model, version, dimensions, metric).

### 6. Policy Engine

Enforces access control:

```ts
- Tenant scoping
- Principal-based permissions
- Field-level redaction
- Audit logging
```

## Data Flow: Search

### 1. User Query

```
{
  entity: document,
  query: "Why did checkout fail?",
  context: {
    tenantId: "org-123",
    principalId: "user-456"
  }
}
```

### 2. Validation

- User authorized for tenant?
- Tenant has documents?
- Adapter is healthy?

### 3. Query Embedding

- Use embedding provider to create query vector
- Track provenance (model must match indexed vectors)

### 4. Dense Search

```
Query vector → Adapter.denseSearch() → Top 100 candidates
```

### 5. Keyword Search (if available)

```
Query text → Adapter.keywordSearch() → Top 100 candidates
```

### 6. Candidate Fusion

```
Dense scores + keyword scores → RRF or other fusion
→ Ranked list with combined scores
```

### 7. Deduplication

```
Group by entity ID
Keep highest-scoring match per entity
```

### 8. Reranking (optional)

```
Use cross-encoder or LLM to re-score results
```

### 9. Access Control (final check)

```
Remove results user shouldn't see
Redact sensitive fields
```

### 10. Explanation

```
For each result:
- Which fields matched
- Matched intent
- Score breakdown (dense, keyword, recency, etc.)
```

### 11. Return

```json
{
  "results": [
    {
      "id": "doc-123",
      "score": 0.89,
      "matchedFields": ["title", "content"],
      "explanation": {
        "intent": "root_cause",
        "scores": {
          "dense": 0.91,
          "keyword": 0.76,
          "final": 0.89
        }
      }
    }
  ],
  "plan": { ... },
  "telemetry": { ... }
}
```

## Data Flow: Indexing

### 1. Document Input

```ts
{
  entity: document,
  document: {
    id: "doc-1",
    title: "Payment failed",
    content: "HTTP 503 from database"
  }
}
```

### 2. Field Extraction

For each field in entity schema:

```
title: "Payment failed"
content: "HTTP 503 from database"
```

### 3. Content Hashing

```
titleHash = SHA-256("Payment failed")
contentHash = SHA-256("HTTP 503...")
```

### 4. Deduplication Check

```
Is titleHash already indexed?
  → Reuse old vector (save embedding cost)
Is contentHash already indexed?
  → Reuse old vector (save embedding cost)
```

### 5. Embedding (if not duplicated)

```
Use embedding provider:
- title vector (384D)
- content vector (384D)
```

### 6. Provenance Recording

```
{
  entityId: "doc-1",
  field: "title",
  contentHash: "abc123...",
  vector: [...],
  model: "Xenova/all-MiniLM-L6-v2",
  modelVersion: "2.6.0",
  dimensions: 384,
  distanceMetric: "cosine",
  embeddedAt: 2026-08-09T12:00:00Z,
  sourceUpdatedAt: 2026-08-09T11:50:00Z
}
```

### 7. Storage

```
Adapter.index(request) → Store in pgvector/Qdrant/etc.
```

### 8. Indexing Result

```
{
  indexed: true,
  entityId: "doc-1",
  fields: ["title", "content"]
}
```

## Package Dependencies

```
@retrievalops/core
  ├── @retrievalops/contracts
  ├── @retrievalops/evaluator
  ├── @retrievalops/observability
  └── (User chooses adapters & embeddings)

@retrievalops/pgvector
  └── @retrievalops/contracts

@retrievalops/local (embeddings)
  └── @retrievalops/contracts

(Etc. for each adapter & provider)
```

Adapters and providers only depend on contracts, not core.

## Retrieval Strategies

### 1. Dense Only

```yaml
strategy: dense
topK: 50
```

Fast, uses vector similarity only.

### 2. Hybrid (Dense + Keyword)

```yaml
strategy: hybrid
denseWeight: 0.6
keywordWeight: 0.4
fusion: rrf
```

Combines semantic and keyword signals.

### 3. Field-Level Multi-Vector

```yaml
strategy: field_multi_vector
fields:
  title: 1.0
  content: 0.8
  error: 1.2
```

Different weights per field.

### 4. Two-Stage (Retrieval + Reranking)

```yaml
strategy: two_stage
retrieval:
  type: hybrid
  topK: 100
reranking:
  type: cross_encoder
  topK: 20
```

Narrow candidates, then rerank precisely.

### 5. Shadow Execution

```yaml
strategy: shadow
baseline: dense
candidate: hybrid
```

Run both in parallel; compare results for evaluation.

## Security Model

### Tenant Isolation

```ts
// Index with tenant
await retrieval.index({
  entity: document,
  document: { ... },
  context: { tenantId: "org-123" }
});

// Search with tenant
const result = await retrieval.search({
  query: "...",
  context: { tenantId: "org-123" }
});
// Only returns org-123's documents
```

### Principal Permissions

```ts
// Index with ACL
await retrieval.index({
  entity: document,
  document: {
    id: "doc-1",
    allowedPrincipalIds: ["user-456", "user-789"]
  }
});

// Search as principal
const result = await retrieval.search({
  query: "...",
  context: { principalId: "user-456" }
});
// user-456 can see doc-1
// user-999 cannot
```

### Access Control Layers

1. **Authentication**: User identity (outside RetrievalOps)
2. **Authorization**: Permission check in policy engine
3. **Access**: Filter results before returning
4. **Audit**: Log who searched for what when

## Performance Characteristics

| Operation | Latency | Cost | Notes |
|-----------|---------|------|-------|
| Index (new) | 100-500ms | $$$ | Embedding generation |
| Index (duplicate) | 5-10ms | Free | Hash match, reuse vector |
| Dense search | 50-200ms | Free | Vector DB lookup |
| Keyword search | 50-150ms | Free | Full-text search |
| Reranking | 100-500ms | $$$ | LLM or cross-encoder |
| Full pipeline | 200-1000ms | $$$ | Dense + keyword + rerank |

## Deployment Architecture

### Local Development

```
docker-compose up
- PostgreSQL + pgvector
- Qdrant
- OpenSearch
- Weaviate
```

### Production

```
Application
    ↓
RetrievalOps SDK (Node.js app)
    ├── pgvector adapter → PostgreSQL
    ├── qdrant adapter → Qdrant Cloud
    ├── opensearch adapter → Managed OpenSearch
    └── local embeddings (or API)
```

## Related Documentation

- [Getting Started](./getting-started.md) — Quick start
- [Entity Schema Guide](./entity-schema.md) — Define entities
- [Retrieval Strategies](./strategies.md) — Strategy selection
- [Evaluation Framework](./evaluation.md) — Measure quality
- [Security Model](./security.md) — Access control
- [API Reference](./api.md) — Complete API
- [ADRs](./adr/) — Architecture decisions
