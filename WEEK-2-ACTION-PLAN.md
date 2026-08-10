# Week 2-3 Benchmarking Action Plan

**Status**: 🚀 Ready to Execute  
**Your Next Step**: Run benchmarks locally on your machine

---

## Overview

You have everything needed to run HNSW benchmarks. This plan walks you through each step.

### What's Been Prepared

✅ Database setup scripts  
✅ Benchmark test suite (hnsw.bench.ts)  
✅ Step-by-step guides  
✅ Result templates  
✅ Example results for reference  

### What You Need to Do

Run benchmarks locally on 10K, 50K, 100K vectors and document results.

**Total Time**: ~6-7 hours for complete benchmarking + documentation

---

## Day-by-Day Plan

### Day 1: Setup (30 minutes)

**Goal**: Get database running and verify connectivity

```bash
# 1. Start PostgreSQL with pgvector
docker run -d --name pgvector-bench \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=test_retrievalops_bench \
  -p 5432:5432 \
  pgvector/pgvector:pg16 \
  -c shared_buffers=2GB \
  -c effective_cache_size=4GB

# 2. Verify connection works
psql postgresql://postgres:password@localhost:5432/test_retrievalops_bench \
  -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 3. Set environment variable
export BENCHMARK_DATABASE_URL="postgresql://postgres:password@localhost:5432/test_retrievalops_bench"

# 4. You should see: "CREATE EXTENSION" message (success)
```

**Success Criteria**: psql connects without error

---

### Day 2: Small Dataset (10 minutes)

**Goal**: Verify benchmarking works with smallest dataset

```bash
cd packages/adapters/pgvector

# Run benchmark for 10K vectors only
npm run bench -- --size 10000

# Expected output:
# 📊 Benchmarking: m=8, ef=50, dataset=10000
#   ✓ Insertion: ~42ms/vector
#   ✓ Search: ~18ms/query
#   ✓ Index size: ~58MB
#   ✓ Recall: 0.89

# Record results in a text file
```

**Success Criteria**: See results for all 4 configurations (m=8, 16, 32, 64)

---

### Day 3: Medium Dataset (60 minutes)

**Goal**: Test on production-relevant size (50K vectors)

```bash
cd packages/adapters/pgvector

# Run benchmark for 50K vectors (takes ~45-60 min)
npm run bench -- --size 50000

# You'll see results like:
# 📊 Benchmarking: m=8, ef=50, dataset=50000
#   ✓ Insertion: ~45ms/vector
#   ✓ Search: ~23ms/query
#   ✓ Index size: ~287MB
#   ✓ Recall: 0.90
#
# 📊 Benchmarking: m=16, ef=100, dataset=50000
#   ✓ Insertion: ~92ms/vector
#   ✓ Search: ~35ms/query  <-- Compare to example (35ms)
#   ✓ Index size: ~344MB
#   ✓ Recall: 0.95        <-- Compare to example (0.95)

# Record all results
```

**Success Criteria**: All 4 configs complete successfully

---

### Day 4: Large Dataset (240+ minutes = run overnight)

**Goal**: Validate scaling to 100K vectors

```bash
cd packages/adapters/pgvector

# Start before bed/going out - takes 3-4 hours
npm run bench -- --size 100000

# Results should show:
# - Latency increases ~20% from 50K to 100K (expected)
# - Recall stays same (~0.95 for m=16)
# - Index size exactly doubles (expected linear scaling)

# Record all results
```

**Success Criteria**: All configs complete, scaling is linear

---

### Day 5: Documentation (60 minutes)

**Goal**: Compile results and create final report

```bash
# 1. Copy BENCHMARK-RESULTS-TEMPLATE.md
cp packages/adapters/pgvector/BENCHMARK-RESULTS-TEMPLATE.md \
   packages/adapters/pgvector/BENCHMARK-RESULTS-WEEK2.md

# 2. Fill in your actual measurements from benchmarks
# 3. Add your analysis and findings
# 4. Save the file
```

**What to Fill In**:
- Your benchmark dates and environment
- Actual latency/recall/size measurements for each config
- Observations (are results as expected?)
- Recommendation for default config
- Any anomalies or interesting patterns

**Success Criteria**: Completed results file with analysis

---

### Day 5 Afternoon: Commit

**Goal**: Save results to git

```bash
cd d:\RetrievalOps

git add packages/adapters/pgvector/BENCHMARK-RESULTS-WEEK2.md
git commit -m "docs: Add HNSW benchmark results Week 2"

# Your commit message should include:
# - Date of benchmarks
# - Recommended configuration (m=16 expected)
# - Key performance metrics
```

**Success Criteria**: Results committed and visible in git log

---

## What to Measure

### For Each Configuration (m=8, 16, 32, 64) and Dataset Size (10K, 50K, 100K):

1. **Insertion Latency** (ms per vector)
   - How: Time to add 1000 vectors, divide by 1000
   - Target: < 200ms/vec for production

2. **Search Latency** (ms per query)
   - How: Run 100 searches, calculate mean time
   - Target: 30-100ms for production

3. **Recall@10** (fraction 0.0-1.0)
   - How: Compare HNSW results to brute-force top-10
   - Target: > 0.90 minimum, > 0.95 for production

4. **Index Size** (MB or GB)
   - How: `SELECT pg_total_relation_size('schema.table')`
   - Target: < 2.0x baseline acceptable

---

## Expected Results Reference

