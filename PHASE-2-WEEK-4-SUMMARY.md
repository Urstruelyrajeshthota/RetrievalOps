# Phase 2 Week 4 Summary: SearchAdapter Interface Design

**Date**: Aug 10, 2026  
**Status**: ✅ Design Complete  
**Duration**: 6 hours  

## Overview

Week 4 defines the unified SearchAdapter interface that enables multi-database support across PostgreSQL, Qdrant, Weaviate, Milvus, and OpenSearch.

## What Was Done

### 1. Designed SearchAdapter Interface

**File**: `packages/contracts/src/search-adapter.ts`

Complete interface specification with:
- ✅ Type definitions for all operations
- ✅ Unified data models
- ✅ Consistent error handling
- ✅ Observable contracts (health, stats)
- ✅ Support for all search modes (dense, keyword, hybrid)

### 2. Created Architecture Design Document

**File**: `SEARCH-ADAPTER-DESIGN.md`

Comprehensive design covering:
- ✅ Architecture diagram
- ✅ Interface design rationale
- ✅ Implementation plan (3 phases)
- ✅ Backend differences handling
- ✅ Data model consistency
- ✅ Performance considerations
- ✅ Migration path
- ✅ Testing strategy
- ✅ Week 4-6 timeline

## SearchAdapter Interface

### Core Operations (8 methods)

```typescript
interface SearchAdapter {
  // Initialization
  async initialize(): Promise<void>
  
  // Indexing
  async index(request: IndexRequest): Promise<IndexResult>
  async indexBatch(request: BatchIndexRequest): Promise<BatchIndexResult>
  
  // Search
  async denseSearch(request: DenseSearchRequest): Promise<SearchCandidate[]>
  async keywordSearch(request: KeywordSearchRequest): Promise<SearchCandidate[]>
  
  // Data Management
  async delete(request: DeleteRequest): Promise<DeleteResult>
  
  // Observability
  async health(): Promise<HealthStatus>
  async getStats(): Promise<AdapterStats>
  async close(): Promise<void>
  
  // Identification
  getBackendType(): 'postgresql' | 'qdrant' | 'weaviate' | 'milvus' | 'opensearch'
  getVersion(): string
}
```

## Data Models

### Indexing

```typescript
interface IndexRequest {
  id: string                      // Vector ID
  entityType: string              // e.g., "jira_ticket"
  entityId: string                // e.g., "PROJ-123"
  field: string                   // e.g., "title", "description"
  text: string                    // Original content
  vector: number[]                // 384D vector
  contentHash: string             // SHA-256 for dedup
  embeddingModel: string          // Model used
  metadata?: Record<string, any>  // Custom metadata
  weight?: number                 // Field weight
  retrievalStrategies?: string[]  // semantic, keyword, exact
}
```

### Search Results

```typescript
interface SearchCandidate {
  vectorId: string      // Unique ID
  entityType: string    // e.g., "jira_ticket"
  entityId: string      // e.g., "PROJ-123"
  field: string         // Which field matched
  text: string          // Snippet
  score: number         // Normalized 0.0-1.0
  scoreSource: string   // 'dense' | 'keyword' | 'hybrid'
  fieldWeight: number   // Weight applied
  weightedScore: number // Final score
  metadata?: Record<string, any>
}
```

## Implementation Phases

### Phase 1: PostgreSQL Adapter (Week 4)
- [ ] Refactor PgVectorAdapter to implement SearchAdapter
- [ ] Extract denseSearch logic
- [ ] Extract keywordSearch logic
- [ ] Add interface compliance tests
- [ ] Maintain backward compatibility

**Outcome**: PostgreSQL adapter fully implements SearchAdapter

### Phase 2: Qdrant Adapter (Week 5)
- [ ] Create QdrantAdapter implementing SearchAdapter
- [ ] Add gRPC client integration
- [ ] Implement dense search (native HNSW)
- [ ] Implement keyword search (filtering + dense)
- [ ] Add Qdrant-specific tests

**Outcome**: Qdrant adapter working, same API as PostgreSQL

### Phase 3: Integration (Week 6)
- [ ] Create SearchAdapterFactory
- [ ] Add adapter selection examples
- [ ] Benchmarking across backends
- [ ] Update README with multi-DB support

**Outcome**: Users can choose any backend easily

## Key Design Decisions

### 1. Separate Dense & Keyword Methods

```typescript
// NOT combined into one method
async search(query): Promise<results>

// But separate
async denseSearch(...): Promise<SearchCandidate[]>
async keywordSearch(...): Promise<SearchCandidate[]>
```

**Why**: Different algorithms, different optimization strategies, RRF fusion at core layer

### 2. Normalized Scoring (0.0-1.0)

All backends return scores normalized to [0, 1] range:
- PostgreSQL cosine: -1 to 1 → 0 to 1
- Qdrant similarity: 0 to 1 → unchanged
- Weaviate distance: 0 to ∞ → 0 to 1
- BM25 relevance: varies → normalized

**Why**: RetrievalOps core assumes consistent [0, 1] range

### 3. Consistent Metadata Handling

All backends support arbitrary metadata:
- PostgreSQL: JSON columns
- Qdrant: Payload fields
- Weaviate: Additional properties
- Milvus: Extra fields

**Why**: Enables field filtering, sorting, display

### 4. Optional Methods vs Required

All methods are required (interface compliance):
- No "best-effort" implementations
- No partial implementations
- All backends guarantee same capabilities

**Exception**: Keyword search
- PostgreSQL: Native FTS
- Qdrant: Implemented via filtering
- Result: Consistent behavior, different implementation

## Backend Differences Handled

### Dense Search

