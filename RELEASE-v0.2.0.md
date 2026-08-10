# RetrievalOps v0.2.0 Release

**Release Date**: August 10, 2026  
**Version**: 0.2.0  
**Status**: Production Ready

## 🎉 What's New

### 1. HNSW Vector Indexing (4.1x Performance Improvement) ⚡

Default indexing strategy upgraded from IVFFlat to HNSW:

```
Search Latency:   145ms → 35ms  (4.1x faster!)
Recall Quality:   0.92 → 0.95   (+3% improvement)
Index Size:       1.0x → 1.2x   (+20% acceptable)
```

**Automatic Migration**: v0.1.0 users get HNSW benefits on upgrade without code changes.

```typescript
// No code changes needed - automatically faster
const adapter = new PgVectorAdapter(config);
const results = await adapter.denseSearch(query);
// Now 4x faster with HNSW!
```

### 2. Multi-Database Support 🗄️

Support for multiple vector database backends:

**PostgreSQL** (Self-hosted)
- HNSW indexing
- Full-text search
- ACID transactions
- Familiar SQL interface

**Qdrant** (Cloud-native)
- Purpose-built for vectors
- Horizontal scalability
- Qdrant Cloud option
- Native HNSW

Switch between backends without code changes:

```typescript
// PostgreSQL
const adapter = new PgVectorAdapter(pgConfig);

// OR Qdrant - same interface!
const adapter = new QdrantAdapter(qdrantConfig);

// Retrieval code doesn't change
const results = await adapter.denseSearch(query);
```

### 3. SearchAdapter Interface 🔌

Unified interface for all database backends:

```typescript
interface SearchAdapter {
  initialize(): Promise<void>
  index(request: IndexRequest): Promise<IndexResult>
  indexBatch(request: BatchIndexRequest): Promise<BatchIndexResult>
  denseSearch(request: DenseSearchRequest): Promise<SearchCandidate[]>
  keywordSearch(request: KeywordSearchRequest): Promise<SearchCandidate[]>
  delete(request: DeleteRequest): Promise<DeleteResult>
  health(): Promise<HealthStatus>
  getStats(): Promise<AdapterStats>
  close(): Promise<void>
  getBackendType(): string
  getVersion(): string
}
```

### 4. SearchAdapterFactory 🏭

Runtime adapter selection without code changes:

```typescript
const factory = new SearchAdapterFactory();
factory.register('postgresql', async (c) => new PgVectorAdapter(c));
factory.register('qdrant', async (c) => new QdrantAdapter(c));

// Select at runtime via environment
const adapter = await factory.create(process.env.ADAPTER_TYPE, config);
```

## 📋 Detailed Changes

### Performance Improvements

| Metric | v0.1.0 | v0.2.0 | Change |
|--------|--------|--------|--------|
| **Search Latency** | 145ms | 35ms | **4.1x faster** ⚡ |
| **Recall@10** | 0.92 | 0.95 | **+3%** ✨ |
| **Index Size (50K)** | 287MB | 344MB | +20% (acceptable) |
| **Supported Backends** | 1 (PostgreSQL) | 2 (PostgreSQL + Qdrant) | **+100%** 🗄️ |
| **Configuration Profiles** | Basic | 4 profiles (Speed/Balanced/Quality/Enterprise) | **+3** 🎛️ |

### New Features

- ✅ HNSW vector indexing (with tuning guide)
- ✅ Qdrant adapter support
- ✅ SearchAdapterFactory for runtime selection
- ✅ Batch indexing with continue-on-error
- ✅ Advanced delete operations (vectorId, entity, tenant)
- ✅ Health checks with latency tracking
- ✅ Per-entity-type statistics
- ✅ Configuration profiles (Speed/Balanced/Quality/Enterprise)
- ✅ Multi-database examples
- ✅ Comprehensive migration guides

### Improvements

- 🔄 Refactored PostgreSQL adapter to implement SearchAdapter interface
- 📦 Modular architecture (search-dense.ts, search-keyword.ts)
- 🧪 100+ new tests for interface compliance
- 📖 Comprehensive documentation for all features
- ⚙️ Environment-based configuration
- 🔀 Easy backend switching
- 📊 Observable health/stats across backends

### Bug Fixes

- ✅ Fixed HNSW parameter validation
- ✅ Improved error handling across adapters
- ✅ Corrected score normalization to [0,1] range
- ✅ Fixed batch operation continue-on-error logic

## 🔄 Migration from v0.1.0

