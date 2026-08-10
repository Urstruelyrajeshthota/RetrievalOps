# SearchAdapter Design Document

**Version**: v0.2.0  
**Status**: Design Phase  
**Authors**: RetrievalOps Team  

## Executive Summary

The SearchAdapter is a unified interface enabling RetrievalOps to work with multiple storage backends (PostgreSQL, Qdrant, Weaviate, Milvus, OpenSearch, etc.) without changing the retrieval layer.

**Key Benefits**:
- ✅ Write once, deploy to any database
- ✅ Consistent API across all backends
- ✅ Easy to add new backends
- ✅ No coupling between retrieval and storage
- ✅ Enables gradual multi-database support

## Architecture

```
┌─────────────────────────────────────┐
│     RetrievalOps Core Layer         │
│  (Search planning, RRF fusion,      │
│   Explainability, etc.)             │
└──────────────┬──────────────────────┘
               │
        ┌──────▼─────────┐
        │ SearchAdapter  │ ◄─── Unified interface
        │   Interface    │
        └──────┬─────────┘
               │
       ┌───────┼────────┬──────────┬──────────┐
       │       │        │          │          │
    ┌──▼──┐ ┌─▼──┐ ┌──▼───┐ ┌───▼──┐ ┌────▼─┐
    │PgSQL│ │Qdra│ │Weavt │ │Milvu │ │OpenS │
    │pgvc │ │nt  │ │iate  │ │s     │ │earch │
    └─────┘ └────┘ └──────┘ └──────┘ └──────┘
```

## Interface Design

### Core Methods

#### 1. Index Operations

```typescript
// Single vector
async index(request: IndexRequest): Promise<IndexResult>

// Batch vectors
async indexBatch(request: BatchIndexRequest): Promise<BatchIndexResult>
```

**Why separate?**
- Single: For real-time indexing (API requests)
- Batch: For bulk operations (data imports)

#### 2. Search Operations

```typescript
// Vector similarity search (semantic)
async denseSearch(request: DenseSearchRequest): Promise<SearchCandidate[]>

// Full-text search (keyword)
async keywordSearch(request: KeywordSearchRequest): Promise<SearchCandidate[]>
```

**Why separate?**
- Different algorithms per backend
- Different optimization strategies
- RRF fusion happens at RetrievalOps layer (not adapter)

#### 3. Data Management

```typescript
// Delete vectors
async delete(request: DeleteRequest): Promise<DeleteResult>

// Initialize schema
async initialize(): Promise<void>

// Cleanup
async close(): Promise<void>
```

#### 4. Observability

```typescript
// Health check
async health(): Promise<HealthStatus>

// Statistics
async getStats(): Promise<AdapterStats>

// Backend identification
getBackendType(): 'postgresql' | 'qdrant' | 'weaviate' | 'milvus' | 'opensearch'
getVersion(): string
```

## Implementation Plan

### Phase 1: PostgreSQL Adapter (v0.2.0)

Refactor existing PgVectorAdapter to implement SearchAdapter interface.

**File Structure**:
```
packages/adapters/pgvector/
├── src/
│   ├── adapter.ts          (implements SearchAdapter)
│   ├── search-dense.ts     (denseSearch implementation)
│   ├── search-keyword.ts   (keywordSearch implementation)
│   ├── schema.ts           (initialize, cleanup)
│   └── types.ts            (adapter config)
└── tests/
    └── search-adapter.spec.ts  (interface compliance)
```

**Key Steps**:
1. Move PgVectorAdapter to implement SearchAdapter
2. Extract denseSearch logic to dedicated module
3. Extract keywordSearch logic to dedicated module
4. Add interface compliance tests
5. Document PostgreSQL-specific behaviors

**No Breaking Changes**: Existing PgVectorAdapter API continues to work

### Phase 2: Qdrant Adapter (v0.2.0-2, Weeks 5-6)

Implement Qdrant support using SearchAdapter interface.

```typescript
export class QdrantAdapter implements SearchAdapter {
  constructor(config: QdrantAdapterConfig) { }
  
  async initialize(): Promise<void> { }
  async index(request: IndexRequest): Promise<IndexResult> { }
  async denseSearch(request: DenseSearchRequest): Promise<SearchCandidate[]> { }
  async keywordSearch(request: KeywordSearchRequest): Promise<SearchCandidate[]> { }
  // ... other methods
}
```

