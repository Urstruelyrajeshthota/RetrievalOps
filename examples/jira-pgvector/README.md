# RetrievalOps Jira Example

End-to-end demonstration of RetrievalOps with real-world Jira ticket search.

## Overview

This example demonstrates how to use RetrievalOps to:

1. **Index** Jira tickets with semantic and keyword embeddings
2. **Search** tickets using hybrid retrieval (dense + keyword search with RRF)
3. **Rank** results based on field weights and explanations
4. **Explain** why results matched (which fields, what intent)

## Sample Data

The example includes 6 sample Jira tickets from the PAY project:

- **PAY-142**: Payment deployment failed with HTTP 503 (production incident)
- **PAY-143**: Checkout timeout on high traffic days (performance issue)
- **PAY-144**: NullPointerException in refund processing (bug)
- **PAY-145**: Duplicate charges appearing in billing (critical issue)
- **PAY-146**: Payment API rate limit exceeded (external dependency)
- **PAY-147**: Webhook signature verification failing (integration issue)

## Architecture

```
Jira Tickets
    ↓
Entity Schema (multi-field with weights)
    ├── summary (weight: 1.2)
    ├── description (weight: 0.9)
    ├── errorMessage (weight: 1.3)
    ├── rootCause (weight: 1.4)
    └── resolution (weight: 1.1)
    ↓
RetrievalOps Core
    ├── LocalEmbeddingProvider (Xenova/all-MiniLM-L6-v2)
    ├── PgVectorAdapter (PostgreSQL + pgvector)
    └── Fusion Algorithm (RRF)
    ↓
Ranked Results with Explanations
```

## Setup

Prerequisites: Node.js 18+, PostgreSQL 12+, pgvector extension

Installation:
```bash
npm install
```

Database setup:
```bash
createdb retrievalops_dev
psql retrievalops_dev -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

## Usage

### Index Tickets

```bash
npm run index
```

### Search Tickets

```bash
npm run search
```

## Entity Schema

Fields:
- rootCause (weight: 1.4) — Highest priority
- errorMessage (weight: 1.3) — High priority
- summary (weight: 1.2) — High priority
- resolution (weight: 1.1) — Medium priority
- description (weight: 0.9) — Standard priority

Retrieval strategies:
- Semantic + Keyword: summary, description
- Semantic only: rootCause, resolution
- Exact match: key, environment, projectKey

## Performance

- Indexing: 50-100ms per ticket
- Search: 100-200ms per query
- Total (6 tickets): 300-600ms
- Hybrid strategy: Dense + Keyword with RRF fusion

## Files

- src/entity.ts — Schema and sample data
- src/index-tickets.ts — Indexing script
- src/search-tickets.ts — Search demonstration
- package.json — Dependencies

---

**RetrievalOps v0.1.0** | Apache 2.0 License