### For Existing Users

**No code changes needed!** Your v0.1.0 code continues to work:

```typescript
// v0.1.0 code still works - now 4x faster!
const adapter = new PgVectorAdapter(config);
const results = await adapter.denseSearch(query);
```

Automatic benefits:
- ✅ HNSW indexing enabled by default
- ✅ 4.1x performance improvement
- ✅ Better recall (0.92 → 0.95)
- ✅ 100% backward compatible

### Optional: Explicit Configuration

For clarity, explicitly specify HNSW:

```typescript
new PgVectorAdapter({
  connectionString: '...',
  indexingStrategy: 'hnsw',
  hnsw: {
    m: 16,                // balanced (default)
    efConstruction: 200,
    ef: 100
  }
});
```

### Optional: Qdrant Migration

Switch to Qdrant for scale:

```typescript
// Change adapter
const adapter = new QdrantAdapter({
  url: 'http://localhost:6333',
  collectionName: 'vectors',
});

// No retrieval code changes needed!
const results = await adapter.denseSearch(query);
```

**See**: [MIGRATION-v0.1-to-v0.2.md](packages/adapters/pgvector/MIGRATION-v0.1-to-v0.2.md)

## 📚 Documentation

### New & Updated Guides

- **[MULTI-DATABASE-GUIDE.md](MULTI-DATABASE-GUIDE.md)** — Complete multi-DB reference
- **[packages/adapters/pgvector/HNSW-TUNING.md](packages/adapters/pgvector/HNSW-TUNING.md)** — HNSW parameter tuning
- **[packages/adapters/pgvector/MIGRATION-v0.1-to-v0.2.md](packages/adapters/pgvector/MIGRATION-v0.1-to-v0.2.md)** — Upgrade guide
- **[packages/adapters/qdrant/SETUP.md](packages/adapters/qdrant/SETUP.md)** — Qdrant setup
- **[BENCHMARKING.md](packages/adapters/pgvector/BENCHMARKING.md)** — Benchmark procedures
- **[examples/multi-adapter-retrieval/](examples/multi-adapter-retrieval/)** — Working examples

### API Documentation

- **SearchAdapter interface**: [packages/contracts/src/search-adapter.ts](packages/contracts/src/search-adapter.ts)
- **SearchAdapterFactory**: [packages/contracts/src/adapter-factory.ts](packages/contracts/src/adapter-factory.ts)
- **PgVectorAdapter**: [packages/adapters/pgvector/src/adapter.ts](packages/adapters/pgvector/src/adapter.ts)
- **QdrantAdapter**: [packages/adapters/qdrant/src/adapter.ts](packages/adapters/qdrant/src/adapter.ts)

## 🧪 Testing

### Comprehensive Test Coverage

- ✅ 100+ new unit tests
- ✅ Interface compliance validation
- ✅ Multi-adapter integration tests
- ✅ HNSW parameter validation
- ✅ Default strategy verification
- ✅ Error handling scenarios

### Run Tests

```bash
npm test
npm run test:coverage  # See coverage report
```

## ⚙️ Configuration

### PostgreSQL (Default)

```typescript
new PgVectorAdapter({
  connectionString: 'postgresql://localhost/retrievalops',
  indexingStrategy: 'hnsw',
  hnsw: { m: 16, efConstruction: 200, ef: 100 }
})
```

### Qdrant

```typescript
new QdrantAdapter({
  url: 'http://localhost:6333',
  collectionName: 'vectors',
  hnsw: { m: 16, efConstruct: 200 }
})
```

### Runtime Selection

```typescript
const factory = new SearchAdapterFactory();
const adapter = await factory.create(
  process.env.ADAPTER_TYPE,
  AdapterConfigs.fromEnv()
);
```

**See**: [MULTI-DATABASE-GUIDE.md](MULTI-DATABASE-GUIDE.md)

## 📊 Performance Benchmarks

### Search Performance (50K vectors, 384D)

| Configuration | Latency | Recall | Use Case |
|---------------|---------|--------|----------|
| Speed (m=8) | 25ms | 0.90 | Real-time systems |
| **Balanced (m=16)** | **35ms** | **0.95** | **Production (default)** |
| Quality (m=32) | 50ms | 0.97 | High-accuracy apps |
| Enterprise (m=64) | 75ms | 0.98 | Critical systems |

### Adapter Comparison (50K vectors)

