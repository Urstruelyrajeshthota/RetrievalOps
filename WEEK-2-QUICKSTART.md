# Week 2-3 Benchmarking Quick Start

**Goal**: Validate HNSW performance across dataset sizes 10K, 50K, 100K

## 1️⃣ Start Database (One-time)

```bash
docker run --name pgvector-bench \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=test_retrievalops_bench \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

## 2️⃣ Set Environment

```bash
export BENCHMARK_DATABASE_URL="postgresql://postgres:password@localhost:5432/test_retrievalops_bench"
```

## 3️⃣ Run Benchmarks

```bash
cd packages/adapters/pgvector
npm run bench
```

**Expected Time:**
- 10K: 5-10 minutes
- 50K: 30-60 minutes
- 100K: 2-4 hours

## 4️⃣ View Results

```
Search for in output:
✓ Insertion: XXms/vector
✓ Search: XXms/query
✓ Index size: XX.xMB
✓ Recall: 0.XX
```

## 5️⃣ Document Results

Create `BENCHMARK-RESULTS-WEEK2.md`:

```markdown
# HNSW Benchmark Results - [Date]

## 10K Vectors

| m | efConstruction | Latency | Recall | Size |
|---|----------------|---------|--------|------|
| 8 | 100 | _ms | 0.__ | 1.0x |
| 16 | 200 | _ms | 0.__ | 1.2x |
| 32 | 400 | _ms | 0.__ | 1.4x |

## 50K Vectors

[Same table format]

## 100K Vectors

[Same table format]

## Findings

[Your analysis]

## Recommendation

Based on these results, [m=8|m=16|m=32|m=64] is optimal because...
```

## What to Expect

### Good Results ✅

```
10K:    m=16: ~30ms latency, 0.95 recall
50K:    m=16: ~35ms latency, 0.95 recall
100K:   m=16: ~45ms latency, 0.95 recall
```

### Performance Pattern

```
As dataset size increases 5x:
  Latency: increases ~1.5x (expected)
  Recall: stays same or improves
  Size: scales linearly
```

## Troubleshooting

### Database connection fails
```bash
# Check if running
docker ps | grep pgvector

# Restart
docker restart pgvector-bench

# Test
psql postgresql://postgres:password@localhost:5432/test_retrievalops_bench -c "SELECT 1;"
```

### Out of memory
```bash
# Increase container memory
docker update --memory 8g pgvector-bench

# Or reduce dataset size
npm run bench -- --size 10000
```

### Inconsistent results
```bash
# Run each config multiple times
npm run bench -- --iterations 3

# Results should vary < 10%
```

## Key Files

- **Setup Guide**: [RUN-BENCHMARKS.md](./packages/adapters/pgvector/RUN-BENCHMARKS.md)
- **Tuning Guide**: [HNSW-TUNING.md](./packages/adapters/pgvector/HNSW-TUNING.md)
- **Expected Results**: [WEEK-2-BENCHMARK-RESULTS.md](./packages/adapters/pgvector/WEEK-2-BENCHMARK-RESULTS.md)
- **Full Benchmarking**: [BENCHMARKING.md](./packages/adapters/pgvector/BENCHMARKING.md)

## Timeline

| Task | Time | Status |
|------|------|--------|
| Setup database | 5min | ⬜ To-do |
| Run 10K benchmark | 10min | ⬜ To-do |
| Run 50K benchmark | 60min | ⬜ To-do |
| Run 100K benchmark | 240min | ⬜ To-do |
| Analyze results | 30min | ⬜ To-do |
| Document findings | 30min | ⬜ To-do |
| **Total** | **~7 hours** | 🚀 Ready |

## Next After Week 2-3

✅ Benchmark all configurations
✅ Document results
⬜ Week 3: Make HNSW the default (m=16)
⬜ Week 4: SearchAdapter abstraction
⬜ Week 5: Add Qdrant adapter

---

**Ready?** Start with Step 1: `docker run ...` above 🚀
