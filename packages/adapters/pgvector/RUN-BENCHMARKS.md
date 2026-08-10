# Running HNSW Benchmarks - Week 2 & 3

Complete guide to running and interpreting benchmark results.

## Quick Start (5 minutes)

```bash
cd packages/adapters/pgvector

# 1. Start PostgreSQL + pgvector
docker-compose up -d postgres

# 2. Set database URL
export BENCHMARK_DATABASE_URL="postgresql://postgres:password@localhost:5432/test_retrievalops_bench"

# 3. Run benchmarks
npm run bench

# 4. View results in console output
```

## Full Benchmarking Procedure

### Phase 1: Setup (10 minutes)

**Prerequisite**: Docker installed and running

```bash
# Start PostgreSQL with pgvector
docker run --name pgvector-bench \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=test_retrievalops_bench \
  -p 5432:5432 \
  pgvector/pgvector:pg16 \
  -c shared_buffers=2GB \
  -c effective_cache_size=4GB \
  -c maintenance_work_mem=512MB

# Verify connection
psql postgresql://postgres:password@localhost:5432/test_retrievalops_bench \
  -c "CREATE EXTENSION IF NOT EXISTS vector; SELECT version();"
```

### Phase 2: Run Benchmark Suite (depends on dataset size)

**10K vectors**: ~5-10 minutes
**50K vectors**: ~30-60 minutes
**100K vectors**: ~2-4 hours

```bash
cd packages/adapters/pgvector

# Run full suite (all sizes + configs)
npm run bench

# Or run specific benchmark
npm run bench -- --size 50000

# Or run specific configuration
npm run bench -- --config m=16
```

### Phase 3: Collect Results (5 minutes)

Benchmark runner outputs:
1. Console log with configuration info
2. CSV file with detailed metrics
3. JSON file with raw data

Example output:

```
🚀 Starting HNSW Benchmark Suite

Testing configurations:
  - m=8, efConstruction=100
  - m=16, efConstruction=200
  - m=32, efConstruction=400
  - m=64, efConstruction=400

============================================================
Dataset Size: 10,000 vectors
============================================================

📊 Benchmarking: m=8, ef=50, dataset=10000
  ✓ Insertion: 45.23ms/vector
  ✓ Search: 20.15ms/query
  ✓ Index size: 58.2MB
  ✓ Recall: 0.90

📊 Benchmarking: m=16, ef=100, dataset=10000
  ✓ Insertion: 95.67ms/vector
  ✓ Search: 30.42ms/query
  ✓ Index size: 69.8MB
  ✓ Recall: 0.95

[... more results ...]

================================================================================
BENCHMARK REPORT
================================================================================

Dataset: 10,000 vectors
---
Config            Latency    Recall    Index Size
m=8 ef=50         20.15ms    0.90      1.0x (58.2MB)
m=16 ef=100       30.42ms    0.95      1.2x (69.8MB)
m=32 ef=200       45.23ms    0.97      1.4x (81.5MB)
m=64 ef=200       68.91ms    0.98      1.6x (93.2MB)

================================================================================
KEY FINDINGS
================================================================================
✓ Benchmarking complete. See report above for results.
✓ Recommendations based on latency/recall targets:
  - For speed: Use m=8, ef=50 (20-50ms latency)
  - For balance: Use m=16, ef=100 (35-100ms latency)
  - For quality: Use m=32, ef=200 (50-150ms latency)
```

## Interpreting Results

### Search Latency

```
What it means: Time to find 10 nearest neighbors

Good:           < 50ms (fast)
Acceptable:     50-100ms (moderate)
Needs tuning:   > 100ms (slow)

Compare to:     v0.1.0 IVFFlat at 145ms
```

### Recall@10

```
What it means: Fraction of true top-10 neighbors found

Good:           > 0.95 (95% of true neighbors found)
Acceptable:     0.90-0.95 (90-95%)
Needs tuning:   < 0.90 (missing neighbors)

Formula:
  recall = matching_results / 10
  where matching_results = # of true neighbors in HNSW top-10
```

### Index Size

```
What it means: Disk space for vector + graph structure

Acceptable:     1.0-2.0x baseline
Too large:      > 2.0x (need smaller m)
Optimal:        1.2-1.4x (balanced tradeoff)
```

## Parameter Tuning Guide

### If Search Latency is Too High (> 100ms)

```
Try these in order:

1. Reduce ef (if recall still > 0.90)
   Current: ef=100
   Try: ef=50

2. Reduce m (may hurt recall)
   Current: m=16
   Try: m=8

3. Profile database:
   - Check CPU: SELECT * FROM pg_stat_statements;
   - Check disk: iostat -x 1
```

### If Recall is Too Low (< 0.90)

```
Try these in order:

1. Increase ef (only search param)
   Current: ef=100
   Try: ef=200

2. Increase m (impacts insert + search)
   Current: m=16
   Try: m=32

3. Increase efConstruction (only at index time)
   Current: efConstruction=200
   Try: efConstruction=400
```

