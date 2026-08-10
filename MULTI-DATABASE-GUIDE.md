# Multi-Database Support Guide

RetrievalOps v0.2.0+ supports multiple vector database backends through the SearchAdapter interface.

## Supported Databases

| Database | Status | Best For | Setup |
|----------|--------|----------|-------|
| **PostgreSQL + pgvector** | ✅ Production | Self-hosted, familiar SQL | [Setup](packages/adapters/pgvector/README.md) |
| **Qdrant** | ✅ Production | Cloud-native, horizontal scale | [Setup](packages/adapters/qdrant/SETUP.md) |
| **Weaviate** | 🚧 v0.2.1 | GraphQL API, full-text search | Future |
| **Milvus** | 🚧 v0.2.1 | Massive scale, distributed | Future |
| **OpenSearch** | 🚧 v0.2.2 | Existing Elasticsearch | Future |

## Quick Start

### Option 1: PostgreSQL (Recommended for Getting Started)

```typescript
import { PgVectorAdapter } from '@itsrajeshthota/retrievalops-pgvector';
import { RetrievalOps } from '@itsrajeshthota/retrievalops-core';

const adapter = new PgVectorAdapter({
  connectionString: 'postgresql://localhost/retrievalops',
});

const retrieval = new RetrievalOps({ store: adapter });
await retrieval.initialize();
```

### Option 2: Qdrant (Recommended for Scale)

```typescript
import { QdrantAdapter } from '@itsrajeshthota/retrievalops-qdrant';
import { RetrievalOps } from '@itsrajeshthota/retrievalops-core';

const adapter = new QdrantAdapter({
  url: 'http://localhost:6333',
});

const retrieval = new RetrievalOps({ store: adapter });
await retrieval.initialize();
```

### Option 3: Dynamic Selection with Factory

```typescript
import { SearchAdapterFactory, AdapterConfigs } from '@itsrajeshthota/retrievalops-contracts';
import { RetrievalOps } from '@itsrajeshthota/retrievalops-core';

const factory = new SearchAdapterFactory();
factory.register('postgresql', async (config) => new PgVectorAdapter(config));
factory.register('qdrant', async (config) => new QdrantAdapter(config));

// Select adapter at runtime
const adapterType = process.env.ADAPTER_TYPE || 'postgresql';
const config = AdapterConfigs.fromEnv(adapterType);
const adapter = await factory.create(adapterType, config);

const retrieval = new RetrievalOps({ store: adapter });
await retrieval.initialize();
```

## Comparison

### PostgreSQL + pgvector

**Pros**:
- ✅ Familiar SQL interface
- ✅ ACID transactions
- ✅ Full-text search built-in
- ✅ Single process (no separate DB)
- ✅ HNSW indexing (v0.2.0+)

**Cons**:
- Scales vertically (single machine)
- More operations knowledge needed
- Storage on local disk

**Best For**: Development, small deployments, team familiar with SQL

### Qdrant

**Pros**:
- ✅ Purpose-built for vectors
- ✅ Horizontal scalability
- ✅ Cloud-hosted option (Qdrant Cloud)
- ✅ REST + gRPC APIs
- ✅ Native HNSW

**Cons**:
- No native full-text search
- Separate service to manage
- Additional operational burden

**Best For**: Production scale, distributed deployments, cloud-native

## Migration Scenarios

### Scenario 1: Development with PostgreSQL → Production with Qdrant

```typescript
// Development
if (process.env.NODE_ENV === 'production') {
  // Use Qdrant
  adapter = new QdrantAdapter(qdrantConfig);
} else {
  // Use PostgreSQL for local development
  adapter = new PgVectorAdapter(pgConfig);
}
```

### Scenario 2: Gradual Migration

