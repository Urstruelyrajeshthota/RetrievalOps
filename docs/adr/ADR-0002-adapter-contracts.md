# ADR-0002: Adapter Contract Design

**Status**: Accepted  
**Date**: 2026-08-09  
**Author**: RetrievalOps Core Team

## Context

RetrievalOps orchestrates retrieval across multiple storage backends. Each adapter (pgvector, Qdrant, OpenSearch, Weaviate) implements different subsets of functionality:

- **All adapters**: Dense vector search (required)
- **Most adapters**: Keyword/full-text search, filtering
- **Some adapters**: Batch operations, exact-match queries
- **Few adapters**: Relationship traversal, range queries

We need a contract that:
1. Guarantees core functionality (dense search)
2. Allows adapters to declare optional capabilities
3. Enables RetrievalOps to choose retrieval strategies based on available capabilities
4. Provides a standard test suite that all adapters must pass

## Decision

**Define a `SearchAdapter` interface with required and optional methods, plus a capability reporting mechanism.**

## Interface Design

```ts
interface SearchAdapter {
  // Required: Dense vector search
  denseSearch(request: DenseSearchRequest): Promise<SearchCandidate[]>;

  // Optional: Full-text/keyword search
  keywordSearch?(request: KeywordSearchRequest): Promise<SearchCandidate[]>;

  // Optional: Exact match (for filtering)
  exactMatch?(request: ExactMatchRequest): Promise<SearchCandidate[]>;

  // Required: Indexing
  index(request: IndexRequest): Promise<IndexResult>;

  // Optional: Batch indexing for efficiency
  batchIndex?(request: BatchIndexRequest): Promise<IndexResult[]>;

  // Required: Deletion
  delete(request: DeleteRequest): Promise<void>;

  // Required: Capability reporting
  capabilities(): AdapterCapabilities;

  // Required: Health checking
  health(): Promise<AdapterHealth>;
}
```

### Capability Reporting

Each adapter reports what it supports:

```ts
interface AdapterCapabilities {
  name: string;
  version: string;
  supportsDenseSearch: boolean;    // Always true
  supportsKeywordSearch: boolean;  // Optional
  supportsExactMatch: boolean;     // Optional
  supportsFiltering: boolean;      // Optional
  supportsBatch: boolean;          // Optional
  maxBatchSize?: number;
}
```

RetrievalOps queries capabilities and adjusts its retrieval plan accordingly.

## Consequences

### Adapters must:
- Implement dense search (non-negotiable)
- Implement consistent scoring (normalize to [0, 1])
- Track embedding provenance (model, version, metric, timestamp)
- Report capabilities honestly (no false claims)
- Pass the standard test suite

### RetrievalOps gains:
- Clear fallback paths when capabilities are missing
- Deterministic strategy selection
- Testable adapter behavior
- Adapter interchangeability

### Edge cases:
- If an adapter doesn't support keyword search, RetrievalOps falls back to dense-only
- If an adapter doesn't support filtering, RetrievalOps filters results in-memory (slower)
- Batch operations are performance optimizations, not correctness requirements

## Test Suite

All adapters must pass `createAdapterTestSuite()`:

```ts
describe('PgVectorAdapter', () => {
  createAdapterTestSuite(async () => {
    return new PgVectorAdapter({ connectionString: '...' });
  });
});
```

The suite tests:
- Capability reporting accuracy
- Health checking
- Single and batch indexing
- Dense and keyword search
- Deletion and idempotency
- Score range validation
- Distance metric handling

## Alternatives Considered

### Single required interface
- **Pro**: Simplicity
- **Con**: Adopters must implement features they don't need

### Adapter-specific interfaces
- **Pro**: Flexibility per storage system
- **Con**: RetrievalOps becomes a switch statement of adapter types

### Capability flags only (no implementation)
- **Pro**: Minimal coupling
- **Con**: Adapters could lie about capabilities

## References

- [Go interfaces](https://golang.org/doc/effective_go#interfaces) — Small, focused contracts
- [Python protocols](https://www.python.org/dev/peps/pep-0544/) — Structural typing
- [Rust traits](https://doc.rust-lang.org/book/ch10-02-traits.html) — Behavioral contracts

## Related ADRs

- [ADR-0001: Monorepo Structure](./ADR-0001-monorepo-structure.md)
- [ADR-0003: Versioning Strategy](./ADR-0003-versioning.md)
- [ADR-0004: Embedding Provenance](./ADR-0004-embedding-provenance.md)
