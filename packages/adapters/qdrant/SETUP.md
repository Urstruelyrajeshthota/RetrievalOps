# Qdrant Adapter Setup Guide

Getting started with RetrievalOps + Qdrant vector database.

## Overview

The Qdrant adapter provides high-performance vector search using Qdrant's native HNSW implementation. It implements the SearchAdapter interface for seamless multi-database support.

**Key Features**:
- ✅ Native HNSW vector indexing
- ✅ gRPC and REST API support
- ✅ Cloud-hosted option (Qdrant Cloud)
- ✅ Horizontal scalability
- ✅ SearchAdapter interface compliance

## Installation

### 1. Install Package

```bash
npm install @itsrajeshthota/retrievalops-qdrant
```

### 2. Start Qdrant Server

#### Option A: Docker (Recommended for Development)

```bash
docker run -p 6333:6333 \
  -e QDRANT__LOG_LEVEL=info \
  qdrant/qdrant:latest
```

Qdrant will be available at `http://localhost:6333`

#### Option B: Qdrant Cloud (Production)

1. Go to [cloud.qdrant.io](https://cloud.qdrant.io)
2. Create account and cluster
3. Get API URL and API key
4. Use in configuration below

#### Option C: Docker Compose

```yaml
version: '3.8'
services:
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    environment:
      QDRANT__LOG_LEVEL: info
    volumes:
      - ./qdrant_storage:/qdrant/storage
```

Run with: `docker-compose up -d`

## Configuration

### Basic Setup

```typescript
import { QdrantAdapter } from '@itsrajeshthota/retrievalops-qdrant';
import { RetrievalOps } from '@itsrajeshthota/retrievalops-core';
import { LocalEmbeddingProvider } from '@itsrajeshthota/retrievalops-local';

const adapter = new QdrantAdapter({
  url: 'http://localhost:6333',
  collectionName: 'documents',
  vectorSize: 384,
  distanceMetric: 'Cosine',
});

const retrieval = new RetrievalOps({
  store: adapter,
  embeddings: new LocalEmbeddingProvider({
    model: 'Xenova/all-MiniLM-L6-v2',
  }),
});

await retrieval.initialize();
```

### Production Setup (Qdrant Cloud)

```typescript
const adapter = new QdrantAdapter({
  url: 'https://your-cluster-name.qdrant.io',
  apiKey: process.env.QDRANT_API_KEY,
  collectionName: 'production_vectors',
  vectorSize: 384,
  distanceMetric: 'Cosine',
  hnsw: {
    m: 16,
    efConstruct: 200,
  },
});
```

### Configuration Options

```typescript
interface QdrantAdapterConfig {
  // Required
  url: string;                    // Qdrant server URL

  // Optional
  collectionName?: string;        // Collection name (default: 'vectors')
  apiKey?: string;               // API key for Qdrant Cloud
  vectorSize?: number;           // Vector dimension (default: 384)
  distanceMetric?: string;       // 'Cosine' (default), 'Euclid', 'Dot'
  
  hnsw?: {
    m?: number;                  // HNSW m parameter (default: 16)
    efConstruct?: number;        // ef_construct (default: 200)
  };
  
  requestTimeout?: number;       // Request timeout ms (default: 30000)
  batchSize?: number;            // Batch size (default: 100)
  autoCreateCollection?: boolean; // Auto-create on init (default: true)
}
```

## Usage Examples

### Index Documents

```typescript
const entity = defineEntity({
  name: 'document',
  id: 'docId',
  fields: {
    title: { retrieval: ['semantic', 'keyword'], weight: 1.2 },
    content: { retrieval: ['semantic'], weight: 1.0 },
  },
});

await retrieval.index({
  entity,
  documents: [
    {
      docId: 'doc-1',
      title: 'Getting Started',
      content: 'Introduction to Qdrant...',
    },
  ],
});
```

### Search

```typescript
const results = await retrieval.search({
  entity,
  query: 'How do I use Qdrant?',
  topK: 10,
});

results.results.forEach((result) => {
  console.log(`${result.text} (score: ${result.explanation.scores.semantic})`);
});
```

### Hybrid Search

```typescript
const results = await retrieval.search({
  entity,
  query: 'Qdrant vector database',
  strategies: ['semantic', 'keyword'],  // RRF fusion
  topK: 10,
});
```

## Distance Metrics

Qdrant supports three distance metrics:

### Cosine (Recommended)

```typescript
distanceMetric: 'Cosine'  // [-1, 1] → [0, 1]
```

**Best for**: General-purpose semantic search (default)

### Euclidean

```typescript
distanceMetric: 'Euclid'  // [0, ∞) → [0, 1]
```

**Best for**: High-dimensional data, computer vision

### Dot Product

```typescript
distanceMetric: 'Dot'     // [0, ∞) → [0, 1]
```

**Best for**: Maximum dot product search (MIPS)

## HNSW Configuration

### Speed Tuning (Real-time systems)

```typescript
hnsw: {
  m: 8,
  efConstruct: 100,
}
// Expected: 20-30ms search latency
```

### Balanced (Production, default)

```typescript
hnsw: {
  m: 16,
  efConstruct: 200,
}
// Expected: 30-50ms search latency
```

### Quality (High accuracy)

```typescript
hnsw: {
  m: 32,
  efConstruct: 400,
}
// Expected: 50-100ms search latency
```

## Keyword Search Limitation

**Important**: Qdrant doesn't have native full-text search like PostgreSQL.

### Workaround 1: Dense Search with Embedded Query

```typescript
// Embed the query and use dense search
const queryEmbedding = await embeddings.embed('your query');
const results = await adapter.denseSearch({
  queryVector: queryEmbedding,
  entityType: 'documents',
  topK: 10,
});
```

### Workaround 2: RRF Fusion

Use RetrievalOps' RRF fusion to combine dense search from Qdrant with keyword search from another source:

```typescript
// In RetrievalOps configuration
const retrieval = new RetrievalOps({
  store: qdrantAdapter,  // Dense search
  keywordStore: pgAdapter, // Keyword search fallback
  fusionStrategy: 'rrf',  // Reciprocal Rank Fusion
});
```

### Workaround 3: Payload Filtering

Use Qdrant's payload filtering for exact/keyword matching:

```typescript
await adapter.denseSearch({
  queryVector: embedding,
  entityType: 'documents',
  topK: 10,
  fieldFilters: {
    category: 'tutorial',  // Exact match filter
    status: 'published',
  },
});
```

## Migration from PostgreSQL

### Step 1: Export Data from PostgreSQL

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

### Step 2: Import to Qdrant

```typescript
const pgAdapter = new PgVectorAdapter(pgConfig);
const qdrantAdapter = new QdrantAdapter(qdrantConfig);

await qdrantAdapter.initialize();

// Batch copy from PostgreSQL to Qdrant
const batchSize = 100;
for (let i = 0; i < totalVectors; i += batchSize) {
  const batch = await pgAdapter.indexBatch({
    vectors: vectorsFromPostgres.slice(i, i + batchSize),
  });
  console.log(`Copied ${batch.indexedCount} vectors`);
}
```

### Step 3: Verify Migration

```typescript
const stats = await qdrantAdapter.getStats();
console.log(`Total vectors in Qdrant: ${stats.totalVectors}`);
console.log(`Storage used: ${stats.storageUsed} bytes`);
```

## Monitoring & Observability

### Health Check

```typescript
const health = await qdrantAdapter.health();
console.log(`Qdrant Status: ${health.status}`);
console.log(`Latency: ${health.latencyMs}ms`);
console.log(`Vector Count: ${health.vectorCount}`);
```

### Statistics

```typescript
const stats = await qdrantAdapter.getStats();
console.log(`Total vectors: ${stats.totalVectors}`);
console.log(`Storage: ${stats.storageUsed / 1024 / 1024}MB`);
console.log(`Avg search latency: ${stats.avgSearchLatencyMs}ms`);
```

## Troubleshooting

### "Cannot connect to Qdrant"

**Solution**: Verify Qdrant is running
```bash
curl http://localhost:6333/health
# Should return: {"status":"ok"}
```

### "Vector dimension mismatch"

**Solution**: Ensure vectorSize matches your embeddings
```typescript
// If using Xenova/all-MiniLM-L6-v2 (384D)
vectorSize: 384

// If using other models, adjust accordingly
```

### "Collection not found"

**Solution**: Enable auto-create or create manually
```typescript
// Option 1: Enable auto-create
autoCreateCollection: true

// Option 2: Create before using
await qdrantAdapter.initialize();
```

### "API key authentication failed"

**Solution**: Verify credentials
```typescript
// Qdrant Cloud
apiKey: process.env.QDRANT_API_KEY  // From cloud console
url: 'https://cluster-name.qdrant.io'
```

## Performance Tuning

### For Speed

```typescript
const adapter = new QdrantAdapter({
  url: 'http://localhost:6333',
  hnsw: { m: 8, efConstruct: 100 },
  batchSize: 200,  // Larger batches
});
```

### For Quality

```typescript
const adapter = new QdrantAdapter({
  url: 'http://localhost:6333',
  hnsw: { m: 32, efConstruct: 400 },
  batchSize: 50,   // Smaller batches, more frequent flushes
});
```

## Benchmarks

Typical performance on 50K vectors, 384D embeddings:

| Operation | Latency | Notes |
|-----------|---------|-------|
| Index single | 10-20ms | Per vector |
| Index batch (100) | 100-200ms | Network overhead |
| Dense search | 20-50ms | Depends on HNSW config |
| Keyword search | N/A | Not natively supported |

## API Reference

### QdrantAdapter Methods

```typescript
// Initialize collection
await adapter.initialize()

// Index operations
await adapter.index(request)           // Single
await adapter.indexBatch(request)      // Batch

// Search operations
await adapter.denseSearch(request)     // Vector similarity
await adapter.keywordSearch(request)   // Not supported

// Management
await adapter.delete(request)          // Delete by vectorId
await adapter.health()                 // Health status
await adapter.getStats()               // Adapter statistics
await adapter.close()                  // Cleanup

// Identification
adapter.getBackendType()              // Returns 'qdrant'
adapter.getVersion()                  // Returns '0.2.1'
```

## Support & Resources

- **Qdrant Docs**: https://qdrant.tech/documentation/
- **Qdrant Cloud**: https://cloud.qdrant.io
- **GitHub**: https://github.com/qdrant/qdrant
- **RetrievalOps Comparison**: See [COMPARISON.md](../../COMPARISON.md)

## What's Next

- Multi-adapter failover
- Query caching layer (Redis)
- Advanced payload filtering
- Custom distance metrics