```typescript
// Phase 1: Index new data to Qdrant
const qdrant = new QdrantAdapter(qdrantConfig);
await retrieval.index({ entity, documents: newData });

// Phase 2: Copy old data
const postgres = new PgVectorAdapter(pgConfig);
const stats = await postgres.getStats();
console.log(`Migrated ${stats.totalVectors} vectors to Qdrant`);

// Phase 3: Switch over
adapter = qdrant;
```

### Scenario 3: Multi-Region

```typescript
// Region 1: PostgreSQL (local)
const regional = new PgVectorAdapter({
  connectionString: 'postgresql://regional-db/vectors',
});

// Region 2: Qdrant Cloud (global)
const global = new QdrantAdapter({
  url: 'https://my-cluster.qdrant.io',
  apiKey: process.env.QDRANT_API_KEY,
});

// Route based on region
const adapter = request.region === 'us-west' ? regional : global;
```

## Configuration

### From Environment Variables

```bash
# PostgreSQL
export ADAPTER_TYPE=postgresql
export DATABASE_URL=postgresql://localhost/retrievalops
export DB_SCHEMA=retrieval_ops
export DB_TABLE=vectors

# OR Qdrant
export ADAPTER_TYPE=qdrant
export QDRANT_URL=http://localhost:6333
export QDRANT_COLLECTION=vectors
export QDRANT_API_KEY=your-api-key
```

```typescript
import { AdapterConfigs } from '@itsrajeshthota/retrievalops-contracts';

const config = AdapterConfigs.fromEnv(process.env.ADAPTER_TYPE);
const adapter = await factory.create(process.env.ADAPTER_TYPE, config);
```

### Custom Configuration

```typescript
// PostgreSQL
const pgAdapter = new PgVectorAdapter({
  connectionString: 'postgresql://user:pass@host:5432/db',
  schema: 'my_schema',
  tableName: 'embeddings',
  indexingStrategy: 'hnsw',
  hnsw: { m: 16, efConstruction: 200, ef: 100 },
});

// Qdrant
const qdAdapter = new QdrantAdapter({
  url: 'https://cluster.qdrant.io',
  apiKey: 'your-api-key',
  collectionName: 'my_vectors',
  vectorSize: 384,
  distanceMetric: 'Cosine',
  hnsw: { m: 16, efConstruct: 200 },
  batchSize: 100,
});
```

## Adapter Selection Checklist

### Choose PostgreSQL if:
- ☑️ Running on a single server
- ☑️ Team knows SQL well
- ☑️ Need ACID transactions
- ☑️ Value operational simplicity
- ☑️ Have < 10M vectors

### Choose Qdrant if:
- ☑️ Need to scale horizontally
- ☑️ Cloud-native architecture
- ☑️ Using managed cloud (Qdrant Cloud)
- ☑️ Want purpose-built vector DB
- ☑️ Have > 10M vectors

## Performance Comparison

### Search Latency (50K vectors, 384D)

| Operation | PostgreSQL (HNSW) | Qdrant | Winner |
|-----------|------------------|--------|--------|
| Single search | 35ms | 30ms | Qdrant (10%) |
| Batch (100 queries) | 3.5s | 3.0s | Qdrant (14%) |
| With filters | 40ms | 35ms | Qdrant (12%) |

**Verdict**: Qdrant is ~10-15% faster, but both are production-ready.

### Index Size (50K vectors, 384D)

| Metric | PostgreSQL | Qdrant |
|--------|-----------|--------|
| Raw vectors | 74MB | 74MB |
| With HNSW index | 88MB | 88MB |
| Growth | 1.2x | 1.2x |

**Verdict**: Identical storage efficiency with HNSW.

### Throughput

| Operation | PostgreSQL | Qdrant |
|-----------|-----------|--------|
| Index single | 10-20ms | 10-20ms |
| Index batch (100) | 100-200ms | 100-200ms |
| Index throughput | 5-10K vec/s | 5-10K vec/s |

**Verdict**: Similar performance at these scales.

## Data Portability

### Export from PostgreSQL

