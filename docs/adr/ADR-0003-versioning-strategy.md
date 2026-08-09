# ADR-0003: Versioning Strategy

**Status**: Accepted  
**Date**: 2026-08-09  
**Author**: RetrievalOps Core Team

## Context

RetrievalOps is a monorepo with 18 interdependent packages. We need a versioning strategy that:

1. Allows independent adapter updates without forcing core bumps
2. Prevents version hell (e.g., core@1.2.3 requires adapter@2.0.0)
3. Makes it clear which versions are compatible
4. Enables automated releases

## Decision

**Use Semantic Versioning with independent package versions and peer dependencies.**

## Versioning Scheme

### Core Packages
- `@retrievalops/core`, `@retrievalops/contracts`, `@retrievalops/evaluator` → Linked versioning
- All release together as a unit (v0.1.0, v0.2.0, etc.)
- Breaking changes to contracts affect core version

### Adapters
- `@retrievalops/pgvector`, `@retrievalops/qdrant`, etc. → Independent versioning
- Can be patched independently of core
- Must declare compatible core versions via peer dependency

### Embedding Providers
- `@retrievalops/openai`, `@retrievalops/gemini`, `@retrievalops/local` → Independent versioning
- Can update independently (e.g., follow upstream model changes)

### Rerankers
- `@retrievalops/cross-encoder`, `@retrievalops/llm` → Independent versioning

## Example

```json
{
  "name": "@retrievalops/pgvector",
  "version": "1.0.5",
  "peerDependencies": {
    "@retrievalops/core": "^1.0"
  }
}
```

This means:
- pgvector can be v1.0.5 while core is v1.0.0
- pgvector v1.0.5 works with core v1.0.x through v1.9.9
- pgvector needs a major version bump only when core requires it

## Release Process

### Automated via Changesets

1. Contributors add changeset files describing their changes
2. On merge to `main`, GitHub Action bumps versions
3. Packages with changes are released
4. Linked packages (core, contracts, evaluator) release together

### Version Bumping Rules

| Change | Core | Adapter | Embedding Provider |
|--------|------|---------|-------------------|
| Patch (bug fix) | patch | patch | patch |
| New optional API | minor | minor | minor |
| Breaking public API | major | major* | major* |

*Adapters/providers only bump major when the breaking change affects their implementation.

## Consequences

### Benefits
1. Adapter authors can fix bugs without waiting for core releases
2. Embedding providers can update models independently
3. Dependencies stay loose (no version coupling)
4. Production teams can upgrade incrementally

### Constraints
1. Adapters cannot rely on unreleased core features
2. Core version bumps don't automatically bump adapters (explicit changelog needed)
3. Documentation must clearly specify adapter ↔ core compatibility

## Compatibility Matrix Example

```
Core v1.0.0  ← pgvector v1.0.0
             ← pgvector v1.0.1 (patch)
             ← pgvector v1.1.0 (minor)
             ← qdrant v2.0.0 (independent versioning)

Core v1.1.0  ← pgvector v1.0.0 (still compatible)
             ← pgvector v1.1.0
             ← pgvector v1.2.0
```

## Tooling

**Changesets** manages versioning:

```bash
# Add a changeset
npx changeset add

# Bump versions based on changesets
npm run version

# Publish to npm
npm run release
```

Each changeset describes one logical change and the affected packages.

## Alternatives Considered

### Lock-step versioning
- All packages always the same version
- **Pro**: Simple semantics ("we use v1.0.0")
- **Con**: Forces adapter patch releases for unrelated core changes

### Per-package independent versioning
- Every package can version freely
- **Pro**: Maximum flexibility
- **Con**: Version combinations explode; users confused about compatibility

### Semantic versioning constraints
- Explicit compatibility matrix in docs
- **Pro**: Fine-grained control
- **Con**: Manual maintenance; error-prone

## References

- [Semantic Versioning](https://semver.org)
- [Changesets Documentation](https://github.com/changesets/changesets)
- [Monorepo versioning patterns](https://monorepo.tools/#semver)

## Related ADRs

- [ADR-0001: Monorepo Structure](./ADR-0001-monorepo-structure.md)
- [ADR-0002: Adapter Contracts](./ADR-0002-adapter-contracts.md)
