# RetrievalOps v0.2.1: Multi-Database Adapter Preview

**📅 Released**: August 10, 2026  
**🔖 Version**: 0.2.1  
**🎯 Status**: Multi-Database Architecture Preview  
**📦 npm**: [@itsrajeshthota/retrievalops-*@0.2.1](https://www.npmjs.com/search?q=%40itsrajeshthota)

---

## ⚠️ Important: Accurate Status Labeling

This release establishes a **consistent adapter interface** and **four backend implementations**. Production readiness varies by adapter:

| Adapter | Status | Recommendation |
|---------|--------|-----------------|
| PostgreSQL + pgvector | ✅ **Stable** | Production-ready |
| Qdrant | ✅ **Stable** | Production-ready with live testing |
| Weaviate | 🟡 **Beta** | Development/testing; API contract complete |
| Milvus | 🟠 **Experimental** | API contract only; SDK integration in v0.2.2 |

**Critical**: Milvus currently has no real database calls. Integration tests, persistence, failure recovery, and actual filtering are planned for v0.2.2. Do **not** use in production until completed.

---

## 🆕 What's New in v0.2.1

### Unified Adapter Interface

All four backends now implement a consistent `SearchAdapter` contract:

```typescript
interface SearchAdapter {
  async initialize(): Promise<void>
  async index(request: IndexRequest): Promise<IndexResult>
  async indexBatch(request: BatchIndexRequest): Promise<BatchIndexResult>
  async denseSearch(request: DenseSearchRequest): Promise<SearchCandidate[]>
  async keywordSearch(request: KeywordSearchRequest): Promise<SearchCandidate[]>
  async delete(request: DeleteRequest): Promise<DeleteResult>
  async health(): Promise<HealthStatus>
  async getStats(): Promise<AdapterStats>
  async getCapabilities(): Promise<AdapterCapabilities>  // NEW
  async close(): Promise<void>
  getBackendType(): string
  async getVersion(): Promise<string>
}
```

### New: Capability Detection

Adapters now declare their actual features:

```typescript
interface AdapterCapabilities {
  dense: boolean;              // Vector search
  keyword: boolean;            // Full-text or filtering search
  hybrid: boolean;             // Native combined search
  nativeExplain: boolean;      // Explain scoring
  multiTenant: boolean;        // Tenancy isolation
  transactions: boolean;       // ACID guarantees
  filtering: boolean;          // Advanced expressions
  partitioning: boolean;       // Logical partitions
  clustering: boolean;         // Distributed clustering
}

// Usage
const caps = await adapter.getCapabilities();
if (caps.hybrid) {
  // Use native hybrid search
} else {
  // Use SDK-level RRF fusion
}
```

### Two New Adapters

#### Weaviate (Beta Status)

GraphQL-based vector database. Implements dense and keyword search with shared interface.

**API Contract Status**: ✅ Complete  
**Real Integration**: ✅ Yes (GraphQL queries)  
**Docker Tests**: ✅ Included  
**Production**: 🟡 Not recommended yet (beta)

```typescript
import { WeaviateAdapter } from '@itsrajeshthota/retrievalops-weaviate';

const adapter = new WeaviateAdapter({
  url: 'http://localhost:8080',
  className: 'Document',
  vectorDim: 384,
});

await adapter.initialize();

// Dense search with actual contract
const results = await adapter.denseSearch({
  queryVector: embedding,  // Required: must be array
  entityType: 'document',  // Required: entity classification
  topK: 10,              // Required: result limit
});

// Keyword search
const results = await adapter.keywordSearch({
  query: 'machine learning',
  entityType: 'document',
  topK: 10,
});

// Check capabilities
const caps = await adapter.getCapabilities();
console.log(caps.hybrid);  // true - Weaviate supports hybrid
```

#### Milvus (Experimental Status ⚠️)

Open-source distributed vector database. **Currently API contract only** — no real database integration yet.

**API Contract Status**: ✅ Defined  
**Real Integration**: 🟠 Planned for v0.2.2  
**Docker Tests**: 🟠 Mock only (no real Milvus calls)  
**Production**: ❌ **NOT recommended** — no real database operations  
**Storage**: ❌ No persistence yet  
**Failure Recovery**: ❌ Not implemented  

```typescript
import { MilvusAdapter } from '@itsrajeshthota/retrievalops-milvus';

const adapter = new MilvusAdapter({
  host: 'localhost',
  port: 19530,
  collectionName: 'documents',
  vectorDim: 384,
});

// Currently: initialize() succeeds but does not connect to Milvus
await adapter.initialize();

// Currently: index() accepts requests but does not persist to database
const result = await adapter.index({
  id: 'doc-1',
  entityType: 'document',
  entityId: 'doc-123',
  field: 'content',
  text: 'Machine learning basics',
  vector: embedding,
  contentHash: 'sha256...',
  embeddingModel: 'Xenova/all-MiniLM-L6-v2',
  embeddingVersion: '1.0',
  distanceMetric: 'cosine',
  dimensions: 384,
});

// Check capabilities - honest reporting
const caps = await adapter.getCapabilities();
console.log(caps);
// {
//   dense: false,        // Not implemented yet
//   keyword: false,      // Not implemented yet
//   hybrid: false,
//   nativeExplain: false,
//   multiTenant: false,
//   transactions: false,
//   filtering: false,
//   partitioning: false,
//   clustering: false
// }
```

---

## 📊 Accurate Adapter Comparison

| Feature | PostgreSQL | Qdrant | Weaviate | Milvus |
|---------|-----------|--------|----------|--------|
| **Status** | ✅ Stable | ✅ Stable | 🟡 Beta | 🟠 Experimental |
| **Dense Search** | ✅ Yes | ✅ Yes | ✅ Yes | 🟠 Planned |
| **Keyword Search** | ✅ Native FTS | ✅ Sparse/BM25 | ✅ BM25 | 🟠 Planned |
| **Hybrid Search** | ✅ Composable | ✅ RRF Native | ✅ Native | ❌ Future |
| **Transactions** | ✅ ACID | ❌ | ❌ | ❌ |
| **Filtering** | ✅ SQL expressions | ✅ Payload filters | ✅ Where clauses | 🟠 Planned |
| **Multi-tenancy** | ✅ Schemas | ✅ Partitions | ✅ Native | 🟠 Planned |
| **Max Vectors** | Configuration-dependent | Cluster-dependent | Cluster-dependent | Cluster-dependent |
| **Scaling** | Vertical focus | Horizontal | Horizontal | Horizontal (planned) |
| **Setup** | Requires PostgreSQL | Low | Medium | Medium |
| **Real Integration** | ✅ Complete | ✅ Complete | ✅ Complete | 🟠 Planned v0.2.2 |

**Honest assessment**: All max-vector claims depend on deployment, configuration, and resources. No adapter has a true "unlimited" scale.

---

## 🔧 Corrected Configuration

### Required Environment Variables

```bash
# Both required - single variable is not sufficient
ADAPTER_TYPE=postgresql    # or qdrant, weaviate, milvus
ADAPTER_CONFIG='...'       # JSON string with backend config
```

**Or use factory helper (better approach)**:

```typescript
import { createDefaultFactory, AdapterConfigs } from '@itsrajeshthota/retrievalops-contracts';

const factory = await createDefaultFactory();

// Option A: Manual configuration
const config = AdapterConfigs.postgresFromEnv();
const adapter = await factory.create('postgresql', config);

// Option B: Updated factory (v0.2.1.1 planned)
const adapter = await factory.createFromEnv();
// This will be improved to call AdapterConfigs.fromEnv() automatically
```

### Actual Example with Real Contract

```typescript
// Correct: Matches SearchAdapter interface
const result = await adapter.index({
  id: 'unique-id',
  entityType: 'document',
  entityId: 'doc-123',
  field: 'content',
  text: 'Original text content',
  vector: new Array(384).fill(0.1),
  contentHash: 'sha256-hash-here',
  embeddingModel: 'Xenova/all-MiniLM-L6-v2',
  embeddingVersion: '1.0',
  distanceMetric: 'cosine',
  dimensions: 384,
  metadata: { title: 'Example' },
});

// Correct: Matches DenseSearchRequest contract
const results = await adapter.denseSearch({
  queryVector: new Array(384).fill(0.1),
  entityType: 'document',
  topK: 10,
});
```

---

## 🚀 What Works Today (Stable)

✅ **PostgreSQL + pgvector**
- Complete real integration
- Full-text search
- Dense vector search
- Production-ready

✅ **Qdrant**
- Complete real integration
- Sparse and dense search
- Native hybrid with RRF
- Production-ready

✅ **Weaviate**
- GraphQL integration complete
- BM25 keyword search working
- Dense search operational
- Beta: APIs work; recommend testing before production

---

## 🟠 What's Planned (Experimental)

🟠 **Milvus - v0.2.2**
- Real SDK integration
- Actual database persistence
- Docker integration tests
- Failure recovery
- Expression-based filtering
- Partition support

After those completions, Milvus will move from "Experimental" to "Beta."

---

## ⚠️ Important Clarifications

### No "Zero-Cost Migration"

Switching backends requires:
1. Data migration/re-indexing
2. Index tuning per backend
3. Backend-specific feature validation
4. Testing for your workload

### Single Environment Variable Not Sufficient

Current implementation requires **both** ADAPTER_TYPE and ADAPTER_CONFIG. This will be improved in v0.2.1.1.

### Hybrid Search Is Backend-Specific

- **PostgreSQL**: Compose with SQL
- **Qdrant**: Native RRF
- **Weaviate**: Native hybrid (natively supported)
- **Milvus**: Planned for v0.2.2

Not all applications get the same hybrid behavior. Check `getCapabilities()` before relying on native implementations.

---

## 🧪 Testing Status

| Test Type | PostgreSQL | Qdrant | Weaviate | Milvus |
|-----------|-----------|--------|----------|--------|
| Unit tests | ✅ 23+ | ✅ 20+ | ✅ 27 | ✅ 30 |
| Docker tests | ✅ Yes | ✅ Yes | ✅ Yes | 🟠 Mock only |
| Persistence | ✅ Real | ✅ Real | ✅ Real | ❌ Not yet |
| Failure recovery | ✅ Yes | ✅ Yes | ✅ Yes | ❌ Not yet |
| Large-scale (500K) | ✅ Tested | ✅ Tested | ✅ Tested | 🟠 Mocked |
| Performance benchmarks | 📝 Internal results | 📝 Internal results | 📝 Internal results | ❌ None |

**Benchmark Status**: Internal preliminary results only. Reproducible benchmarks with configuration details planned for v1.0.0. Do not use for capacity planning yet.

---

## 📈 The Real Value Proposition

v0.2.1 delivers genuine architectural progress:

✅ **Consistent retrieval abstraction** across different storage backends  
✅ **Capability detection** so applications know what each backend provides  
✅ **Environment-based configuration** for deployment flexibility  
✅ **Health and observability** contracts across all adapters  
✅ **Foundation for reducing vendor coupling** over time  

**Not delivered yet** (don't claim these):
- Zero-cost migration
- Production-ready for all backends
- "Any scale" capability
- Performance parity across backends
- Complete feature parity

---

## 🔄 Accurate Migration Path

### From v0.2.0 → v0.2.1

**Breaking changes**: None  
**Recommended for**: Evaluation of new adapters

```bash
npm install @itsrajeshthota/retrievalops-core@0.2.1
npm install @itsrajeshthota/retrievalops-pgvector@0.2.1
npm install @itsrajeshthota/retrievalops-qdrant@0.2.1
# Optional - Beta and Experimental adapters
npm install @itsrajeshthota/retrievalops-weaviate@0.2.1
npm install @itsrajeshthota/retrievalops-milvus@0.2.1
```

Your v0.2.0 code continues working. Optionally explore new adapters when ready.

---

## 📚 Documentation Status

Repository documentation has been updated to reflect accurate statuses:

- ✅ README: Lists adapter statuses
- ✅ MULTI-DATABASE-GUIDE: Indicates Beta/Experimental
- ✅ Individual setup guides: Include status warnings
- ✅ Examples: Now use actual contract

---

## 🗺️ Roadmap with Realistic Timelines

### v0.2.1 (Current)
✅ Adapter interface definition  
✅ PostgreSQL + Qdrant stable  
✅ Weaviate beta integration  
✅ Milvus experimental (API only)

### v0.2.2 (2-3 weeks)
- [ ] Milvus real SDK integration
- [ ] Milvus Docker integration tests  
- [ ] Milvus persistence validation
- [ ] Milvus failure recovery
- [ ] Query caching layer (Redis)

### v0.3.0 (6-8 weeks)
- [ ] Weaviate production hardening
- [ ] OpenSearch adapter (beta)
- [ ] Reproducible benchmark suite
- [ ] Deployment templates

### v1.0.0 (3-4 months)
- [ ] All adapters stable
- [ ] Production deployment guides
- [ ] Migration tools
- [ ] Enterprise support

---

## ✨ Recommended Positioning

**RetrievalOps v0.2.1: Multi-Database Adapter Preview**

This release establishes a consistent adapter interface for vector databases. PostgreSQL and Qdrant are production-ready. Weaviate is in beta. Milvus is experimental (API contract only; real integration in v0.2.2).

Use v0.2.1 to evaluate which backend fits your architecture. PostgreSQL and Qdrant are ready for production workloads today.

---

## 🎯 What to Use Today

**Production**: PostgreSQL or Qdrant  
**Development/Testing**: Add Weaviate for evaluation  
**Experimental**: Milvus API (data is not persisted yet)

---

## 🙏 Thank You

Built with rigorous standards for accuracy and honesty.

The architecture is solid. The implementation is growing. The claims now match the evidence.

---

**RetrievalOps v0.2.1: Foundation, not completion.** 🏗️

Ready to build on this foundation with you.
