# ADR-0001: Monorepo Structure

**Status**: Accepted  
**Date**: 2026-08-09  
**Author**: RetrievalOps Core Team

## Context

RetrievalOps needs to support multiple storage backends (pgvector, Qdrant, OpenSearch, Weaviate), embedding providers (OpenAI, Gemini, local), and rerankers, while maintaining a unified core SDK.

We had to choose between:
1. **Monorepo** — Single repository with multiple packages
2. **Multi-repo** — Separate repositories for core and adapters
3. **Hybrid** — Core and essential adapters in main repo, others separate

## Decision

**Adopt a monorepo using npm workspaces.**

## Rationale

### Advantages

1. **Unified versioning** — All packages version together; easier to reason about compatibility
2. **Shared contracts** — `@retrievalops/contracts` is the single source of truth for adapter APIs
3. **Easier testing** — Adapter test suites run against contract interface in the same repo
4. **Contributor friction** — New contributors clone one repo, not five
5. **CI/CD simplicity** — One build pipeline tests all packages
6. **Rapid iteration** — Cross-package changes don't require multiple PRs

### Disadvantages

1. **Slower builds** — All packages rebuild even if changes are localized
   - *Mitigation*: Use Turbo caching to optimize
2. **Larger dependency footprint** — Transitive dependencies accumulate
   - *Mitigation*: Each package specifies minimal direct deps
3. **Per-adapter maintenance** — Adapter maintainers must clone the full repo
   - *Mitigation*: Adapter-focused CI/CD paths, GitHub CODEOWNERS

## Consequences

- All packages must use consistent tooling (TypeScript, ESLint, Prettier)
- Breaking changes to contracts affect all adapters
- Adapter releases are coordinated (all or nothing for major versions)
- Clear package boundaries are critical to avoid coupling

## Alternatives Considered

### Multi-repo
- **Pro**: Adapter owners have independent control
- **Con**: Version hell, contract drift, contributor friction

### Hybrid
- **Pro**: Keeps core and pgvector together while allowing adapter independence
- **Con**: "Special" pgvector status; others feel like afterthoughts

## References

- [Monorepo Handbook](https://monorepo.tools)
- [Nx vs Turbo comparison](https://nx.dev/nx-and-turbo)
- [npm Workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces)

## Related ADRs

- [ADR-0002: Adapter Contract Design](./ADR-0002-adapter-contracts.md)
- [ADR-0003: Versioning Strategy](./ADR-0003-versioning.md)
