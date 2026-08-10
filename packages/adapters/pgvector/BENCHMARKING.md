# HNSW Benchmarking Guide

## Running Benchmarks

### Prerequisites

```bash
npm install
export BENCHMARK_DATABASE_URL="postgresql://user:pass@localhost:5432/bench"
```

### Run Benchmark Suite

```bash
npm run bench
```

## Expected Results (50K Vectors, 384D)

### Speed Configuration (m=8, ef=50)
```
Insertion: 50ms/vector
Search: 25ms/query
Index Size: 1.0x (60MB)
Recall: 0.90
Use Case: High-throughput, real-time systems
```

### Balanced Configuration (m=16, ef=100) ⭐ RECOMMENDED
```
Insertion: 100ms/vector
Search: 35ms/query
Index Size: 1.2x (72MB)
Recall: 0.95
Use Case: Production systems
```

### Quality Configuration (m=32, ef=200)
```
Insertion: 200ms/vector
Search: 50ms/query
Index Size: 1.4x (84MB)
Recall: 0.97
Use Case: High-accuracy requirements
```

## Metrics to Measure

### 1. Insertion Latency
Time to add a single vector to the index.
```
Speed (m=8): ~50ms
Balanced (m=16): ~100ms (2x slower)
Quality (m=32): ~200ms (4x slower)
```

### 2. Search Latency
Time to search for 10 nearest neighbors.
```
Speed (m=8): ~25ms
Balanced (m=16): ~35ms (1.4x slower)
Quality (m=32): ~50ms (2x slower)
```

### 3. Recall@10
Fraction of true top-10 nearest neighbors found.
```
Speed (m=8): 0.90 (90%)
Balanced (m=16): 0.95 (95%)
Quality (m=32): 0.97 (97%)
```

### 4. Index Size
Disk space required for the vector index.
```
IVFFlat baseline: 1.0x (60MB for 50K vectors)
Speed (m=8): 1.0x (60MB)
Balanced (m=16): 1.2x (72MB)
Quality (m=32): 1.4x (84MB)
```

## Dataset Sizes

Test across multiple sizes to understand scaling:

```
10K vectors:   Fast (seconds)
50K vectors:   Moderate (minutes)
100K vectors:  Slow (hours)
```

## Benchmark Procedure

### Step 1: Index Creation
```sql
DROP INDEX IF EXISTS idx_vectors_hnsw;
CREATE INDEX idx_vectors_hnsw 
ON vectors USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 200);
```

### Step 2: Measure Insertion
```typescript
const start = performance.now();
for (let i = 0; i < 10000; i++) {
  await insertVector(data[i]);
}
const latency = (performance.now() - start) / 10000;
```

### Step 3: Measure Search
```typescript
const queries = generateRandomQueries(1000);
const start = performance.now();
for (const query of queries) {
  await search(query, k=10);
}
const latency = (performance.now() - start) / queries.length;
```

### Step 4: Calculate Recall
Compare HNSW results to brute-force (linear scan):
```typescript
const hnswResults = await search(query, k=10);
const bruteForceResults = bruteForceKNN(query, k=10);
const matching = hnswResults.filter(r => bruteForceResults.includes(r));
const recall = matching.length / 10;
```

## Interpretation

### What's Good?

✅ **Recall > 0.90**: Acceptable for most use cases  
✅ **Latency < 100ms**: Suitable for interactive systems  
✅ **Index Size < 2x baseline**: No memory explosion  

### When to Tune

⚠️ **If recall < 0.90**: Increase m or ef  
⚠️ **If latency > 200ms**: Decrease m or ef  
⚠️ **If index size > 3x**: Reduce m  

## Benchmark Results Template

Create a `BENCHMARK-RESULTS.md` file with findings:

```markdown
# HNSW Benchmark Results - [Date]

Dataset: [Size] vectors, 384D embeddings
Duration: [Time taken]

## Results by Configuration

| Config | Latency | Recall | Size |
|--------|---------|--------|------|
| m=8 | 25ms | 0.90 | 1.0x |
| m=16 | 35ms | 0.95 | 1.2x |
| m=32 | 50ms | 0.97 | 1.4x |

## Recommendation

Use m=16 for production (balanced performance).
```

## Comparing with IVFFlat

```
Metric          IVFFlat   HNSW    Improvement
Latency         145ms     35ms    4x faster ✨
Recall          0.92      0.95    +0.03 ✨
Index Size      1.0x      1.2x    +20% (acceptable)
```

## Next Steps

1. Run benchmarks on your dataset
2. Document results
3. Choose optimal parameters
4. Deploy and monitor in production
5. Adjust parameters based on production metrics

See HNSW-TUNING.md for parameter explanations.
