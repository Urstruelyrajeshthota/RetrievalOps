# Weaviate Adapter Setup Guide

**Weaviate** is a GraphQL-based, open-source vector database with native full-text search and hybrid search capabilities.

## Features

- ✅ GraphQL API for flexible queries
- ✅ Native full-text search (BM25)
- ✅ Hybrid search (vector + keyword)
- ✅ HNSW vector indexing
- ✅ Multi-tenant support
- ✅ Cloud and self-hosted options

## Installation

```bash
npm install @itsrajeshthota/retrievalops-weaviate
npm install weaviate-ts-client
```

## Quick Start

### 1. Start Weaviate Locally (Docker)

```bash
docker run -d \
  -p 8080:8080 \
  -p 50051:50051 \
  -e PERSISTENCE_DATA_PATH=/var/lib/weaviate \
  semitechnologies/weaviate:latest
```

Wait for startup (30-60 seconds). Verify: `curl http://localhost:8080/v1/.well-known/ready`

### 2. Initialize Adapter

```typescript
import { WeaviateAdapter } from '@itsrajeshthota/retrievalops-weaviate';

const adapter = new WeaviateAdapter({
  url: 'http://localhost:8080',
  className: 'Document',
  vectorDim: 384,  // For all-MiniLM-L6-v2
  autoCreate: true,
  hnsw: {
    m: 16,
    efConstruction: 200,
    ef: 100,
  },
});

await adapter.initialize();
```

### 3. Index Documents

```typescript
await adapter.index({
  id: 'doc1',
  vector: [0.1, 0.2, 0.3, ...],  // 384 dimensions
  metadata: {
    title: 'Hello World',
    content: 'Lorem ipsum...',
  },
});
```

### 4. Search

```typescript
// Dense search
const results = await adapter.denseSearch({
  query: [0.1, 0.2, 0.3, ...],
  limit: 10,
});

// Keyword search
const results = await adapter.keywordSearch({
  query: 'hello world',
  limit: 10,
});

// Hybrid search (Weaviate native!)
// Coming in v0.2.2
```

---

## Configuration

### Basic Configuration

```typescript
new WeaviateAdapter({
  url: 'http://localhost:8080',
  className: 'MyClass',
  vectorDim: 384,
})
```

### Advanced Configuration

```typescript
new WeaviateAdapter({
  // Connection
  url: 'https://my-cluster.weaviate.network',
  apiKey: process.env.WEAVIATE_API_KEY,
  className: 'BlogPosts',
  
  // Vector settings
  vectorProperty: 'embedding',
  vectorDim: 1536,
  distanceMetric: 'cosine',
  
  // HNSW indexing
  hnsw: {
    m: 32,              // Higher for better recall
    efConstruction: 300, // Higher for better index quality
    ef: 100,
  },
  
  // Performance
  requestTimeout: 60000,
  autoCreate: true,
  
  // Multi-tenancy
  tenant: 'customer-123',
})
```

---

## Performance Tuning

### Configuration Profiles

| Profile | m | efConstruction | ef | Best For |
|---------|---|-----------------|-----|----------|
| Speed | 8 | 100 | 50 | Real-time, ultra-low latency |
| Balanced (default) | 16 | 200 | 100 | Production, general use |
| Quality | 32 | 300 | 150 | High recall, accuracy-focused |
| Enterprise | 64 | 400 | 200 | Large-scale, critical systems |

### Tuning Guidelines

1. **For latency < 50ms**: Use Speed profile (m=8)
2. **For recall > 0.95**: Use Quality or Enterprise
3. **For large datasets**: Use higher m (memory/performance tradeoff)
4. **For frequent updates**: Use lower efConstruction

---

## Cloud Setup

### Weaviate Cloud

1. Create account: https://console.weaviate.cloud
2. Create cluster (auto-provisioned)
3. Get API key from dashboard
4. Update configuration:

```typescript
new WeaviateAdapter({
  url: 'https://my-cluster-xyz.weaviate.network',
  apiKey: 'MY_API_KEY',
  className: 'Document',
  vectorDim: 384,
})
```

### Custom Cloud (AWS, GCP, Azure)

Deploy using Helm or Docker:

```bash
helm install weaviate weaviate/weaviate \
  --set persistence.enabled=true \
  --set resources.requests.memory="2Gi"
```

---

## Hybrid Search

Weaviate's killer feature - native hybrid search combining BM25 + vector search:

```typescript
// Coming in v0.2.2
const results = await adapter.hybridSearch({
  keyword: 'machine learning',
  vector: [0.1, 0.2, ...],
  alpha: 0.5,      // 50% keyword, 50% vector
  limit: 10,
  where: {
    path: ['author'],
    operator: 'Equal',
    valueString: 'Alice',
  },
});
```

### Alpha Values

- `alpha: 0` = Pure keyword search (BM25)
- `alpha: 0.5` = 50/50 mix (balanced)
- `alpha: 1` = Pure vector search

---

## Multi-Tenancy

### Tenant-Based Routing

```typescript
// Create separate adapters per tenant
const adapters = {
  'customer-1': new WeaviateAdapter({
    url: 'http://localhost:8080',
    className: 'Document',
    tenant: 'customer-1',
  }),
  'customer-2': new WeaviateAdapter({
    url: 'http://localhost:8080',
    className: 'Document',
    tenant: 'customer-2',
  }),
};

// OR route at retrieval time
const adapter = adapters[customerId];
```

---

## Troubleshooting

### Connection Failed

```
Error: Cannot connect to Weaviate at http://localhost:8080
```

**Solution**: 
1. Check Weaviate is running: `curl http://localhost:8080/v1/.well-known/ready`
2. Verify URL and port
3. Check firewall/network access

### Class Not Found

```
Error: Class 'Document' does not exist
```

**Solution**:
1. Set `autoCreate: true` to auto-create
2. Or manually create class in Weaviate Console
3. Or check className spelling

### Vector Dimension Mismatch

```
Error: Vector dimension 384 doesn't match class dimension 1536
```

**Solution**:
1. Recreate class with correct dimension
2. Use correct embedding model
3. Check embedding provider output

### Timeout Errors

**Solution**:
1. Increase `requestTimeout` (default: 30000ms)
2. Check network latency
3. Verify Weaviate performance

---

## Comparison with Other Adapters

| Feature | Weaviate | PostgreSQL | Qdrant | Milvus |
|---------|----------|-----------|--------|--------|
| Dense search | ✅ | ✅ | ✅ | ✅ |
| Keyword search | ✅ Native | ✅ Native | ⚠️ Workaround | ⚠️ Limited |
| Hybrid search | ✅ Native | ❌ | ❌ | ❌ |
| GraphQL | ✅ | ❌ | ❌ | ❌ |
| Scaling | Horizontal | Vertical | Horizontal | Horizontal |
| Setup | Medium | Low | Low | Medium |

---

## Next Steps

1. ✅ Install and connect
2. ✅ Create class and index documents
3. ✅ Test dense search
4. ✅ Test keyword search
5. 🔄 Enable hybrid search (v0.2.2)
6. 🔄 Add multi-tenant routing

---

**Weaviate is ready for production!** 🚀
