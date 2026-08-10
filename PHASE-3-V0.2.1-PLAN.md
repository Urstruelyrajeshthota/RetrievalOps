# Phase 3: v0.2.1 Implementation Plan
## Weaviate & Milvus Adapters + Query Caching

**Target Duration**: 2-3 weeks (20-24 hours)  
**Start Date**: August 10, 2026  
**Goal**: Expand database support to Weaviate and Milvus, add query caching

---

## 📋 Overview

v0.2.1 expands RetrievalOps to support two additional vector databases:
- **Weaviate**: GraphQL-based, native FTS, excellent for enterprises
- **Milvus**: Distributed, massive scale, open-source alternative

Plus add query result caching for 10-50% latency reduction on repeated searches.

---

## 🎯 Phase Goals

| Goal | Target | Priority |
|------|--------|----------|
| Weaviate adapter complete | 100% SearchAdapter impl | ⭐⭐⭐ |
| Milvus adapter complete | 100% SearchAdapter impl | ⭐⭐⭐ |
| Query caching layer | Redis backend | ⭐⭐ |
| 50+ adapter tests | All compliance tests | ⭐⭐⭐ |
| Documentation | Setup guides + examples | ⭐⭐⭐ |
| Backward compatibility | 100% with v0.2.0 | ⭐⭐⭐ |

---

## 🗓️ Week-by-Week Breakdown

### Week 1: Weaviate Adapter (6-8 hours)

#### 1.1 Weaviate Type Definitions
**File**: `packages/adapters/weaviate/src/types.ts` (~100 lines)

```typescript
interface WeaviateAdapterConfig {
  url: string                    // e.g., "http://localhost:8080"
  apiKey?: string               // For cloud instances
  className: string             // Weaviate class name
  vectorProperty?: string       // Default: "vector"
  distanceMetric?: 'cosine' | 'euclidean' | 'manhattan'
  hnsw?: HNSWConfig
  requestTimeout?: number       // Default: 30000ms
  autoCreate?: boolean          // Auto-create class if missing
}

interface WeaviateObject {
  id: string
  properties: Record<string, any>
  vector?: number[]
  creationTimeUnix?: number
  lastUpdateTimeUnix?: number
}

interface WeaviateSearchResult {
  objects?: WeaviateObject[]
  totalResults?: number
}
```

**Deliverables**:
- ✅ Type-safe config interface
- ✅ Weaviate API response types
- ✅ HNSW parameter support
- ✅ Full TypeScript coverage

#### 1.2 Weaviate Adapter Implementation
**File**: `packages/adapters/weaviate/src/adapter.ts` (~450 lines)

Implement SearchAdapter interface:
- ✅ `initialize()` - Create class if needed, verify connection
- ✅ `index()` - Single object indexing via GraphQL mutation
- ✅ `indexBatch()` - Batch import with continue-on-error
- ✅ `denseSearch()` - Vector search using `nearVector`
- ✅ `keywordSearch()` - Native FTS using `where` clauses + `bm25`
- ✅ `delete()` - By ID, entity, tenant
- ✅ `health()` - /meta endpoint check
- ✅ `getStats()` - Class statistics
- ✅ `close()` - No-op (stateless HTTP client)

**Key Features**:
```typescript
// Dense search with Weaviate
const results = await adapter.denseSearch({
  query: [0.1, 0.2, 0.3, ...],
  limit: 10,
  fields: ['title', 'content']
});

// Keyword search with BM25 scoring
const results = await adapter.keywordSearch({
  query: 'hello world',
  limit: 10,
  fields: ['title', 'content']
});

// Hybrid search (Weaviate native!)
const results = await adapter.hybridSearch({
  query: 'hello world',
  vectorQuery: [0.1, 0.2, 0.3, ...],
  limit: 10,
  alpha: 0.5  // 50% keyword, 50% vector
});
```

**Deliverables**:
- ✅ Full SearchAdapter implementation
- ✅ GraphQL client for queries
- ✅ Batch operations with error handling
- ✅ Score normalization to [0,1]
- ✅ Multi-tenant support via filters

