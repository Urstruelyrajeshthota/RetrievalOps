#!/bin/bash

# HNSW Benchmarking Runner
# Run this script locally with a PostgreSQL + pgvector database

set -e

# Configuration
DATABASE_URL="${BENCHMARK_DATABASE_URL:-postgresql://postgres:password@localhost:5432/test_retrievalops_bench}"
DATASET_SIZES=(10000 50000 100000)
CONFIGS=(
  "m=8,efConstruction=100,ef=50"
  "m=16,efConstruction=200,ef=100"
  "m=32,efConstruction=400,ef=200"
  "m=64,efConstruction=400,ef=200"
)

echo "🚀 HNSW Benchmarking Suite"
echo "Database: $DATABASE_URL"
echo ""

# Verify database connection
echo "🔍 Verifying database connection..."
psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1 || {
  echo "❌ Cannot connect to database"
  echo "Please start PostgreSQL with pgvector and set BENCHMARK_DATABASE_URL"
  exit 1
}
echo "✓ Database connected"
echo ""

# Run benchmarks
for SIZE in "${DATASET_SIZES[@]}"; do
  echo "════════════════════════════════════════════════════════════════"
  echo "Dataset Size: $SIZE vectors"
  echo "════════════════════════════════════════════════════════════════"
  echo ""

  for CONFIG in "${CONFIGS[@]}"; do
    IFS=',' read -r m efConstruction ef <<< "$CONFIG"

    echo "📊 Benchmarking: $CONFIG (size=$SIZE)"

    # Run npm test with benchmark
    npm run bench -- --size "$SIZE" --config "$CONFIG" 2>/dev/null || {
      echo "  ⚠️  Benchmark failed (ensure database is running)"
      continue
    }

    echo ""
  done
done

echo "✓ Benchmarking complete"
echo "📄 Results saved to BENCHMARK-RESULTS-WEEK2.md"
