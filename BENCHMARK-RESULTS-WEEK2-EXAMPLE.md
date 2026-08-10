# HNSW Benchmark Results - Example Output

This is a **realistic example** of what you should see when running Week 2-3 benchmarks.
Your actual results may vary by ±10% based on system configuration.

---

# HNSW Benchmark Results - Aug 12, 2026 (Example)

**Test Date**: Aug 12, 2026  
**Environment**: PostgreSQL 16, pgvector 0.5.0, Node.js 20.11.0  
**Test Machine**: 8-core CPU, 16GB RAM, SSD  
**Total Duration**: ~6.5 hours

## Benchmark Configuration

```
Dataset Sizes Tested: 10K, 50K, 100K vectors
Parameter Combinations: 4 (m=8, 16, 32, 64)
Vector Dimension: 384
Distance Metric: cosine
Repetitions: 1 per configuration
```

---

## Results: 10K Vectors

**Test Duration**: ~8 minutes

| Parameter Set | Insertion | Search | Recall@10 | Index Size | Notes |
|---|---|---|---|---|---|
| m=8, ef=50 | 42ms/vec | 18ms/q | 0.89 | 1.0x (58MB) | ⚡ Fast |
| m=16, ef=100 | 88ms/vec | 28ms/q | 0.94 | 1.2x (70MB) | ⭐ Balanced |
| m=32, ef=200 | 175ms/vec | 41ms/q | 0.96 | 1.4x (81MB) | ✨ Quality |
| m=64, ef=200 | 265ms/vec | 62ms/q | 0.97 | 1.6x (93MB) | 🏆 High-Q |

### Analysis (10K)

**Search Latency**: All configurations under 65ms ✓
**Recall**: Consistent across sizes, m=16 achieves 0.94 ✓
**Index Size**: All well under 2.0x limit ✓

The smallest dataset shows the base performance characteristics. m=16 provides good balance at 28ms with 0.94 recall.

---

## Results: 50K Vectors

**Test Duration**: ~55 minutes  
**MOST RELEVANT FOR PRODUCTION**

| Parameter Set | Insertion | Search | Recall@10 | Index Size | Notes |
|---|---|---|---|---|---|
| m=8, ef=50 | 45ms/vec | 23ms/q | 0.90 | 1.0x (287MB) | ⚡ Speed |
| m=16, ef=100 | 92ms/vec | 35ms/q | 0.95 | 1.2x (344MB) | ⭐ **RECOMMENDED** |
| m=32, ef=200 | 182ms/vec | 51ms/q | 0.97 | 1.4x (402MB) | ✨ Quality |
| m=64, ef=200 | 273ms/vec | 76ms/q | 0.98 | 1.6x (459MB) | 🏆 Maximum |

### Analysis (50K)

**Key Findings:**
1. **m=16 is production-ready** — 35ms latency with 0.95 recall
2. **m=8 trades recall for speed** — 23ms but only 0.90 recall
3. **Scaling is linear** — Index size and latency scale proportionally
4. **Clear performance bands** — Each m=+16 step shows ~1.5x latency increase

**Production Recommendation**: m=16 (35ms/0.95 recall/1.2x size)

---

## Results: 100K Vectors

**Test Duration**: ~240 minutes  
**Validates Large-Scale Performance**

| Parameter Set | Insertion | Search | Recall@10 | Index Size | Notes |
|---|---|---|---|---|---|
| m=8, ef=50 | 47ms/vec | 28ms/q | 0.90 | 1.0x (573MB) | ⚡ Speed |
| m=16, ef=100 | 95ms/vec | 42ms/q | 0.95 | 1.2x (688MB) | ⭐ Balanced |
| m=32, ef=200 | 185ms/vec | 58ms/q | 0.97 | 1.4x (802MB) | ✨ Quality |
| m=64, ef=200 | 280ms/vec | 88ms/q | 0.98 | 1.6x (917MB) | 🏆 Enterprise |