#### 1.3 Weaviate Tests
**File**: `packages/adapters/weaviate/tests/adapter.spec.ts` (~250 lines)

- ✅ Connection/initialization tests
- ✅ Indexing (single + batch)
- ✅ Dense search accuracy
- ✅ Keyword search precision
- ✅ Hybrid search correctness
- ✅ Delete operations
- ✅ Health checks
- ✅ Statistics collection
- ✅ Score normalization validation

**Test Strategy**:
- Graceful skip if Weaviate unavailable (docker-compose)
- 20+ test cases covering all methods
- Mock tests for common scenarios
- Integration tests against real instance

#### 1.4 Weaviate Documentation
**File**: `packages/adapters/weaviate/SETUP.md` (~150 lines)

- Local setup with Docker
- Cloud instance setup
- Configuration guide
- Performance tuning
- Hybrid search explanation
- Troubleshooting guide

**Deliverables**:
- ✅ Step-by-step setup
- ✅ Configuration examples
- ✅ Performance comparison
- ✅ Migration from other adapters

---

### Week 2: Milvus Adapter (6-8 hours)

#### 2.1 Milvus Type Definitions
**File**: `packages/adapters/milvus/src/types.ts` (~120 lines)

```typescript
interface MilvusAdapterConfig {
  host: string                  // e.g., "localhost"
  port: number                  // Default: 19530
  database?: string             // Default: "default"
  collectionName: string
  vectorField?: string          // Default: "vector"
  metricType?: 'L2' | 'IP' | 'COSINE'  // Default: COSINE
  indexType?: 'IVF_FLAT' | 'IVF_SQ8' | 'HNSW' | 'SCANN'
  hnsw?: {
    m?: number                  // Default: 8
    efConstruction?: number     // Default: 200
  }
  timeout?: number              // Default: 30000ms
  autoCreate?: boolean          // Auto-create collection
}

interface MilvusEntity {
  id: string | number
  vector: number[]
  metadata: Record<string, any>
}

interface MilvusSearchResponse {
  results?: Array<{
    id: string | number
    score: number
    metadata?: Record<string, any>
  }>
  time?: number
}
```

**Deliverables**:
- ✅ Milvus client SDK types
- ✅ Collection schema types
- ✅ Search response types
- ✅ Index configuration

#### 2.2 Milvus Adapter Implementation
**File**: `packages/adapters/milvus/src/adapter.ts` (~500 lines)

Implement SearchAdapter interface:
- ✅ `initialize()` - Connect, create collection, load into memory
- ✅ `index()` - Insert single entity
- ✅ `indexBatch()` - Batch insert with configurable size
- ✅ `denseSearch()` - Vector search with filtering
- ✅ `keywordSearch()` - Scalar filtering + BM25 if available
- ✅ `delete()` - By ID with expression filtering
- ✅ `health()` - Status check + node info
- ✅ `getStats()` - Collection statistics
- ✅ `close()` - Release collection + disconnect

**Key Features**:
```typescript
// Dense search at massive scale
const results = await adapter.denseSearch({
  query: [0.1, 0.2, 0.3, ...],
  limit: 100,
  filter: "metadata['category'] == 'news'"
});

// Hybrid with dynamic filtering
const results = await adapter.denseSearch({
  query: [0.1, 0.2, 0.3, ...],
  limit: 50,
  filter: "metadata['date'] > 1691000000"
});

// Keyword via scalar fields
const results = await adapter.keywordSearch({
  query: 'python',
  limit: 20,
  filter: "metadata['language'] == 'en'"
});
```

**Advanced Features**:
- Partition-based routing for multi-tenant
- Expression-based filtering
- Configurable batch sizes
- Automatic collection loading
- Schema validation

**Deliverables**:
- ✅ Full SearchAdapter implementation
- ✅ Milvus SDK client wrapper
- ✅ Expression filter builder
- ✅ Collection auto-creation
- ✅ Batch operations with chunking