### If Index Size is Too Large (> 2.0x)

```
Reduce m (smaller graph):
  Current: m=32
  Try: m=16 or m=8

Note: This will likely reduce recall. Accept if speed is priority.
```

## Benchmark Across Dataset Sizes

### Why Test Multiple Sizes?

Different sizes show different patterns:
- **10K**: Fast indexes, may not show scaling issues
- **50K**: Good middle ground, realistic production size
- **100K**: Shows memory pressure and scaling behavior

### Recommended Pattern

1. **First**: Run on 50K (most realistic)
2. **If good**: Verify on 10K (should be faster)
3. **If good**: Verify on 100K (scaling check)

### Expected Scaling

```
10K vectors → 50K vectors:
  ✓ Search latency: increases ~1.5-2x
  ✓ Index size: scales linearly
  ✓ Recall: should stay same

50K vectors → 100K vectors:
  ✓ Search latency: increases ~1.2-1.5x
  ✓ Index size: scales linearly
  ✓ Recall: should stay same (or improve slightly)
```

## Database Performance Tips

### Before Running Benchmarks

```sql
-- Increase shared buffers for faster ops
ALTER SYSTEM SET shared_buffers = '2GB';

-- Increase work memory
ALTER SYSTEM SET work_mem = '512MB';

-- Disable unnecessary logging
ALTER SYSTEM SET log_statement = 'none';

-- Restart PostgreSQL
SELECT pg_reload_conf();
```

### Monitor During Benchmarks

```bash
# Terminal 1: Watch database activity
watch -n 1 'psql $BENCHMARK_DATABASE_URL -c \
  "SELECT sum(heap_blks_read) as heap_read, \
          sum(heap_blks_hit) as heap_hit \
   FROM pg_statio_user_tables;"'

# Terminal 2: Monitor memory
docker stats pgvector-bench

# Terminal 3: Watch index building progress
psql $BENCHMARK_DATABASE_URL -c \
  "SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch \
   FROM pg_stat_user_indexes WHERE indexname LIKE 'idx_vectors_%';"
```

## Troubleshooting

### Issue: "Database unavailable" error

```bash
# Check if PostgreSQL is running
docker ps | grep pgvector

# Restart if needed
docker restart pgvector-bench

# Verify connection
psql postgresql://postgres:password@localhost:5432/test_retrievalops_bench \
  -c "SELECT 1;"
```

### Issue: "Out of memory" during indexing

```bash
# Reduce dataset size or m parameter
npm run bench -- --size 10000 --config m=8

# Or increase container memory
docker update --memory 8g pgvector-bench
docker restart pgvector-bench
```

### Issue: Benchmarks are too slow

```bash
# Check if there are competing processes
top

# Isolate benchmark:
docker pause $(docker ps -q --filter name=^/(?!pgvector).*$)
npm run bench
docker unpause $(docker ps -q --filter name=^/(?!pgvector).*$)
```

### Issue: Results seem inconsistent

```bash
# Run each config multiple times
npm run bench -- --config m=16 --iterations 3

# Average the results manually
# (Expected: < 10% variance between runs)
```

## Saving Results for Analysis

### Export to CSV

```typescript
// In benchmark code
const results: BenchmarkResult[] = [...];
const csv = [
  ['config', 'dataset', 'latency', 'recall', 'size'].join(','),
  ...results.map(r => 
    [r.name, r.datasetSize, r.searchLatencyMs, r.recall, r.indexSizeMB].join(',')
  )
].join('\n');

fs.writeFileSync('BENCHMARK-RESULTS-WEEK2.csv', csv);
```

### Share Results

Create `BENCHMARK-RESULTS-WEEK2.md`:

```markdown
# HNSW Benchmark Results - Aug 10, 2026

**Benchmark Date**: Aug 10, 2026  
**Test Environment**: PostgreSQL 16, pgvector 0.5.0  
**Dataset**: [Your test vectors]  
**Duration**: 2 hours

## Findings

[Your detailed findings]

## Recommendation

Based on these results, we recommend **m=16, ef=100** for production because:
1. Search latency of 35ms is well within 100ms budget
2. Recall of 0.95 meets production standard
3. Index size of 1.2x is acceptable tradeoff
4. Consistent performance across 10K-100K sizes

## Data

[Include raw CSV or table here]
```

## Next Steps

After completing Week 2-3 benchmarks:

1. ✅ Document findings in BENCHMARK-RESULTS-WEEK2.md
2. ✅ Commit results to git
3. ⬜ Week 3: Make HNSW the default indexing strategy
4. ⬜ Week 4: Implement SearchAdapter abstraction
5. ⬜ Week 5: Add Qdrant adapter

See [ROADMAP-v0.2.0.md](../../ROADMAP-v0.2.0.md) for full timeline.
