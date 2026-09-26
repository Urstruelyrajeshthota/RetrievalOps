# RetrievalOps

<div align="center">

[![npm version](https://img.shields.io/npm/v/@retrievalops/core?style=flat-square)](https://www.npmjs.com/package/@retrievalops/core)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-blue?style=flat-square)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/tests-195+-brightgreen?style=flat-square)](#-quality)

**Production-ready SDK for retrieval orchestration with explainability**

[Quick Start](#-quick-start) • [Documentation](#-documentation) • [Examples](#-examples) • [vs. Alternatives](./COMPARISON.md)

</div>

---

## 🎯 What is RetrievalOps?

**RetrievalOps** is the open control plane for enterprise-grade AI retrieval systems. It sits between your application and vector/search infrastructure, providing:

- **Intent-aware retrieval** — Classify user goals like root-cause analysis, policy review, troubleshooting, or general search
- **Decision-aware orchestration** — Route retrieval through policy-safe decision logic before execution
- **Explainable evidence** — Understand why a document ranked and what signals drove the decision
- **Policy-first enforcement** — Apply authorization and ACL checks before and after retrieval
- **Swarm-ready execution** — Coordinate multiple specialized agents with deterministic consensus
- **Hybrid and multi-field search** — Combine semantic, keyword, exact, and structured retrieval strategies
- **No vendor lock-in** — Use with PostgreSQL, Qdrant, or self-hosted solutions
- **Production-ready** — Type-safe, fully tested, observable, and policy bounded

RetrievalOps helps applications plan, execute, evaluate, explain, and govern retrieval across existing vector and search infrastructure.

**It works with your database. It does not replace it.**

## 🤔 The Problem

**Vector databases** give you the primitives. But production teams need to answer:

- ✋ What fields should we embed?
- 🎯 How do we rank results fairly?
- 🔀 How do we combine dense + keyword signals?
- 📊 Why did this result rank #1?
- 🔐 How do we enforce permissions per-tenant?
- 🚀 How do we deploy search changes safely?

**RAG frameworks** help you chain retrieval to generation. But they don't solve these problems.

**RetrievalOps** is different—it focuses on the retrieval layer itself.

## ✨ Our Solution

RetrievalOps provides:

| Problem | Solution |
|---------|----------|
| **What is the user trying to do?** | Intent compilation layer that classifies queries such as root cause, troubleshooting, policy review, or general retrieval |
| **Which strategy should run?** | Decision-aware execution that selects the right retrieval path using a configurable decision provider |
| **How do we keep authority safe?** | Policy-first authorization and document filtering before and after retrieval |
| **What should we embed?** | Entity schema DSL with field-level configuration |
| **How do we rank?** | Field weights (0.0-1.4+) and evidence-aware strategy planning |
| **Dense + keyword?** | Native hybrid search with RRF fusion |
| **Why ranked #1?** | Built-in result explanations and evidence traces |
| **Multi-tenant?** | Tenant field isolation in schema plus policy gates |
| **How do we coordinate multiple agents?** | Deterministic swarm planning with role selection and consensus scoring |
| **Safe rollouts?** | Versioned strategies, gradual rollout, and policy-bounded execution |

Use RetrievalOps inside your RAG framework (LlamaIndex, LangChain), or pair it with your own LLM integration. The framework is built for agentic systems that need explainability, controllability, and safety, not just raw vector similarity.

## 📊 When to Use RetrievalOps

**RetrievalOps is perfect for**:
- 🏢 Production search systems (not prototypes)
- 🎯 Applications needing explainable results
- 🔍 Fine-grained retrieval control
- 💰 Cost-conscious teams (self-hosted, no API keys)
- 🔐 Privacy-sensitive applications
- 📚 Multi-field document search

**Not the right fit?** See [COMPARISON.md](./COMPARISON.md) for alternatives.

## 🚀 Use Cases

- **Customer Support** — Search knowledge base with explainable results
- **Issue Tracking** — Find related Jira/Linear tickets (see [example](./examples/jira-pgvector/))
- **Document Search** — Multi-tenant document retrieval with permissions
- **Code Search** — Semantic code search with keyword fallback
- **E-commerce** — Product search combining specs + description + reviews
- **Legal/Compliance** — Regulatory document search with audit trails
- **Agentic Ops** — Route retrieval based on intent and policy constraints before executing search

## Quick Start

### Installation

```bash
npm install @retrievalops/core
npm install @retrievalops/pgvector
npm install @retrievalops/local
```

### Define an Entity

```ts
import { defineEntity } from "@retrievalops/core";

export const jiraTicket = defineEntity({
  name: "jira_ticket",
  id: "id",
  fields: {
    title: {
      retrieval: ["semantic", "keyword"],
      weight: 1.0
    },
    description: {
      retrieval: ["semantic", "keyword"],
      weight: 0.9
    },
    errorMessage: {
      retrieval: ["semantic", "exact"],
      weight: 1.2
    },
    rootCause: {
      retrieval: ["semantic"],
      weight: 1.3
    }
  },
  security: {
    tenantField: "orgId",
    permissionField: "allowedPrincipalIds"
  }
});
```

### Configure Retrieval

```ts
import { RetrievalOps } from "@retrievalops/core";
import { PgVectorAdapter } from "@retrievalops/pgvector";
import { LocalEmbeddingProvider } from "@retrievalops/local";

const retrieval = new RetrievalOps({
  store: new PgVectorAdapter({
    connectionString: process.env.DATABASE_URL
  }),
  embeddings: new LocalEmbeddingProvider({
    model: "Xenova/all-MiniLM-L6-v2"
  })
});
```

### Search and Explain

```ts
const result = await retrieval.search({
  entity: jiraTicket,
  query: "Why did checkout fail in production?",
  context: {
    tenantId: "org-123",
    principalId: "user-456"
  }
});

console.log(result.results[0].explanation);
// {
//   intent: "root_cause",
//   reason: "Root-cause content strongly matched the query",
//   scores: { semantic: 0.91, keyword: 0.73, metadata: 1 }
// }
```

### Decision contract

The decision layer returns inspectable routing metadata rather than unrestricted authority:

```ts
interface RetrievalDecision {
  selected: string;
  selectedStrategy?: string;
  confidence: number;
  rationale?: string;
  evidenceBudget?: {
    maxDocuments: number;
    maxTokens: number;
  };
  modelVersion?: string;
  requiresReview?: boolean;
}
```

This contract is used for strategy selection and evidence budgeting, but it is constrained by the policy engine and must not override tenant isolation or ACL checks.

## ⚡ Key Features

### Intent & Decision Layers
- **Intent compilation** — Classify query semantics such as root cause, policy check, troubleshooting, and general knowledge lookup
- **Decision-aware strategy selection** — Choose the retrieval path based on task type, risk, and evidence requirements
- **Jev-compatible decision adapters** — Plug in richer decision logic without bypassing policy safety
- **Deterministic evaluation** — Evaluate task outcomes using stable scoring and evidence traces

### Policy-Safe Retrieval
- **Authorization-first enforcement** — Validate access before any retrieval execution
- **Policy-aware filtering** — Re-check results against ACL or tenant constraints after candidate retrieval
- **Permission-aware schemas** — Enforce tenant isolation and per-document access control
- **Audit-friendly execution** — Keep decision provenance and policy context visible in the plan

### Retrieval & Orchestration
- **Hybrid retrieval** — Combine dense (semantic) + keyword search via RRF
- **Multi-strategy execution** — Support semantic, keyword, exact, fallback, and policy-driven retrieval flows
- **Swarm coordination** — Run multiple specialized agents with deterministic role assignment and consensus scoring
- **Candidate deduplication** — Remove duplicates intelligently and keep evidence budgets bounded

### Observability
- **Result explanations** — Deterministic why-did-this-rank-here answers
- **Query-intent detection** — Classify queries (error, root_cause, policy_check, solution, general)
- **Telemetry** — Latency, candidate counts, strategy used, and policy decisions
- **Search plans** — Understand retrieval pipeline decisions, evidence sources, and routing choices

### Storage & Performance
- **PostgreSQL + pgvector** — Scalable vector storage
- **Full-text search** — PostgreSQL FTS for keyword retrieval
- **5 strategic indexes** — Optimized for search performance
- **Content deduplication** — SHA-256 hashing prevents duplicate embeddings
- **Connection pooling** — Efficient database use

### Developer Experience
- **TypeScript first** — Full type safety with strict mode
- **No API keys** — Local embeddings (transformers.js)
- **7 pre-configured models** — From fast to high-quality
- **Comprehensive testing** — 195+ test cases
- **Production-ready** — Observable, explainable, policy-safe, and composable

## Architecture

```
Authenticated Agent / Application
        ↓
Policy Gate (tenant + principal + ACL checks)
        ↓
Intent Compiler
        ↓
Policy-constrained Decision Provider / Jev Adapter
        ↓
RetrievalOps Core
        ↓
Strategy Planner + Retrieval Budget
        ↓
Authorized Search Adapters + Vector Stores
        ↓
Post-retrieval ACL verification
        ↓
Evidence evaluation + explanation
        ↓
Approved results / agent context
```

The retrieval pipeline follows:

1. Authenticate the caller and validate tenant/principal context
2. Enforce authorization before any intent or decision processing
3. Classify query intent and required evidence types
4. Route through a decision provider or Jev-style evaluator under the policy constraints
5. Construct a retrieval plan with a bounded evidence budget
6. Run dense, keyword, exact, and fallback searches
7. Fuse candidates via hybrid ranking
8. Deduplicate by parent entity and apply policy filtering
9. Rerank and score final candidates
10. Return results with explainability, telemetry, and policy provenance

This design keeps the framework policy-safe and deterministic while still enabling agentic orchestration and intent-driven retrieval decisions.

## Packages

- **@retrievalops/core** — Main SDK with intent compilation, decision-aware planning, policy enforcement, and swarm orchestration
- **@retrievalops/contracts** — Type interfaces and specifications for intents, policy, decisions, and retrieval contracts
- **@retrievalops/decision** — Default decision and intent compiler implementations
- **@retrievalops/jev** — Jev-aware decision adapters for richer reasoning workflows
- **@retrievalops/evaluator** — Evaluation framework and metrics
- **@retrievalops/observability** — OpenTelemetry integration
- **@retrievalops/cli** — Command-line tools
- **@retrievalops/pgvector** — PostgreSQL + pgvector adapter
- **@retrievalops/qdrant** — Qdrant adapter
- **@retrievalops/opensearch** — OpenSearch adapter
- **@retrievalops/weaviate** — Weaviate adapter
- **@retrievalops/local** — Local embedding provider (transformers.js)
- **@retrievalops/openai** — OpenAI embedding provider

## Examples

See [examples/](examples/) for complete working examples:

- [jira-pgvector](examples/jira-pgvector/) — Jira issue search with hybrid retrieval
- [document-search](examples/document-search/) — Multi-tenant document retrieval
- [multi-tenant-rag](examples/multi-tenant-rag/) — RAG with tenant isolation

## Documentation

- [Getting Started](docs/getting-started.md)
- [Entity Schema Guide](docs/entity-schema.md)
- [Retrieval Strategies](docs/strategies.md)
- [Evaluation Framework](docs/evaluation.md)
- [Security Model](docs/security.md)
- [API Reference](docs/api.md)
- [Architecture Decision Records](docs/adr/)

## 📈 Performance & Metrics

### Benchmark note

The project includes optional HNSW tuning and retrieval optimizations, but benchmark figures should be treated as illustrative unless they are reproduced under a documented configuration (hardware, dataset size, dimensions, concurrency, and timing method).

[Learn more →](./packages/adapters/pgvector/HNSW-TUNING.md)

### Quality Metrics
- ✅ **195+ test cases** across core retrieval and orchestration paths
- ✅ **100% TypeScript** with strict mode
- ✅ **Type safety** for all APIs
- ✅ **Coverage** for critical retrieval and governance flows
- ✅ **Production-oriented design** with policy boundaries and explainable execution

### Scale Characteristics
- Designed for PostgreSQL + pgvector deployments
- Supports concurrent search workloads with adaptive retrieval planning
- Appropriate for multi-tenant and policy-constrained retrieval pipelines

## v0.2.3 Release Notes

RetrievalOps v0.2.3 sharpens the framework around three independently testable responsibilities:

- **Policy enforcement** — authorize before execution and re-apply ACL constraints after retrieval
- **Retrieval intelligence** — intent compilation, decision-aware routing, hybrid search, and evidence evaluation
- **Agent coordination** — deterministic swarm planning with bounded evidence budgets and consensus scoring

The HNSW default remains available for deployments that benefit from the improved vector index settings, but the release emphasis is on governance and decision quality rather than indexing alone.

> Benchmark figures should be interpreted with the dataset, hardware, dimensions, and concurrency noted in the reproducible benchmark logs. The numerical values shown in the matrix are illustrative unless accompanied by their full benchmark configuration.

**Upgrading from v0.1.0?** See [Migration Guide](./packages/adapters/pgvector/MIGRATION-v0.1-to-v0.2.md)

## 🆚 Comparison

How RetrievalOps compares to other solutions:

| Feature | RetrievalOps | LlamaIndex | Pinecone | Qdrant |
|---------|------------|-----------|----------|--------|
| **Explainability** | Strong | Limited | Limited | Limited |
| **Field Weighting** | Native | Basic | Partial | Partial |
| **Policy / ACL control** | Native | External | External | External |
| **Hybrid Search** | Native | Common | Common | Common |
| **TypeScript-first SDK** | Yes | Yes | Partial | Partial |
| **Self-Hosted** | Yes | Often hybrid | No | Yes |
| **Agent orchestration** | Built-in patterns | External | External | External |
| **Cost model** | Low / self-hosted | Free + model costs | Paid | Low / self-hosted |

> This comparison is intentionally feature-oriented rather than subjective. See [COMPARISON.md](./COMPARISON.md) for the full analysis.

👉 **[Full comparison →](./COMPARISON.md)**

## Development

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (for local database services)

### Setup

```bash
git clone https://github.com/Urstruelyrajeshthota/RetrievalOps.git
cd RetrievalOps
npm install
```

> Local embeddings do not require an external API key. Optional hosted providers may still require one depending on the model selected.

### Local Services

Start PostgreSQL, Qdrant, and OpenSearch:

```bash
docker-compose up -d
```

### Build and Test

```bash
npm run build
npm run test
npm run lint
```

### Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

## Security

Please report security vulnerabilities to [security@retrievalops.dev](mailto:security@retrievalops.dev). See [SECURITY.md](SECURITY.md) for details.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the development roadmap and planned features.

## Governance

See [GOVERNANCE.md](GOVERNANCE.md) for governance model and decision-making process.


---

**RetrievalOps v0.2.3** is designed for production use and includes intent-aware retrieval, decision-aware orchestration, policy-safe execution, and swarm-ready agent coordination. Start with the [Quick Start](#quick-start) or see [examples/](examples/) for complete working demonstrations.