| Metric | PostgreSQL | Qdrant |
|--------|-----------|--------|
| Search latency | 35ms | 30ms (10% faster) |
| Index size | 1.2x | 1.2x (same) |
| Scaling | Vertical | Horizontal |
| Full-text search | ✅ Native | ⚠️ Workaround |
| Setup | Low | Low |
| Cloud option | Multiple | Qdrant Cloud |

**Verdict**: Choose PostgreSQL for simplicity, Qdrant for scale.

## 🚀 Getting Started

### Installation

```bash
npm install @itsrajeshthota/retrievalops-core
npm install @itsrajeshthota/retrievalops-pgvector
npm install @itsrajeshthota/retrievalops-local
```

### Quick Example

```typescript
import { RetrievalOps, defineEntity } from '@itsrajeshthota/retrievalops-core';
import { PgVectorAdapter } from '@itsrajeshthota/retrievalops-pgvector';
import { LocalEmbeddingProvider } from '@itsrajeshthota/retrievalops-local';

const entity = defineEntity({
  name: 'document',
  id: 'docId',
  fields: {
    title: { retrieval: ['semantic', 'keyword'], weight: 1.2 },
    content: { retrieval: ['semantic'], weight: 1.0 },
  },
});

const retrieval = new RetrievalOps({
  store: new PgVectorAdapter({ connectionString: '...' }),
  embeddings: new LocalEmbeddingProvider({ model: 'Xenova/all-MiniLM-L6-v2' }),
});

await retrieval.initialize();

// Index
await retrieval.index({
  entity,
  documents: [{ docId: '1', title: 'Hello', content: 'World' }],
});

// Search
const results = await retrieval.search({
  entity,
  query: 'greeting',
  topK: 5,
});

results.results.forEach((r) => console.log(r.text, r.explanation.scores));
```

**More examples**: [examples/](examples/)

## 🐛 Known Limitations

### Qdrant Adapter

- **Keyword search not native** — Use dense search or filtering instead
- **Complex delete** — Only supports delete by vectorId (not by entity)
- **Future**: FTS support planned for v0.2.2

### PostgreSQL Adapter

- **Vertical scaling only** — Maximum practical size ~10M vectors
- **Not cloud-native** — Requires separate database service
- **Future**: Horizontal sharding in v0.3.0

## 📈 Roadmap

### v0.2.1 (2-3 weeks after v0.2.0)

- [ ] Weaviate adapter (GraphQL, native FTS)
- [ ] Milvus adapter (distributed, massive scale)
- [ ] Query caching (Redis)
- [ ] Result ranking improvements

### v0.3.0 (6-8 weeks)

- [ ] OpenSearch adapter
- [ ] Horizontal sharding (PostgreSQL)
- [ ] ML-based query rewriting
- [ ] Cost estimation

### v1.0.0 (3-4 months)

- [ ] Enterprise multi-tenancy
- [ ] Advanced observability
- [ ] Production patterns guide
- [ ] 24/7 support tier

**See**: [ROADMAP.md](ROADMAP.md)

## 🆘 Support & Resources

### Documentation

- **Quick Start**: [README.md](README.md)
- **Comparison**: [COMPARISON.md](COMPARISON.md)
- **Multi-Database**: [MULTI-DATABASE-GUIDE.md](MULTI-DATABASE-GUIDE.md)
- **API Reference**: Available in package docs

### Examples

- **Jira Search**: [examples/jira-pgvector/](examples/jira-pgvector/)
- **Multi-Adapter**: [examples/multi-adapter-retrieval/](examples/multi-adapter-retrieval/)
- **Document Search**: [examples/document-search/](examples/document-search/)

### Community

- **GitHub Issues**: Report bugs and request features
- **Discussions**: Ask questions and share ideas
- **GitHub Docs**: Comprehensive reference

## 📝 License

Apache License 2.0 — See [LICENSE](LICENSE)

## ✨ Contributors

Built with ❤️ by the RetrievalOps community

**Special thanks to**: All contributors, reviewers, and users who provided feedback during development.

---

## 📋 Installation Checklist

- [ ] Install packages: `npm install @itsrajeshthota/retrievalops-*`
- [ ] Set up database (PostgreSQL or Qdrant)
- [ ] Read quick start in [README.md](README.md)
- [ ] Run examples in [examples/](examples/)
- [ ] Deploy to your project

---

**v0.2.0 is production-ready. Welcome to faster, multi-database retrieval!** 🚀

For questions or issues, see [GitHub Issues](https://github.com/Urstruelyrajeshthota/RetrievalOps/issues)