| Backend | Approach | Algorithm |
|---------|----------|-----------|
| PostgreSQL | SQL + index | HNSW or IVFFlat |
| Qdrant | gRPC | Native HNSW |
| Weaviate | GraphQL | Native HNSW |
| Milvus | Python SDK | Native HNSW |
| OpenSearch | REST + Lucene | Native HNSW |

**Abstracted by adapter**: Caller doesn't see differences

### Keyword Search

| Backend | Approach | Algorithm |
|---------|----------|-----------|
| PostgreSQL | FTS | tsvector + tsquery |
| Qdrant | Scalar filtering | Payload conditions |
| Weaviate | GraphQL filters | Like/ilike operators |
| Milvus | Scalar filters | Expression language |
| OpenSearch | Query DSL | Match/match_phrase |

**Abstracted by adapter**: Same interface, different implementation

## Observable Contracts

All adapters report:

```typescript
// Health
{
  healthy: true,
  status: 'healthy',
  latencyMs: 45,
  vectorCount: 50000,
  storageSize: 344000000  // 344MB
}

// Stats
{
  totalVectors: 50000,
  storageUsed: 344000000,
  indexCount: 4,
  avgSearchLatencyMs: 35,
  queriesPerSecond: 100,
  byEntityType: {
    'jira_ticket': {vectorCount: 30000, storageUsed: 206400000},
    'document': {vectorCount: 20000, storageUsed: 137600000}
  }
}
```

**Benefits**:
- Backend comparison
- Performance monitoring
- Capacity planning
- Cost analysis

## Migration Path

Users can switch backends transparently:

```typescript
// v0.2.0: Start with PostgreSQL
const adapter = new PgVectorAdapter(pgConfig);
const retrieval = new RetrievalOps({ store: adapter });

// v0.2.1: Switch to Qdrant (same code!)
const adapter = new QdrantAdapter(qdrantConfig);
const retrieval = new RetrievalOps({ store: adapter });

// Retrieval code unchanged
const results = await retrieval.search({entity, query});
```

## Versioning Strategy

Interface evolution is backward compatible:

```typescript
// v0.2.0
interface SearchAdapter {
  index(request): Promise<IndexResult>
  denseSearch(request): Promise<SearchCandidate[]>
}

// v0.3.0 - add new method, keep old
interface SearchAdapter {
  index(request): Promise<IndexResult>
  indexAsync(request): Promise<void>  // New
  denseSearch(request): Promise<SearchCandidate[]>
}

// v0.4.0 - deprecate old method
interface SearchAdapter {
  index(request): Promise<IndexResult> // deprecated
  indexAsync(request): Promise<void>   // preferred
  denseSearch(request): Promise<SearchCandidate[]>
}
```

Adapters support multiple versions during transition period.

## Testing Strategy

### Interface Compliance Tests

Every adapter must pass:
- Method availability
- Return type consistency
- Error handling
- Edge cases

### Backend-Specific Tests

Each backend has additional tests for:
- Protocol specifics (SQL, gRPC, GraphQL)
- Scaling characteristics
- Performance profiles
- Edge cases

### Integration Tests

Verify multi-adapter scenarios:
- Migration from PostgreSQL to Qdrant
- Same results from different backends
- Failover between adapters

## Files Created

### Core Interface
- `packages/contracts/src/search-adapter.ts` — Interface definition

### Design & Planning
- `SEARCH-ADAPTER-DESIGN.md` — Complete design document

## Week 4 Accomplishments

✅ Defined complete SearchAdapter interface  
✅ Designed data model consistency  
✅ Planned implementation across 3 phases  
✅ Documented backend differences handling  
✅ Created architecture diagram  
✅ Established testing strategy  
✅ Defined observable contracts  
✅ Designed migration path  

## Week 4-6 Timeline

### Week 4 (This): Design Phase ✅
- ✅ SearchAdapter interface defined
- ✅ Architecture designed
- ✅ Implementation plan created
- ✅ Testing strategy established

### Week 5: PostgreSQL Refactoring
- [ ] Implement SearchAdapter in PgVectorAdapter
- [ ] Extract dense/keyword search modules
- [ ] Add interface compliance tests
- [ ] Verify backward compatibility

### Week 6: Qdrant Adapter
- [ ] Create QdrantAdapter
- [ ] Implement dense search (native)
- [ ] Implement keyword search (filtering)
- [ ] Add tests and documentation

### Week 7: Integration & Factory
- [ ] Create SearchAdapterFactory
- [ ] Add adapter selection examples
- [ ] Benchmarking across backends
- [ ] Update README

## Success Criteria

✅ Complete SearchAdapter interface  
✅ Design documents and diagrams  
✅ Implementation plan for 3 backends  
✅ Testing strategy defined  
✅ Zero impact on existing code  
✅ Clear migration path  
✅ Observable contracts  

## Impact on RetrievalOps Core

**Zero changes required** to retrieval core:
- SearchAdapter is pluggable
- Core uses abstract interface
- No coupling to specific backends
- Can switch backends without code changes

## Next: Week 5

Start PostgreSQL adapter refactoring to implement SearchAdapter interface.

---

## Phase 2 Progress Summary

| Week | Feature | Status |
|------|---------|--------|
| 1 | HNSW Implementation | ✅ Complete |
| 2-3 | Benchmarking Setup | ✅ Complete |
| 3 | HNSW Default | ✅ Complete |
| 4 | SearchAdapter Design | ✅ Complete |
| 5 | PostgreSQL Refactoring | ⏳ Next |
| 6 | Qdrant Adapter | ⏳ Next |
| 7 | Integration | ⏳ Next |
| 8 | Release v0.2.0 | ⏳ Next |

**Current**: Week 4 complete, heading into Week 5 implementation phase 🚀