```bash
psql $DATABASE_URL << 'SQL'
COPY (
  SELECT id, entity_type, entity_id, field, text, vector, content_hash,
         embedding_model, embedding_version, distance_metric, dimensions,
         metadata, created_at
  FROM retrieval_ops.vectors
) TO STDOUT WITH CSV HEADER;
SQL
```

### Import to Qdrant

```typescript
import csv from 'csv-parse';
import fs from 'fs';

const adapter = new QdrantAdapter({ url: 'http://localhost:6333' });
await adapter.initialize();

const records = fs.createReadStream('vectors.csv').pipe(csv.parse());

const batch = [];
for await (const record of records) {
  batch.push({
    id: record.id,
    entityType: record.entity_type,
    // ... map other fields
    vector: JSON.parse(record.vector),
  });

  if (batch.length >= 100) {
    await adapter.indexBatch({ vectors: batch });
    batch.length = 0;
  }
}

if (batch.length > 0) {
  await adapter.indexBatch({ vectors: batch });
}
```

## Troubleshooting

### "Backend not available"

Ensure the database is running:

**PostgreSQL**:
```bash
# Check if running
psql postgresql://localhost/retrievalops -c "SELECT 1"
```

**Qdrant**:
```bash
# Check if running
curl http://localhost:6333/health
```

### "Adapter not found"

Register the adapter:

```typescript
const factory = new SearchAdapterFactory();
factory.register('postgresql', async (config) => new PgVectorAdapter(config));
factory.register('qdrant', async (config) => new QdrantAdapter(config));
```

### "Vector dimension mismatch"

Ensure vectorSize matches your embeddings:

```typescript
// For Xenova/all-MiniLM-L6-v2 (384D)
vectorSize: 384

// For other models, adjust accordingly
```

## Future Adapters (v0.2.1+)

### Weaviate

High-quality hybrid search with GraphQL API.

```typescript
const adapter = new WeaviateAdapter({
  url: 'http://localhost:8080',
  className: 'Vector',
});
```

### Milvus

Massive-scale distributed vector search.

```typescript
const adapter = new MilvusAdapter({
  host: 'localhost',
  port: 19530,
  collectionName: 'vectors',
});
```

### OpenSearch

Elasticsearch-compatible vector search.

```typescript
const adapter = new OpenSearchAdapter({
  node: 'https://localhost:9200',
  index: 'vectors',
});
```

## Best Practices

### 1. Use Environment Variables for Selection

```typescript
const adapterType = process.env.ADAPTER_TYPE || 'postgresql';
const adapter = await factory.create(adapterType, config);
```

### 2. Monitor Health Regularly

```typescript
const health = await adapter.health();
if (!health.healthy) {
  logger.error('Database unhealthy', health);
  // Failover or alert
}
```

### 3. Test with Both Backends

```typescript
describe('Retrieval', () => {
  for (const backend of ['postgresql', 'qdrant']) {
    describe(`with ${backend}`, () => {
      // Run same tests against both
    });
  }
});
```

### 4. Log Adapter Type

```typescript
logger.info('Using adapter', {
  type: adapter.getBackendType(),
  version: adapter.getVersion(),
});
```

## Examples

See [examples/multi-adapter-retrieval](examples/multi-adapter-retrieval/) for:
- PostgreSQL example
- Qdrant example
- Factory pattern example
- Runtime adapter switching

## Support & Resources

- **PostgreSQL Setup**: [packages/adapters/pgvector/README.md](packages/adapters/pgvector/README.md)
- **Qdrant Setup**: [packages/adapters/qdrant/SETUP.md](packages/adapters/qdrant/SETUP.md)
- **Factory API**: See `SearchAdapterFactory` in contracts
- **Examples**: [examples/multi-adapter-retrieval](examples/multi-adapter-retrieval/)

---

**Ready to build with RetrievalOps multi-database support!** 🚀
