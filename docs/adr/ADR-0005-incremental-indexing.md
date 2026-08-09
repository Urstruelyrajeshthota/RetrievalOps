# ADR-0005: Incremental Indexing with SHA-256 Deduplication

**Status**: Accepted  
**Date**: 2026-08-09  
**Author**: RetrievalOps Core Team

## Context

Embeddings are expensive. Generating 1M embeddings × 0.0002 USD per 1K tokens = $200+ for a single reindex.

When a document is updated, often only one field changes:
- Title changes but content stays same
- Content updates but error message stays same

Without deduplication, **every update re-embeds everything**, wasting money.

## Decision

**Use SHA-256 content hashing to detect unchanged fields and skip re-embedding.**

## Implementation

### Hash-Based Deduplication

```ts
const contentHash = sha256(fieldText);

// Query index: do we already have this hash?
const existing = await index.lookup({
  entityId: doc.id,
  field: "content",
  hash: contentHash
});

if (existing) {
  // Reuse old embedding
  await index.reuse({
    from: existing.vectorId,
    to: { entityId: doc.id, field: "content" }
  });
} else {
  // Generate new embedding
  const embedding = await embedder.embed(fieldText);
  await index.store({
    entityId: doc.id,
    field: "content",
    text: fieldText,
    vector: embedding,
    contentHash
  });
}
```

### Savings Example

Updating a document with 5 fields (only 1 changed):

**Without deduplication**:
- Re-embed all 5 fields → 5 API calls
- Cost: 5 × $0.0002 = $0.001 per update

**With deduplication**:
- Re-embed only changed field → 1 API call
- Cost: 1 × $0.0002 = $0.0002 per update
- Savings: **80%**

For 1M updates/day: ~$160/day saved.

## Consequences

### Benefits
1. Dramatic cost savings
2. Faster reindexing (skip embedding generation)
3. Encourages per-field indexing (only embed what matters)

### Constraints
1. Must store content hash with each vector
2. Text changes → new hash → new embedding (correct behavior)
3. Whitespace/formatting changes trigger re-embedding (not ideal but safe)

### Edge Cases

#### Field-level deduplication
If **multiple fields** have identical content:

```ts
content: "Error occurred",
errorMessage: "Error occurred"  // Same text
```

Hash collision is *intentional* — reuse embedding across fields.

#### Content updates
If content is updated but produces same hash (impossible with SHA-256), still embed:

```ts
// SHA-256 collision is cryptographically infeasible
// (would require ~2^128 attempts)
```

#### Model changes
When embedding model changes, old hashes are invalid:

```ts
// Old: Xenova/all-MiniLM-L6-v2
const oldHash = sha256(text);

// New: sentence-transformers/all-MiniLM-L6-v2
const newHash = sha256(text);  // Same hash!

// Problem: Can't distinguish "same model, reuse" vs "new model, reembed"
// Solution: Prefix hash with model ID
const prefixedHash = sha256(`${model}::${text}`);
```

## Hash Format

```ts
interface ContentHashRecord {
  text: string;
  model: string;           // Embedding model
  modelVersion: string;    // Model version
  fieldName: string;       // Field being embedded
  hash: string;            // SHA-256(model::text)
  createdAt: Date;
}
```

When a new model is deployed:
1. Old hashes have old model prefix
2. New embeddings have new model prefix
3. No collision; deduplication still works

## Storage Impact

Hash record adds ~64 bytes per vector:
- Hash: 64 bytes (hex string)
- Model: 30 bytes
- Metadata: 20 bytes

For 1M vectors: ~114 MB (negligible).

## Alternatives Considered

### Always re-embed
- **Pro**: Simplest implementation
- **Con**: 4-5x cost increase

### Content versioning
- Track document version to detect changes
- **Pro**: Don't need to compute hashes
- **Con**: Assumes version field exists and is maintained

### Bloom filters
- Probabilistic duplicate detection
- **Pro**: Smaller memory
- **Con**: False positives; not suitable for cost optimization

## References

- [SHA-256 Collision Resistance](https://crypto.stackexchange.com/questions/4948/why-was-sha-1-deprecated-if-nobody-has-found-a-collision)
- [Content-addressable storage](https://en.wikipedia.org/wiki/Content-addressable_storage)
- [Embedding cost analysis](https://www.databricks.com/blog/2023/01/26/embeddings-a-deep-dive.html)

## Related ADRs

- [ADR-0004: Embedding Provenance](./ADR-0004-embedding-provenance.md)
- [ADR-0006: Parallel Model Migration](./ADR-0006-parallel-model-migration.md)