### Analysis (100K)

**Scaling Patterns:**
- **Latency increases moderately** — m=16 went 35ms (50K) → 42ms (100K), only +20%
- **Recall stays consistent** — 0.95 maintained across all sizes for m=16
- **Index size scales linearly** — 50K (344MB) → 100K (688MB), exactly 2x

**Conclusion**: Performance scales well to 100K vectors. m=16 remains optimal.

---

## Comprehensive Comparison

### Search Latency Across Sizes

```
                 10K      50K      100K    
m=8 (Speed):     18ms     23ms     28ms    (+56% total)
m=16 (Balanced): 28ms     35ms     42ms    (+50% total)  ⭐
m=32 (Quality):  41ms     51ms     58ms    (+41% total)
m=64 (Enterprise): 62ms   76ms     88ms    (+42% total)

Observation: Latency growth slows at larger datasets
Explanation: Better index locality and cache efficiency
```

### Recall Across Sizes

```
                 10K      50K      100K    
m=8:             0.89     0.90     0.90    (stable)
m=16 (Balanced): 0.94     0.95     0.95    (stable)  ⭐
m=32:            0.96     0.97     0.97    (stable)
m=64:            0.97     0.98     0.98    (stable)

Observation: Recall consistent across dataset sizes
Explanation: HNSW algorithm maintains quality as scale grows
```

### Index Size Across Sizes

```
Dataset   Baseline m=8    m=16    m=32    m=64
10K       58MB     58MB   70MB    81MB    93MB
50K       287MB    287MB  344MB   402MB   459MB
100K      573MB    573MB  688MB   802MB   917MB

Growth Pattern: Linear (5x dataset → 5x index)
Storage Efficiency: All configurations < 2.0x acceptable limit
```

---

## Comparison to v0.1.0 (IVFFlat Baseline)

**v0.1.0 Performance (50K vectors):**
```
IVFFlat (v0.1.0):
  Search Latency: 145ms
  Recall@10: 0.92
  Index Size: ~287MB (1.0x baseline)
```

**v0.2.0 HNSW Improvements (50K vectors):**

| Metric | v0.1.0 | v0.2.0 m=8 | v0.2.0 m=16 | v0.2.0 m=32 | v0.2.0 m=64 |
|--------|--------|------------|-------------|-------------|-------------|
| **Search Latency** | 145ms | 23ms (6.3x↓) | **35ms (4.1x↓)** | 51ms (2.8x↓) | 76ms (1.9x↓) |
| **Recall@10** | 0.92 | 0.90 | **0.95 (+0.03)** | 0.97 (+0.05) | 0.98 (+0.06) |
| **Index Size** | 287MB | 287MB | 344MB (1.2x) | 402MB (1.4x) | 459MB (1.6x) |

**Key Achievement**: m=16 delivers 4.1x speedup with better recall. ✅

---

## Configuration Recommendations by Use Case

### Use Case 1: Real-Time / High-Throughput Systems

**Recommended**: m=8, ef=50 (Speed Configuration)
```
Search Latency: 23ms (< 50ms target) ✓
Recall: 0.90 (acceptable for fast systems) ✓
Index Size: 1.0x (no growth) ✓
```

**When to use**: Chat, real-time suggestions, interactive search  
**Tradeoff**: Lower recall acceptable for speed requirement

### Use Case 2: Production / Balanced (⭐ DEFAULT)

**Recommended**: m=16, ef=100 (Balanced Configuration)
```
Search Latency: 35ms (30-100ms target) ✓
Recall: 0.95 (production standard) ✓
Index Size: 1.2x (+20% acceptable) ✓
```

**When to use**: Standard production systems, knowledge bases, issue search  
**Tradeoff**: Best balance of all factors

### Use Case 3: High-Accuracy / Strict Requirements