**What Qdrant Brings**:
- ✅ gRPC protocol (faster than REST)
- ✅ Advanced filtering (scalar filters)
- ✅ Payload manipulation
- ✅ Cloud option (Qdrant Cloud)

### Phase 3: Additional Backends (v0.2.1+)

Add Weaviate, Milvus, OpenSearch following same pattern.

## Data Model Consistency

All adapters handle the same core data model:

```typescript
interface IndexRequest {
  id: string
  entityType: string
  entityId: string
  field: string
  text: string
  vector: number[]  // Always 384D
  contentHash: string
  embeddingModel: string
  metadata?: Record<string, unknown>
}
```

**Implementation Notes**:
- PostgreSQL: JSON columns for metadata
- Qdrant: Payload field
- Weaviate: Additional properties
- Milvus: Extra fields

**Goal**: Same data in any backend

## Search Result Normalization

All adapters return normalized results:

```typescript
interface SearchCandidate {
  vectorId: string
  entityType: string
  entityId: string
  field: string
  text: string
  score: number       // Always 0.0-1.0
  scoreSource: 'dense' | 'keyword' | 'hybrid'
  fieldWeight: number
  weightedScore: number
}
```

**Normalization Rules**:
- All scores normalized to [0, 1] range
- Similarity (cosine, dot) mapped to [0, 1]
- Relevance (BM25) mapped to [0, 1]
- Field weights applied consistently

## Adapter Selection

Users choose adapter at initialization:

```typescript
// PostgreSQL (default)
const adapter = new PgVectorAdapter(config);

// Or Qdrant
const adapter = new QdrantAdapter(config);

// Or Weaviate
const adapter = new WeaviateAdapter(config);

// RetrievalOps uses it transparently
const retrieval = new RetrievalOps({ store: adapter });
```

## Factory Pattern (Optional)

For dynamic adapter selection:

```typescript
const factory = new SearchAdapterFactory();
const adapter = await factory.create('qdrant', { url: '...' });
```

## Dense Search: Backend Differences

### PostgreSQL
```sql
SELECT * FROM vectors
WHERE entity_type = $1
ORDER BY vector <=> $2
LIMIT $3
-- Uses pgvector's native HNSW index
```

### Qdrant
```python
results = qdrant_client.search(
    collection_name="vectors",
    query_vector=query,
    query_filter=Filter(must=[...])
)
# Uses Qdrant's native HNSW
```

### Weaviate
```graphql
query {
  Get {
    Vector(
      nearVector: {vector: [...]},
      limit: 10
    ) {
      _additional { vector distance }
    }
  }
}
```

**Unified at RetrievalOps level**: Caller doesn't care about SQL vs gRPC vs GraphQL

## Keyword Search: Backend Differences

### PostgreSQL
```sql
SELECT * FROM vectors
WHERE to_tsvector('english', text) @@ plainto_tsquery($1)
ORDER BY ts_rank(...) DESC
LIMIT $2
-- Uses PostgreSQL's full-text search
```

### Qdrant
```python
results = qdrant_client.scroll(
    collection_name="vectors",
    query_filter=Filter(must=[
        HasIdCondition(has_id=[...])
    ])
)
# Qdrant doesn't have native FTS, uses filtering + dense
```

### Weaviate
```graphql
query {
  Get {
    Vector(where: {
      operator: "Like",
      path: ["text"],
      value: "query"
    }) {
      _additional { score }
    }
  }
}
```

**Important**: Different backends have different FTS capabilities. Adapter abstracts this.

## Error Handling

All adapters use consistent error reporting:

```typescript
// Connection errors
throw new Error('Cannot connect to backend')

// Invalid requests
throw new Error('Invalid search parameters')

// Backend errors
throw new Error('Backend returned 500: ...')

// Via result objects
return {
  success: false,
  error: 'Vector not found'
}
```

## Testing Strategy

### Interface Compliance Tests

Every adapter must pass:

```typescript
describe('SearchAdapter Interface Compliance', () => {
  it('should implement all required methods', () => {
    expect(adapter.index).toBeDefined()
    expect(adapter.denseSearch).toBeDefined()
    expect(adapter.keywordSearch).toBeDefined()
    // ... all methods
  })

  it('should return consistent result types', () => {
    const result = await adapter.denseSearch(query)
    expect(result[0].score).toBeBetween(0, 1)
    expect(result[0].weightedScore).toBeDefined()
  })

  it('should handle errors consistently', () => {
    // Test error cases
  })
})
```

