# Getting Started with RetrievalOps

This guide will get you up and running with RetrievalOps in about 5 minutes.

## Prerequisites

- Node.js 18+
- PostgreSQL with pgvector (or Docker)

## Installation

### Step 1: Install Core Packages

```bash
npm install @retrievalops/core @retrievalops/pgvector @retrievalops/local
```

### Step 2: Start PostgreSQL (Docker)

If you have Docker Compose installed, you can start PostgreSQL with pgvector:

```bash
docker-compose up postgres
```

Otherwise, install PostgreSQL with pgvector extension locally.

### Step 3: Define an Entity

Create `entity.ts`:

```ts
import { defineEntity } from "@retrievalops/core";

export const document = defineEntity({
  name: "document",
  id: "id",
  fields: {
    title: {
      retrieval: ["semantic", "keyword"],
      weight: 1.0
    },
    content: {
      retrieval: ["semantic"],
      weight: 1.0
    }
  }
});
```

### Step 4: Configure RetrievalOps

Create `retrieval.ts`:

```ts
import { RetrievalOps } from "@retrievalops/core";
import { PgVectorAdapter } from "@retrievalops/pgvector";
import { LocalEmbeddingProvider } from "@retrievalops/local";
import { document } from "./entity";

const retrieval = new RetrievalOps({
  store: new PgVectorAdapter({
    connectionString: "postgresql://user:password@localhost:5432/db"
  }),
  embeddings: new LocalEmbeddingProvider({
    model: "Xenova/all-MiniLM-L6-v2"
  })
});

export default retrieval;
```

### Step 5: Index a Document

```ts
import retrieval from "./retrieval";
import { document } from "./entity";

await retrieval.index({
  entity: document,
  document: {
    id: "doc-1",
    title: "How to use RetrievalOps",
    content: "RetrievalOps is an SDK for retrieval orchestration..."
  }
});
```

### Step 6: Search

```ts
const result = await retrieval.search({
  entity: document,
  query: "How do I get started?"
});

console.log(result.results[0]);
// {
//   id: "doc-1",
//   score: 0.87,
//   explanation: { ... }
// }
```

## Next Steps

- [Entity Schema Guide](./entity-schema.md) — Learn about field configurations
- [Retrieval Strategies](./strategies.md) — Explore advanced retrieval techniques
- [Examples](../examples/) — Check out complete working examples

## Troubleshooting

### Connection Error

Make sure PostgreSQL is running and accessible:

```bash
psql -U retrievalops -h localhost -d retrievalops_dev
```

### Import Errors

Ensure all dependencies are installed:

```bash
npm install
npm run build
```

### Model Download

The first time you use local embeddings, the model will be downloaded (200MB+). This may take a few minutes.

## Getting Help

- [GitHub Discussions](https://github.com/retrievalops/retrievalops/discussions)
- [Security Issues](./SECURITY.md)
- Email: hello@retrievalops.dev