#### 2.3 Milvus Tests
**File**: `packages/adapters/milvus/tests/adapter.spec.ts` (~280 lines)

- ✅ Connection + collection setup
- ✅ Single/batch indexing
- ✅ Dense search with filters
- ✅ Keyword search via scalar
- ✅ Complex filtering expressions
- ✅ Delete operations
- ✅ Health + stats
- ✅ Partition routing
- ✅ Large-scale indexing (1M+ entities)

**Test Scenarios**:
- Basic CRUD operations
- Filter expressions
- Range queries
- Partition isolation
- Concurrency handling
- Error scenarios

#### 2.4 Milvus Documentation
**File**: `packages/adapters/milvus/SETUP.md` (~180 lines)

- Local setup with Docker (docker-compose)
- Milvus Cloud setup
- Collection schema guide
- Configuration profiles (light/standard/heavy)
- Partitioning strategy
- Performance tuning
- Scaling to millions of vectors
- Troubleshooting

**Deliverables**:
- ✅ Getting started guide
- ✅ Performance profiles
- ✅ Advanced configuration
- ✅ Deployment guide

---

### Week 3: Query Caching & Factory Updates (4-6 hours)

#### 3.1 Query Cache Layer
**File**: `packages/core/src/query-cache.ts` (~200 lines)

```typescript
interface CacheConfig {
  backend: 'redis' | 'memory'
  ttl?: number              // Default: 3600 (1 hour)
  maxSize?: number          // Default: 1000 entries
  keyPrefix?: string        // Default: 'retrieval:'
}

interface QueryCache {
  get(key: string): Promise<SearchCandidate[] | null>
  set(key: string, results: SearchCandidate[]): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
  health(): Promise<boolean>
}
```

**Implementation**:
- ✅ Memory cache (for dev/testing)
- ✅ Redis cache (production)
- ✅ Deterministic key generation
- ✅ TTL-based expiration
- ✅ Size-based eviction

#### 3.2 Adapter Factory Updates
**File**: `packages/contracts/src/adapter-factory.ts` (update ~50 lines)

- ✅ Register Weaviate adapter
- ✅ Register Milvus adapter
- ✅ `createFromEnv()` support for new adapters
- ✅ Pre-registered factory includes all 4 backends

**Updated Factory**:
```typescript
const factory = new SearchAdapterFactory();
factory.register('postgresql', async (c) => new PgVectorAdapter(c));
factory.register('qdrant', async (c) => new QdrantAdapter(c));
factory.register('weaviate', async (c) => new WeaviateAdapter(c));
factory.register('milvus', async (c) => new MilvusAdapter(c));

const adapter = await factory.create('weaviate', config);
```

#### 3.3 Integration Examples
**File**: `examples/multi-adapter-retrieval/index.ts` (update ~100 lines)

Add examples for:
- ✅ Weaviate standalone example
- ✅ Milvus standalone example
- ✅ Weaviate with hybrid search
- ✅ Milvus with filtering
- ✅ Query caching integration

#### 3.4 Multi-Database Guide Update
**File**: `MULTI-DATABASE-GUIDE.md` (add ~300 lines)

New sections:
- ✅ Weaviate quick start
- ✅ Milvus quick start
- ✅ 6-way adapter comparison table
- ✅ When to use each backend
- ✅ Migration paths
- ✅ Query caching guide
- ✅ Performance comparison (4 adapters)

#### 3.5 Release Notes
**File**: `RELEASE-v0.2.1.md` (~200 lines)

- ✅ New features summary
- ✅ Performance improvements
- ✅ Migration guide
- ✅ Known limitations
- ✅ v0.2.2 roadmap

---

## 📊 Detailed File Structure

