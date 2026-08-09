# RetrievalOps Documentation

This directory contains comprehensive documentation for RetrievalOps.

## Quick Links

- [Getting Started](./getting-started.md) — Set up RetrievalOps in 5 minutes
- [Entity Schema Guide](./entity-schema.md) — Define what to embed and how to weight it
- [Retrieval Strategies](./strategies.md) — Dense, hybrid, field-level, and more
- [Evaluation Framework](./evaluation.md) — Measure retrieval quality
- [Security Model](./security.md) — Tenant isolation and access control
- [API Reference](./api.md) — Complete API documentation
- [Architecture Decision Records](./adr/) — Design decisions and rationale

## Architecture

```
Application
    ↓
RetrievalOps Core
    ├── Entity Schema
    ├── Query Planner
    ├── Access Control
    └── Retrieval Pipeline
        ├── Dense Search
        ├── Keyword Search
        ├── Fusion & Deduplication
        ├── Reranking
        └── Explanation
    ↓
Search Adapters (pgvector, Qdrant, OpenSearch, Weaviate)
    ↓
Existing Databases
```

## Getting Started

Install the core and your adapter of choice:

```bash
npm install @retrievalops/core @retrievalops/pgvector @retrievalops/local
```

## Documentation Structure

- **User Guide** — How to use RetrievalOps
- **Developer Guide** — Building adapters and extensions
- **API Reference** — Detailed API documentation
- **Examples** — Working code samples
- **Architecture** — System design and decisions

## Contributing to Docs

Documentation improvements are welcome! See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.
