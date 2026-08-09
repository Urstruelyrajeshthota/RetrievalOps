# @retrievalops/pgvector

PostgreSQL + pgvector adapter for RetrievalOps.

Provides dense vector search using pgvector and keyword search using PostgreSQL full-text search (FTS).

## Features

- **Dense Vector Search** — Similarity search using pgvector with multiple distance metrics
  - Cosine similarity (default)
  - Euclidean distance (L2)
  - Dot product
  
- **Keyword Search** — Full-text search using PostgreSQL FTS
  - English language stemming
  - TF-IDF ranking
  
- **Content Deduplication** — SHA-256 hashing prevents duplicate embeddings
  
- **Optimized Indexing** — ivfflat indexes for fast approximate nearest-neighbor search

- **Automatic Schema Creation** — Creates tables and indexes automatically

## Installation

```bash
npm install @retrievalops/pgvector pg uuid
```

## Configuration

```ts
import { PgVectorAdapter } from '@retrievalops/pgvector';

const adapter = new PgVectorAdapter({
  connectionString: 'postgresql://user:password@localhost:5432/db',
  schema: 'retrieval_ops',           // Optional, default: retrieval_ops
  tableName: 'vectors',               // Optional, default: vectors
  maxDimensions: 3000,                // Optional, default: 3000
  autoCreateSchema: true,             // Optional, default: true
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
  },
});

await adapter.initialize();
```

## Usage

### Indexing

```ts
const result = await adapter.index({
  entityType: 'document',
  entityId: 'doc-1',
  field: 'content',
  text: 'The document content to embed',
  vector: [0.1, 0.2, 0.3, ...],  // 384-dim vector from embeddings
  contentHash: 'sha256hash',      // SHA-256 of text
  embeddingModel: 'Xenova/all-MiniLM-L6-v2',
  embeddingVersion: '2.6.0',
  distanceMetric: 'cosine',
  sourceUpdatedAt: new Date(),
});

if (result.success && result.indexed) {
  console.log('✓ Document indexed');
}
```

### Dense Search

```ts
const results = await adapter.denseSearch({
  entityType: 'document',
  vector: [0.1, 0.2, 0.3, ...],  // Query embedding
  topK: 10,
  distanceMetric: 'cosine',       // Optional
});

results.forEach((result) => {
  console.log(`${result.entityId}: ${result.score.toFixed(3)}`);
});
```

### Keyword Search

```ts
const results = await adapter.keywordSearch({
  entityType: 'document',
  vector: [0.1, 0.2, 0.3, ...],  // For compatibility, not used in FTS
  topK: 10,
});

results.forEach((result) => {
  console.log(`${result.entityId}: ${result.score.toFixed(3)}`);
});
```

### Deletion

```ts
await adapter.delete({
  entityType: 'document',
  entityId: 'doc-1',
});
```

### Health Check

```ts
const health = await adapter.health();

if (health.healthy) {
  console.log('✓ Adapter is healthy');
}
```

## Distance Metrics

### Cosine Similarity (default)

Measures the angle between vectors. Best for:
- Embedding-based search
- Document similarity
- Semantic search

Score: Higher = more similar

### Euclidean Distance (L2)

Measures straight-line distance between vectors. Best for:
- Clustering
- Approximate nearest neighbors
- Normalized embeddings

Score: Lower = more similar (adapter normalizes to [0, 1])

### Dot Product

Measures magnitude-weighted similarity. Best for:
- Non-normalized embeddings
- Fast approximate search

Score: Higher = more similar

## Schema

### Vectors Table

```sql
CREATE TABLE retrieval_ops.vectors (
  id UUID PRIMARY KEY,
  entity_type VARCHAR(255),
  entity_id VARCHAR(255),
  field VARCHAR(255),
  text TEXT,
  vector vector(384),
  content_hash VARCHAR(64),           -- SHA-256 for deduplication
  embedding_model VARCHAR(255),
  embedding_version VARCHAR(20),
  distance_metric VARCHAR(20),
  dimensions INT,
  metadata JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Indexes

- `idx_vectors_entity` — Fast entity lookup
- `idx_vectors_vector_cosine` — ivfflat index for vector similarity
- `idx_vectors_content_hash` — Hash-based deduplication
- `idx_vectors_field` — Field-based filtering
- `idx_vectors_created_at` — Timestamp sorting

## Performance Tips

1. **Batch Indexing** — Call `index()` once per field update, not per token
2. **Content Deduplication** — Same content gets same hash; reindex if text changes
3. **Vector Dimensions** — Use consistent dimensions across all embeddings
4. **Index Lists** — Tune `lists` parameter in ivfflat index for your dataset size
5. **Pool Size** — Increase `pool.max` for high concurrency

## Requirements

- PostgreSQL 12+
- pgvector extension
- Node.js 18+

## Installation Example

```bash
# Install PostgreSQL and pgvector extension
psql -U postgres -c "CREATE EXTENSION vector;"

# Install adapter
npm install @retrievalops/pgvector
```

## Testing

Run the test suite:

```bash
# Requires DATABASE_URL environment variable
DATABASE_URL="postgresql://user:password@localhost/test" npm test
```

## License

Apache 2.0

## See Also

- [@retrievalops/core](../../core) — Main RetrievalOps SDK
- [@retrievalops/contracts](../../contracts) — Adapter interface definitions
- [pgvector documentation](https://github.com/pgvector/pgvector)