### Backend-Specific Tests

Each adapter also has backend-specific tests:

```typescript
describe('PostgreSQL Specific', () => {
  it('should use HNSW index', () => { })
  it('should support pgvector types', () => { })
  it('should handle large vector counts', () => { })
})

describe('Qdrant Specific', () => {
  it('should support scalar filtering', () => { })
  it('should handle gRPC protocol', () => { })
})
```

## Performance Considerations

Different backends have different characteristics:

### PostgreSQL + pgvector
- ✅ Consistent, predictable
- ✅ No separate service (embedded)
- ⚠️ Scaling limited to single machine (or PostgreSQL cluster)
- ✅ Good for < 10M vectors

### Qdrant
- ✅ Purpose-built for vector search
- ✅ Scales horizontally
- ✅ gRPC fast
- ⚠️ Separate service to manage

### Weaviate
- ✅ Hybrid capabilities (text + vectors)
- ✅ GraphQL interface
- ⚠️ Higher resource overhead

## Migration Path

Users can switch backends without code changes:

```typescript
// Start with PostgreSQL (v0.1.0)
const adapter = new PgVectorAdapter(pgConfig);

// Later switch to Qdrant
const adapter = new QdrantAdapter(qdrantConfig);

// RetrievalOps layer unchanged
const retrieval = new RetrievalOps({ store: adapter });
```

**Data Migration**: Each adapter provides migration tooling
- Export vectors from PostgreSQL
- Import vectors to Qdrant
- Verify count/checksums

## Configuration Consistency

Despite different backends, configuration follows patterns:

```typescript
// PostgreSQL
{
  connectionString: "postgresql://...",
  indexingStrategy: "hnsw",
  hnsw: { m: 16, efConstruction: 200, ef: 100 }
}

// Qdrant
{
  url: "http://localhost:6333",
  collectionName: "vectors",
  indexingStrategy: "hnsw",  // Same concept, different impl
  hnsw: { m: 16, ... }
}
```

Goal: Similar configuration structure regardless of backend.

## Observable Contracts

All adapters report consistent metrics:

```typescript
interface HealthStatus {
  healthy: boolean
  status: 'healthy' | 'degraded' | 'unhealthy'
  latencyMs: number       // All measure this
  vectorCount?: number    // All report this
  storageSize?: number    // All report this
}

interface AdapterStats {
  totalVectors: number
  storageUsed: number
  indexCount: number
  avgSearchLatencyMs: number
  queriesPerSecond: number
}
```

Metrics enable:
- Backend comparison
- Performance monitoring
- Capacity planning
- Cost analysis (storage, QPS)

## Versioning Strategy

APIs evolve, but adapters must be backward compatible:

```typescript
// v0.2.0
interface SearchAdapter {
  index(request: IndexRequest): Promise<IndexResult>
  denseSearch(request: DenseSearchRequest): Promise<SearchCandidate[]>
}

// v0.3.0 - add new method, keep old
interface SearchAdapter {
  index(request: IndexRequest): Promise<IndexResult>
  indexAsync(request: IndexRequest): Promise<void>  // New async variant
  denseSearch(request: DenseSearchRequest): Promise<SearchCandidate[]>
}
```

## Week 4-6 Timeline

### Week 4: PostgreSQL Adapter Refactoring
- [ ] Implement SearchAdapter interface in PgVectorAdapter
- [ ] Extract dense/keyword search to modules
- [ ] Add interface compliance tests
- [ ] Verify backward compatibility

### Week 5: Qdrant Adapter
- [ ] Create QdrantAdapter implementing SearchAdapter
- [ ] Add Qdrant-specific tests
- [ ] Document Qdrant setup
- [ ] Add migration guide (PostgreSQL → Qdrant)

### Week 6: Integration & Factory
- [ ] Create SearchAdapterFactory
- [ ] Add adapter selection examples
- [ ] Benchmarking across backends
- [ ] Update README with multi-DB support announcement

## Success Metrics

✅ SearchAdapter interface defined  
✅ PostgreSQL adapter implements interface  
✅ All interface methods tested  
✅ Qdrant adapter working  
✅ Same retrieval quality across backends  
✅ Easy to add new backends  
✅ Zero code changes in RetrievalOps core  

## Next: Detailed Implementation

See [SEARCH-ADAPTER-IMPLEMENTATION.md](./SEARCH-ADAPTER-IMPLEMENTATION.md) for step-by-step refactoring guide.
