# RetrievalOps

The open control plane for reliable AI retrieval.

RetrievalOps helps applications plan, execute, evaluate, explain and govern retrieval across existing vector and search infrastructure.

It works with your database. It does not replace it.

## Why RetrievalOps?

Vector databases provide retrieval primitives. Production teams still need to decide:

- What to embed
- How to route queries
- How to combine retrieval signals
- How to evaluate relevance
- Why results ranked
- How to enforce permissions
- How to deploy search changes safely

RAG frameworks help you chain retrieval to generation. RetrievalOps focuses on the retrieval layer itself—making it observable, explainable, and composable.

Use RetrievalOps inside your RAG framework, or pair it with your own LLM integration.

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

## Features

- **Entity-aware embeddings** — Define which fields to embed and how to weight them
- **Query-intent detection** — Classify what the user is looking for
- **Hybrid retrieval** — Combine dense, keyword, and exact-match signals
- **Candidate fusion** — Rank and deduplicate results intelligently
- **Deterministic explanations** — Know why each result ranked
- **Built-in evaluation** — Measure retrieval quality with standard metrics
- **Permission enforcement** — Tenant and principal-level access control
- **Multi-database support** — PostgreSQL, Qdrant, OpenSearch, Weaviate adapters
- **OpenTelemetry integration** — Observe retrieval pipelines in production

## Architecture

```
Application or Agent
        ↓
   RetrievalOps Core
        ↓
Plan and Policy
        ↓
Retrieval Pipeline
        ↓
Search Adapters
        ↓
Existing Databases
```

The retrieval pipeline follows:

1. Validate access
2. Classify query intent
3. Construct retrieval plan
4. Run dense, keyword, and exact searches
5. Fuse candidates
6. Deduplicate by parent entity
7. Rerank
8. Apply final policy checks
9. Return results with evidence and telemetry

## Packages

- **@retrievalops/core** — Main SDK
- **@retrievalops/contracts** — Type interfaces and specifications
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

## Development

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (for local database services)

### Setup

```bash
git clone https://github.com/retrievalops/retrievalops.git
cd retrievalops
npm install
```

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