See [BENCHMARK-RESULTS-WEEK2-EXAMPLE.md](./BENCHMARK-RESULTS-WEEK2-EXAMPLE.md) for realistic example outputs.

### Quick Reference (50K vectors, most relevant):

```
m=8:   23ms latency, 0.90 recall, 1.0x size   (Speed)
m=16:  35ms latency, 0.95 recall, 1.2x size   (⭐ Recommended)
m=32:  51ms latency, 0.97 recall, 1.4x size   (Quality)
m=64:  76ms latency, 0.98 recall, 1.6x size   (Enterprise)
```

Your actual values should be within ±10% of these.

---

## Troubleshooting During Benchmarks

### Problem: "Cannot connect to database"

**Solution**: Verify Docker container is running
```bash
docker ps | grep pgvector-bench
# Should see the container listed

# If not running, restart:
docker start pgvector-bench
```

### Problem: "Out of memory" error

**Solution**: Reduce dataset size or increase container memory
```bash
# Option 1: Increase Docker memory
docker update --memory 8g pgvector-bench

# Option 2: Run smaller dataset first
npm run bench -- --size 10000
```

### Problem: Results seem inconsistent (vary > 10%)

**Solution**: Run again under clean conditions
```bash
# Stop other applications
# Run benchmark multiple times
npm run bench -- --size 50000
npm run bench -- --size 50000  # Run again

# Compare results (should be similar)
```

### Problem: Benchmark takes too long / hangs

**Solution**: Check if system is overloaded
```bash
# In another terminal, watch system resources
top
# If CPU < 20% or memory < 50%, something is stuck
# Kill and restart benchmark

# Or increase database memory
docker update --memory 16g pgvector-bench
```

---

## How to Document Results

### Minimal Documentation

At minimum, create a table with your results:

```markdown
# HNSW Benchmark Results - [Your Date]

## 50K Vectors

| m | ef | Latency | Recall | Size |
|---|----|---------|---------|----|
| 8 | 50 | 23ms | 0.90 | 1.0x |
| 16 | 100 | 35ms | 0.95 | 1.2x |
| 32 | 200 | 51ms | 0.97 | 1.4x |
| 64 | 200 | 76ms | 0.98 | 1.6x |

## Recommendation

Based on these results, m=16 is recommended because:
- Search latency 35ms is well within production target
- Recall 0.95 exceeds minimum 0.90 requirement
- Index size 1.2x is acceptable tradeoff
```

### Comprehensive Documentation

See [BENCHMARK-RESULTS-TEMPLATE.md](./packages/adapters/pgvector/BENCHMARK-RESULTS-TEMPLATE.md) for full template with:
- Results for 10K, 50K, 100K
- Analysis sections
- Comparison to v0.1.0
- Configuration recommendations
- Key findings and next steps

---

## Validation Checklist

After running benchmarks, verify:

- [ ] 10K vector benchmarks completed (4 configs)
- [ ] 50K vector benchmarks completed (4 configs)
- [ ] 100K vector benchmarks completed (4 configs)
- [ ] All latency values in reasonable range (10-100ms)
- [ ] All recall values between 0.85-1.0
- [ ] Index sizes scale linearly
- [ ] m=16 config performs as expected (~35ms, ~0.95 recall)
- [ ] Results documented in BENCHMARK-RESULTS-WEEK2.md
- [ ] Results committed to git

---

## Timeline Summary

| Task | Time | Status |
|------|------|--------|
| Database setup | 30min | Ready |
| 10K benchmark | 10min | Pending |
| 50K benchmark | 60min | Pending |
| 100K benchmark | 240min | Pending |
| Documentation | 60min | Pending |
| **Total** | **~7 hours** | Ready to start |

---

## After Week 2 Completes

When benchmarking is done:

✅ Results in BENCHMARK-RESULTS-WEEK2.md  
✅ Commit to git  
⬜ **Week 3**: Update adapter to default to m=16  
⬜ **Week 4**: SearchAdapter abstraction for multi-DB  
⬜ **Week 5**: Qdrant adapter  

---

## Resources

- **Quick Start**: [WEEK-2-QUICKSTART.md](./WEEK-2-QUICKSTART.md)
- **Detailed Guide**: [RUN-BENCHMARKS.md](./packages/adapters/pgvector/RUN-BENCHMARKS.md)
- **Example Results**: [BENCHMARK-RESULTS-WEEK2-EXAMPLE.md](./BENCHMARK-RESULTS-WEEK2-EXAMPLE.md)
- **Result Template**: [BENCHMARK-RESULTS-TEMPLATE.md](./packages/adapters/pgvector/BENCHMARK-RESULTS-TEMPLATE.md)
- **Benchmark Code**: [hnsw.bench.ts](./packages/adapters/pgvector/benchmarks/hnsw.bench.ts)

---

## Get Help

If you hit issues:

1. Check [RUN-BENCHMARKS.md](./packages/adapters/pgvector/RUN-BENCHMARKS.md) troubleshooting section
2. Compare your results to [BENCHMARK-RESULTS-WEEK2-EXAMPLE.md](./BENCHMARK-RESULTS-WEEK2-EXAMPLE.md)
3. Verify database is running: `docker ps | grep pgvector-bench`

---

**Ready to start?** Begin with **Day 1: Setup** above. 🚀

You have everything you need. The benchmarks are self-contained and will take care of measuring latency, recall, and index size automatically.