**Recommended**: m=32, ef=200 (Quality Configuration)
```
Search Latency: 51ms (can be slower) ✓
Recall: 0.97 (high quality) ✓
Index Size: 1.4x (+40% acceptable) ✓
```

**When to use**: Medical/legal systems, compliance-heavy applications  
**Tradeoff**: Uses 40% more index space for 2% better recall

### Use Case 4: Maximum Quality / Enterprise Scale

**Recommended**: m=64, ef=200 (High-Quality Configuration)
```
Search Latency: 76ms (enterprise acceptable) ✓
Recall: 0.98 (maximum) ✓
Index Size: 1.6x (+60% acceptable) ✓
```

**When to use**: Mission-critical systems, maximum accuracy required  
**Tradeoff**: Significant resource increase for marginal quality gain

---

## Implementation for v0.2.0

### Default Configuration (Recommended)

```typescript
export const DEFAULT_HNSW_CONFIG = {
  m: 16,
  efConstruction: 200,
  ef: 100
};

// Usage
new PgVectorAdapter({
  connectionString: process.env.DATABASE_URL,
  indexingStrategy: "hnsw",
  hnsw: DEFAULT_HNSW_CONFIG
});
```

### Configuration Profiles (for easy selection)

```typescript
export const HNSW_PROFILES = {
  speed: { m: 8, efConstruction: 100, ef: 50 },
  balanced: { m: 16, efConstruction: 200, ef: 100 },  // Default
  quality: { m: 32, efConstruction: 400, ef: 200 },
  enterprise: { m: 64, efConstruction: 400, ef: 200 }
};
```

---

## Key Takeaways

1. ✅ **HNSW Delivers 4x Speedup** — 145ms → 35ms on production-size datasets
2. ✅ **Quality Improves** — Recall 0.92 → 0.95 with better algorithm
3. ✅ **Scales Linearly** — Performance predictable at 100K+ vectors
4. ✅ **m=16 is Optimal** — Balances all factors for production use
5. ✅ **Index Size Acceptable** — 1.2x growth is reasonable tradeoff

**Recommendation**: Make m=16 the default for v0.2.0, with profile system for alternatives.

---

## Performance Benchmarking Methodology

### How Latency Was Measured
1. Generate 100 random 384D queries
2. Run each query through HNSW search (topK=10)
3. Record wall-clock time per query
4. Calculate mean latency

### How Recall Was Calculated
1. For each query vector
2. Calculate distance to all 50K vectors (brute force)
3. Get top-10 nearest neighbors from brute force
4. Compare with HNSW top-10 results
5. recall = matching_results / 10
6. Average across 100 queries

### Potential Variables
- Query characteristics (random vectors vs embeddings)
- Index warmup status (cold vs hot indices)
- PostgreSQL cache state
- Concurrent load (single vs multi-query)

---

## Expected Variance

Your results should be within ±10% of these values:

```
If you see 35ms, acceptable range is 31-39ms
If you see 0.95 recall, acceptable range is 0.90-1.00
If you see 344MB, acceptable range is 310-378MB
```

Larger variance may indicate:
- Different CPU/memory configuration
- Different vector distributions
- PostgreSQL tuning differences
- Background system load

---

## Next Steps

1. ✅ Run your benchmarks following [WEEK-2-QUICKSTART.md](../../WEEK-2-QUICKSTART.md)
2. ✅ Fill in [BENCHMARK-RESULTS-TEMPLATE.md](./BENCHMARK-RESULTS-TEMPLATE.md) with your results
3. ✅ Compare your results to this example
4. ✅ Document any significant differences
5. ⬜ Commit results to git
6. ⬜ **Week 3**: Make m=16 the default indexing strategy

**Ready to start your benchmarks?** Follow [WEEK-2-QUICKSTART.md](../../WEEK-2-QUICKSTART.md) on your local machine.

---

*This example shows realistic production benchmarks. Your specific results will depend on dataset, hardware, and PostgreSQL configuration. Use this as a reference point, not a requirement.*
