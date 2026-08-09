# Roadmap

## v0.1.0 — MVP (Current Phase)

**Timeline**: 5-6 weeks

The foundation: a functional SDK that demonstrates value on pgvector.

**Deliverables**:

- [x] Project structure and monorepo setup
- [ ] `@retrievalops/core` with entity schemas
- [ ] `@retrievalops/pgvector` adapter with hybrid retrieval
- [ ] PostgreSQL full-text search adapter
- [ ] Local embedding provider (transformers.js)
- [ ] SHA-256 incremental indexing
- [ ] Hybrid retrieval (dense + keyword + RRF fusion)
- [ ] Parent-document deduplication
- [ ] Deterministic explanations
- [ ] Jira PAY-142 example working end-to-end
- [ ] CI/CD pipeline with automated releases
- [ ] Apache 2.0 licensing and governance docs

**Exit Criteria**:

- All packages build, test, and publish successfully
- Example runs without modification
- API is usable but not yet stable

---

## v0.2.0 — Evaluation (2-3 weeks after v0.1)

Make it easy to measure if new retrieval strategies are better.

**Deliverables**:

- [ ] `@retrievalops/evaluator` package
- [ ] Golden-query dataset format (JSONL)
- [ ] Metrics: Precision@K, Recall@K, MRR, nDCG
- [ ] Latency and cost measurements
- [ ] Baseline comparison CLI command
- [ ] JSON, Markdown, and console reports
- [ ] Shadow execution interface
- [ ] Example evaluation workflow

**Exit Criteria**:

- Users can prove whether a new strategy is better with metrics
- Baseline vs. hybrid comparison is reproducible

---

## v0.3.0 — Governance (2-3 weeks after v0.2)

Secure retrieval for multi-tenant production systems.

**Deliverables**:

- [ ] Tenant-scoped entity schemas
- [ ] Principal-based permission enforcement
- [ ] Policy authorization hooks
- [ ] Provenance tracking (what embedded, when, why)
- [ ] Audit event logging
- [ ] Model compatibility validation
- [ ] Safe cache contracts (tenant + principal isolation)
- [ ] Cross-tenant isolation test suite
- [ ] Permission revocation tests
- [ ] Security documentation

**Exit Criteria**:

- Cross-tenant and permission test suites pass with zero leakage
- Ready for production multi-tenant systems

---

## v0.4.0 — Ecosystem (3-4 weeks after v0.3)

Expand beyond pgvector to multiple storage backends.

**Deliverables**:

- [ ] `@retrievalops/qdrant` adapter
- [ ] `@retrievalops/opensearch` adapter
- [ ] `@retrievalops/weaviate` adapter
- [ ] Cross-encoder reranker (`@retrievalops/cross-encoder`)
- [ ] OpenAI embedding provider (`@retrievalops/openai`)
- [ ] Gemini embedding provider (`@retrievalops/gemini`)
- [ ] OpenTelemetry integration
- [ ] Example: multi-tenant document search
- [ ] Example: RAG with tenant isolation
- [ ] MCP-compatible search tool

**Exit Criteria**:

- Same test suite passes against pgvector, qdrant, opensearch, weaviate
- Example RAG application works with multiple backends
- Production-ready OpenTelemetry spans

---

## v1.0.0 — Stable Release

Public API freeze and production readiness.

**Requires**:

- [ ] Public interfaces are stable
- [ ] pgvector + 2 additional adapters pass contract tests
- [ ] Tenant isolation independently tested
- [ ] Evaluation reports are reproducible
- [ ] All ranking results offer deterministic explanations
- [ ] Model migrations support parallel indexes
- [ ] 3+ complete examples with documentation
- [ ] P95 orchestration overhead measured and documented
- [ ] Dependency and container scans pass
- [ ] API compatibility policy published
- [ ] Zero critical security issues

**Breaking Changes Policy**:

After v1.0.0, breaking changes only in major versions (semver). Deprecation warnings required 2+ releases before removal.

---

## Post-v1.0.0: Planned Expansions

### Relationship-Aware Retrieval

Expand queries across related entities:

- Deployment → Pipeline
- Pipeline → Commits
- Incident → Resolution

**Estimated**: Q3 2026

### Cost Optimization

Help teams choose the cheapest retrieval strategy:

- Cost-aware strategy selection
- Embedding cost budgets
- Hybrid strategy cost calculation
- A/B testing with cost metrics

**Estimated**: Q3 2026

### Advanced Reranking

Beyond cross-encoders:

- Learning-to-rank models
- Query-document matching
- Business metric optimization

**Estimated**: Q4 2026

### Knowledge Graph Integration

Enrich retrieval with structured data:

- Entity linking
- Relationship expansion
- Graph-aware ranking

**Estimated**: Q4 2026

### Commercial SDK (Optional)

Hosted retrieval control plane with:

- SaaS storage backend
- Managed model serving
- Analytics and monitoring
- Commercial support

**Status**: TBD, post-v1.0.0 only

---

## Non-Goals (What We Don't Do)

- ❌ Replace vector databases
- ❌ Train embedding models
- ❌ Host LLMs
- ❌ Build chatbot UIs
- ❌ Parse documents (initially)
- ❌ Implement your application logic

---

## Feedback

This roadmap is not immutable. If you have feature requests or concerns:

1. Open an issue with your use case
2. Discuss in GitHub Discussions
3. We may adjust priorities based on community needs

See [GOVERNANCE.md](GOVERNANCE.md) for decision-making process.