```
packages/adapters/
├── weaviate/
│   ├── src/
│   │   ├── adapter.ts          (450 lines)
│   │   ├── types.ts            (100 lines)
│   │   └── index.ts
│   ├── tests/
│   │   └── adapter.spec.ts     (250 lines)
│   ├── SETUP.md                (150 lines)
│   ├── package.json
│   └── tsconfig.json
├── milvus/
│   ├── src/
│   │   ├── adapter.ts          (500 lines)
│   │   ├── types.ts            (120 lines)
│   │   └── index.ts
│   ├── tests/
│   │   └── adapter.spec.ts     (280 lines)
│   ├── SETUP.md                (180 lines)
│   ├── package.json
│   └── tsconfig.json
└── [existing: pgvector, qdrant, opensearch]

packages/core/
└── src/
    └── query-cache.ts          (200 lines - NEW)

examples/
└── multi-adapter-retrieval/
    └── index.ts                (updated +100 lines)
```

---

## 🧪 Testing Strategy

### Unit Tests
- ✅ 20+ tests per adapter
- ✅ Interface compliance validation
- ✅ Score normalization
- ✅ Error handling

### Integration Tests
- ✅ Real adapter instances (Docker)
- ✅ Full CRUD workflows
- ✅ Batch operations
- ✅ Concurrent operations

### Performance Tests
- ✅ Query latency (10K queries)
- ✅ Indexing speed (1M entities)
- ✅ Memory usage
- ✅ Comparison: Weaviate vs Qdrant vs PostgreSQL vs Milvus

### Coverage
- Target: >95% code coverage
- All adapters must pass SearchAdapter compliance suite

---

## 📈 Success Criteria

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| Code delivery | 1500+ lines | Adapter implementations |
| Tests | 50+ new tests | All passing |
| Documentation | 4 new guides | Setup + examples |
| Backward compatibility | 100% | v0.2.0 unchanged |
| Performance | 0-10ms latency | Query caching benefit |
| Adapter parity | 100% | All 4 adapters implement SearchAdapter |

---

## 🚀 Comparison Matrix (v0.2.1)

| Feature | PostgreSQL | Qdrant | Weaviate | Milvus |
|---------|-----------|--------|----------|--------|
| Dense search | ✅ | ✅ | ✅ | ✅ |
| Keyword search | ✅ Native | ⚠️ Workaround | ✅ Native | ⚠️ Limited |
| Hybrid search | ❌ | ❌ | ✅ Native | ❌ |
| Scaling | Vertical | Horizontal | Horizontal | Horizontal |
| HNSW | ✅ | ✅ | ✅ | ✅ |
| Cloud option | Many | Qdrant Cloud | Weaviate Cloud | Milvus Cloud |
| GraphQL | ❌ | ❌ | ✅ | ❌ |
| Open source | ✅ | ✅ | ✅ | ✅ |
| Setup complexity | Low | Low | Medium | Medium |

---

## 📅 Timeline

| Week | Task | Hours | Status |
|------|------|-------|--------|
| 1 | Weaviate adapter | 8 | 🚧 Planned |
| 2 | Milvus adapter | 8 | 🚧 Planned |
| 3 | Caching + Factory | 6 | 🚧 Planned |
| **Total** | **v0.2.1 Complete** | **22** | **🚧 Planned** |

---

## 🎯 Next Steps

1. **Week 1 Start**: Implement Weaviate adapter
   - Set up package structure
   - Implement types
   - Implement adapter
   - Write tests
   - Create docs

2. **Week 2 Start**: Implement Milvus adapter
   - Parallel to Weaviate
   - Same structure, different backend
   - Comprehensive tests

3. **Week 3 Start**: Integration & caching
   - Update factory
   - Add cache layer
   - Create examples
   - Write release notes

4. **Ship v0.2.1**: Publish to npm
   - Tag v0.2.1
   - Create GitHub release
   - Announce release

---

## 🎁 Bonus Features (If Time)

- [ ] Query result ranking improvements (LLM-based)
- [ ] Advanced filtering DSL
- [ ] Result explainability
- [ ] Cost estimation per query
- [ ] Multi-region deployment guide

---

## 📝 Notes

- All adapters must maintain SearchAdapter interface consistency
- Backward compatibility with v0.2.0 is critical
- Performance should match or exceed existing adapters
- Documentation must be production-ready
- Tests must have >95% coverage

---

**v0.2.1 Ready to Build!** 🚀

