# HNSW Vector Indexing - Tuning Guide

HNSW (Hierarchical Navigable Small World) provides 4-10x faster search than IVFFlat with better recall.

## Parameters

### Parameter: m (Maximum Connections)

**Range**: 8 - 64 (default: 16)

- m=8: Fast, small index, lower recall (~0.90)
- m=16: Balanced (RECOMMENDED), ~1.2x index size, recall ~0.95
- m=32: High quality, ~1.4x index size, recall ~0.97
- m=64: Maximum quality, ~2x index size, recall ~0.98

### Parameter: efConstruction (Insertion Quality)

**Range**: 100 - 1000 (default: 200)

- ef=100: Fast insertion (50ms), lower quality
- ef=200: Balanced (RECOMMENDED), ~100ms per vector
- ef=400: Slow insertion (200ms), high quality
- ef=1000: Very slow (500ms+), highest quality

### Parameter: ef (Search Quality)

**Range**: 50 - 500 (default: 100)

- ef=50: Fast search (20ms), lower recall
- ef=100: Balanced (RECOMMENDED), ~35ms, recall ~0.95
- ef=200: Slow search (50ms), recall ~0.97
- ef=500: Very slow (100ms+), recall ~0.99

## Configuration Example

```typescript
const config = {
  indexingStrategy: 'hnsw',
  hnsw: {
    m: 16,
    efConstruction: 200,
    ef: 100
  }
};
// Result: 4x faster, better recall, 1.2x larger index
```

## Performance (50K vectors, 384D)

| Strategy | Latency | Recall | Size |
|----------|---------|--------|------|
| IVFFlat | 145ms | 0.92 | 1.0x |
| HNSW m=16 | 35ms | 0.95 | 1.2x |
| HNSW m=32 | 45ms | 0.97 | 1.4x |

## Migration

1. Set indexingStrategy to 'hnsw'
2. Reset schema
3. Reindex all data
4. Benchmark and tune parameters
5. Adjust m/ef based on latency/recall targets

For more: https://github.com/pgvector/pgvector#indexing
