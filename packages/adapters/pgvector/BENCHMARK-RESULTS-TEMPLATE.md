# HNSW Benchmark Results Template

Use this template to document your benchmark findings. Copy and fill in your actual measurements.

---

# HNSW Benchmark Results - [Your Date]

**Test Date**: [YYYY-MM-DD]  
**Tester**: [Your Name]  
**Environment**: PostgreSQL [X], pgvector [X], Node.js [X]  
**Test Machine**: [CPU, RAM, SSD/HDD]  
**Total Duration**: [Hours:Minutes]

## Benchmark Configuration

```
Dataset Sizes Tested: 10K, 50K, 100K vectors
Parameter Combinations: 4 (m=8, 16, 32, 64)
Repetitions Per Config: [1 or more]
Vector Dimension: 384
Distance Metric: cosine
```

---

## Results: 10K Vectors

**Test Duration**: ~10 minutes

| Parameter Set | Insertion | Search | Recall@10 | Index Size | Notes |
|---|---|---|---|---|---|
| m=8, ef=50 | _ms/vec | _ms/q | 0.__ | 1.0x (__MB) | Fast configuration |
| m=16, ef=100 | _ms/vec | _ms/q | 0.__ | 1.2x (__MB) | Balanced (recommended) |
| m=32, ef=200 | _ms/vec | _ms/q | 0.__ | 1.4x (__MB) | High quality |
| m=64, ef=200 | _ms/vec | _ms/q | 0.__ | 1.6x (__MB) | Maximum quality |

### Analysis (10K)

**Search Latency Pattern:**
- Fastest: m=8 at __ms (____% faster than m=16)
- Recommended: m=16 at __ms
- Highest Quality: m=64 at __ms

**Recall Pattern:**
- m=8: ___% recall (acceptable for speed use case)
- m=16: ___% recall (good for production)
- m=32: ___% recall (excellent)
- m=64: ___% recall (maximum)

---

## Results: 50K Vectors

**Test Duration**: ~60 minutes  
**Most Relevant for Production**

| Parameter Set | Insertion | Search | Recall@10 | Index Size | Notes |
|---|---|---|---|---|---|
| m=8, ef=50 | _ms/vec | _ms/q | 0.__ | 1.0x (__MB) | Fast configuration |
| m=16, ef=100 | _ms/vec | _ms/q | 0.__ | 1.2x (__MB) | Balanced (recommended) |
| m=32, ef=200 | _ms/vec | _ms/q | 0.__ | 1.4x (__MB) | High quality |
| m=64, ef=200 | _ms/vec | _ms/q | 0.__ | 1.6x (__MB) | Maximum quality |

### Analysis (50K)

**Key Findings:**
- [Your observation 1]
- [Your observation 2]
- [Your observation 3]

**Scaling from 10K to 50K:**
- Latency multiplier: __x (expected ~1.5x)
- Recall change: +___/stable/−___ (expected stable)
- Index size scales linearly: ✓

---

## Results: 100K Vectors

**Test Duration**: ~240 minutes  
**Validates Scaling**

| Parameter Set | Insertion | Search | Recall@10 | Index Size | Notes |
|---|---|---|---|---|---|
| m=8, ef=50 | _ms/vec | _ms/q | 0.__ | 1.0x (__MB) | Fast configuration |
| m=16, ef=100 | _ms/vec | _ms/q | 0.__ | 1.2x (__MB) | Balanced (recommended) |
| m=32, ef=200 | _ms/vec | _ms/q | 0.__ | 1.4x (__MB) | High quality |
| m=64, ef=200 | _ms/vec | _ms/q | 0.__ | 1.6x (__MB) | Maximum quality |

### Analysis (100K)

**Scaling from 50K to 100K:**
- Latency multiplier: __x (expected ~1.2-1.5x)
- Recall change: +___/stable/−___ (expected stable or improve)
- Index size scales linearly: ✓

---

## Comprehensive Comparison

### Search Latency Across Sizes

```
                 10K      50K      100K
m=8:             __ms     __ms     __ms
m=16 (default):  __ms     __ms     __ms
m=32:            __ms     __ms     __ms
m=64:            __ms     __ms     __ms

Scaling Pattern (10K → 50K → 100K):
m=16: __ms → __ms (+__%) → __ms (+__%)
```

### Recall Across Sizes

```
                 10K      50K      100K
m=8:             0.__     0.__     0.__
m=16 (default):  0.__     0.__     0.__
m=32:            0.__     0.__     0.__
m=64:            0.__     0.__     0.__

Pattern: [Consistent/Improves/Degrades] with size
```

### Index Size Across Sizes

