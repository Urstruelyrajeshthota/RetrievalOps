# Week 2: HNSW Benchmarking & Tuning Results

## Overview

Week 2 focuses on validating HNSW implementation across multiple dataset sizes and parameter combinations to establish production-ready configuration recommendations.

## Benchmark Scope

### Dataset Sizes Tested
- 10K vectors (small dataset, seconds)
- 50K vectors (medium dataset, minutes)
- 100K vectors (large dataset, hours)

### Parameter Combinations
```
1. Speed Configuration    (m=8,  efConstruction=100, ef=50)
2. Balanced Config        (m=16, efConstruction=200, ef=100) ⭐ RECOMMENDED
3. Quality Configuration  (m=32, efConstruction=400, ef=200)
4. High-Quality Config    (m=64, efConstruction=400, ef=200)
```

## Expected Results Summary

### 50K Vectors (Most Relevant for Production)

| Metric | m=8 (Speed) | m=16 (Balanced) | m=32 (Quality) | m=64 (High-Q) |
|--------|-------------|-----------------|-----------------|---------------|
| **Insertion** | 50ms/vec | 100ms/vec | 200ms/vec | 300ms/vec |
| **Search** | 25ms/q | 35ms/q | 50ms/q | 75ms/q |
| **Index Size** | 1.0x (60MB) | 1.2x (72MB) | 1.4x (84MB) | 1.6x (96MB) |
| **Recall@10** | 0.90 | 0.95 | 0.97 | 0.98 |

### Performance Improvement vs IVFFlat (v0.1.0)

```
Baseline (IVFFlat): 145ms search latency, 0.92 recall

HNSW m=16 (Recommended):
  ✓ 35ms search latency  (4.1x faster)
  ✓ 0.95 recall         (+0.03 improvement)
  ✓ 1.2x index size     (+20% acceptable tradeoff)

HNSW m=8 (Speed):
  ✓ 25ms search latency  (5.8x faster)
  ✓ 0.90 recall         (-0.02 acceptable)
  ✓ 1.0x index size     (no growth)

HNSW m=32 (Quality):
  ✓ 50ms search latency  (2.9x faster)
  ✓ 0.97 recall         (+0.05 improvement)
  ✓ 1.4x index size     (+40% larger)
```

## Running the Benchmarks

### Step 1: Setup Database

```bash
docker-compose up -d postgres pgvector-pg
export BENCHMARK_DATABASE_URL="postgresql://postgres:password@localhost:5432/test_retrievalops_bench"
```

### Step 2: Run Benchmark Suite

```bash
cd packages/adapters/pgvector
npm run bench
```

### Step 3: Collect Results

The benchmark runner generates:
- Search latency measurements (milliseconds)
- Recall calculations (vs brute-force nearest neighbors)
- Index size tracking (megabytes)
- Configuration impact analysis

### Step 4: Document Findings

Create `BENCHMARK-RESULTS-WEEK2.md` with your findings:

```markdown
# HNSW Benchmark Results - [Your Date]

Dataset: [10K/50K/100K] vectors
Test Duration: [Time taken]

## Results

| m | efConstruction | Latency | Recall | Size |
|---|----------------|---------|--------|------|
| 8 | 100 | XXms | 0.XX | 1.0x |
| 16 | 200 | XXms | 0.XX | 1.2x |
| 32 | 400 | XXms | 0.XX | 1.4x |

## Recommendation

[Based on your benchmarks]
```

## Key Metrics to Track

### 1. **Insertion Latency** (time to add one vector)
- Measure: Add 1000 vectors, divide by 1000
- Target: < 200ms per vector for production
- Impact: Affects indexing speed during ingestion

### 2. **Search Latency** (time to find k nearest neighbors)
- Measure: Run 100 searches, calculate mean
- Target: 30-100ms for production systems
- Impact: User-facing query response time

### 3. **Recall@10** (fraction of true neighbors found)
- Measure: Compare HNSW to brute-force (linear scan)
- Target: > 0.90 minimum, > 0.95 for production
- Impact: Quality of search results

### 4. **Index Size** (disk space for vectors)
- Measure: `pg_total_relation_size()` after indexing
- Target: < 2x baseline (acceptable tradeoff)
- Impact: Storage costs and memory usage

## Benchmark Code Walkthrough

### Generating Test Vectors

```typescript
// 384D vectors (same as RetrievalOps embeddings)
private generateVector(): number[] {
  return Array(384)
    .fill(0)
    .map(() => Math.random());
}
```

### Measuring Search Latency

```typescript
const queries = generateRandomQueries(100);
const start = performance.now();
for (const query of queries) {
  await adapter.search(query, { topK: 10 });
}
const latency = (performance.now() - start) / queries.length;
```

### Calculating Recall

```typescript
// Get HNSW results
const hnswResults = await search(query, k=10);

// Get brute-force results (linear scan)
const bruteForceResults = allVectors
  .map((v, idx) => ({ idx, sim: cosineSimilarity(query, v) }))
  .sort((a,b) => b.sim - a.sim)
  .slice(0, 10)
  .map(r => r.idx);

// Calculate matching rate
const matching = hnswResults.filter(idx => bruteForceResults.includes(idx)).length;
const recall = matching / 10; // Should be 0.90-1.0
```

## Expected Behavior Patterns

### As m Increases (m=8 → 32 → 64)

✓ **Higher recall** (better quality)
✓ **Slower insertion** (more graph connections)
✓ **Slower search** (larger candidate sets)
✗ **Larger index** (more memory for graph edges)

### As efConstruction Increases (100 → 200 → 400)

✓ **Better index quality** (more thorough optimization)
✓ **Slower insertion** (more candidate exploration)
✗ **No impact on search latency** (ef controls search, not construction)

### As ef Increases (50 → 100 → 200)

✓ **Higher recall** (larger search scope)
✓ **Slower search** (explore more candidates)

## Decision Framework

**Choose m=8 (Speed)** if:
- User-facing latency is critical (< 30ms target)
- Recall > 0.90 is acceptable
- You have disk/memory constraints

**Choose m=16 (Balanced)** ⭐ if:
- Production system with moderate latency (30-100ms)
- Recall > 0.95 required
- Want to balance all factors

**Choose m=32 (Quality)** if:
- Recall > 0.97 critical
- Latency < 100ms acceptable
- Have sufficient disk/memory

**Choose m=64 (High-Q)** if:
- Maximum recall required
- Latency budget > 100ms
- Enterprise scale with resources

## Next Steps After Week 2

1. **Run benchmarks** on your dataset sizes
2. **Document results** in BENCHMARK-RESULTS-WEEK2.md
3. **Choose optimal configuration** based on your targets
4. **Update adapter config** to use recommended settings
5. **Commit findings** to git
6. **Week 3**: Make HNSW default indexing strategy

See [BENCHMARKING.md](./BENCHMARKING.md) for detailed procedure.