```
Dataset   IVFFlat  m=8    m=16   m=32   m=64
10K       ___MB    ___MB  ___MB  ___MB  ___MB
50K       ___MB    ___MB  ___MB  ___MB  ___MB
100K      ___MB    ___MB  ___MB  ___MB  ___MB

Growth Multiplier: [Linear/Sublinear/Superlinear]
Largest configuration still acceptable? [Yes/No]
```

---

## Comparison to v0.1.0 (IVFFlat Baseline)

**v0.1.0 Performance (50K vectors):**
- Search: 145ms
- Recall: 0.92
- Index: ~60MB (1.0x)

**v0.2.0 Improvement (50K vectors):**
- m=16 Search: __ms (expected 35ms, __x faster)
- m=16 Recall: 0.__ (expected 0.95, +__% better)
- m=16 Index: __MB (expected ~72MB, 1.2x acceptable)

| Metric | v0.1.0 | v0.2.0 (m=16) | Improvement |
|--------|--------|---------------|-------------|
| **Latency** | 145ms | __ms | **__x faster** ✓ |
| **Recall** | 0.92 | 0.__ | **+__%** ✓ |
| **Size** | 1.0x | 1._ | **+__%** [Acceptable] ✓ |

---

## Configuration Recommendation

### For [Use Case 1]: Real-time / High-throughput

**Recommended**: m=8, ef=50
- Latency: __ms (< 50ms target) ✓
- Recall: 0.__ (>0.90 acceptable) ✓
- Tradeoff: Fastest speed, lowest recall

### For [Use Case 2]: Production / Balanced (RECOMMENDED)

**Recommended**: m=16, ef=100
- Latency: __ms (30-100ms target) ✓
- Recall: 0.__ (>0.95 target) ✓
- Tradeoff: Best balance of all factors

### For [Use Case 3]: High Accuracy / Strict Requirements

**Recommended**: m=32, ef=200
- Latency: __ms (can be slower) ✓
- Recall: 0.__ (>0.97 target) ✓
- Tradeoff: Higher quality, more resources

### For [Use Case 4]: Maximum Quality / Enterprise

**Recommended**: m=64, ef=200
- Latency: __ms (if budget allows) ✓
- Recall: 0.__ (maximum achievable) ✓
- Tradeoff: Maximum quality, significant resources

---

## Key Findings

1. **Finding**: [Your discovery from data]
   - Impact: [Why this matters]
   - Recommendation: [What to do]

2. **Finding**: [Your discovery from data]
   - Impact: [Why this matters]
   - Recommendation: [What to do]

3. **Finding**: [Your discovery from data]
   - Impact: [Why this matters]
   - Recommendation: [What to do]

---

## Recommendations for v0.2.0

### Default Configuration

```typescript
// Recommended for production
new PgVectorAdapter({
  indexingStrategy: "hnsw",
  hnsw: { m: 16, efConstruction: 200, ef: 100 }
});
```

**Justification:**
- [Your reasoning based on benchmark results]
- Balances [latency], [recall], and [resources]
- Suitable for [typical use cases]

### Alternatives

**If latency is critical:**
```typescript
{ m: 8, efConstruction: 100, ef: 50 }  // ⚡ Fast
```

**If quality is paramount:**
```typescript
{ m: 32, efConstruction: 400, ef: 200 } // ✨ High-quality
```

---

## Questions for Future Optimization

- [ ] How does performance change with different vector dimensions?
- [ ] What's the memory pressure on the PostgreSQL process?
- [ ] How does CPU utilization vary by configuration?
- [ ] Can we further tune efConstruction post-index-creation?
- [ ] What's the optimal strategy for different data domains?

---

## Appendix

### Test Vectors

How were vectors generated?
- Random: [Y/N]
- Domain-specific: [Describe]
- Real embeddings: [Source]

### PostgreSQL Configuration

```sql
shared_buffers = XXX
work_mem = XXX
maintenance_work_mem = XXX
effective_cache_size = XXX
```

### System Resources

- CPU: [Model, cores, MHz]
- RAM: [Total, available during test]
- Storage: [Type, speed, free space]
- Network: [If applicable]

### Measurement Methodology

- How was insertion latency measured? [Describe]
- How was search latency measured? [Describe]
- How was recall calculated? [Brute-force comparison / Other]
- Any warmup runs? [Y/N, how many]

---

**Completed by**: [Your Name]  
**Reviewed by**: [Name of reviewer, if any]  
**Date**: [YYYY-MM-DD]

---

## Next Steps

After completing benchmarks:

1. ✓ Save this file as `BENCHMARK-RESULTS-WEEK2.md`
2. ✓ Commit to git
3. ⬜ Week 3: Update adapter to use m=16 as default
4. ⬜ Week 4: Implement SearchAdapter abstraction
5. ⬜ Week 5: Add Qdrant adapter support
