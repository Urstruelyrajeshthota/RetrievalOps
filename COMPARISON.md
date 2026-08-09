# RetrievalOps and Other Retrieval Tools

How RetrievalOps positions itself alongside existing solutions.

## Positioning

Existing retrieval tools expose powerful but different capabilities:
- **Vector databases** (Qdrant, Weaviate, Pinecone, Milvus) provide persistent storage and search primitives
- **RAG frameworks** (LlamaIndex, LangChain) orchestrate retrieval → LLM pipelines
- **Search engines** (Elasticsearch, OpenSearch) provide keyword and ranking control

**RetrievalOps** aims to provide a portable operational contract that makes these capabilities easier to define, understand, and eventually evaluate.

---

## vs. LlamaIndex

LlamaIndex is a comprehensive RAG framework. RetrievalOps is a retrieval orchestration layer.

| Aspect | RetrievalOps | LlamaIndex |
|--------|-------------|-----------|
| **Scope** | Retrieval layer only | End-to-end RAG |
| **Embedding support** | Local (transformers.js) + pluggable | Local + API providers (OpenAI, etc) |
| **Storage backends** | PostgreSQL + pgvector | 20+ integrations |
| **Schema definition** | Entity schema DSL with field config | Basic index configuration |
| **Hybrid search** | Built-in RRF fusion | Via custom retriever |
| **Result explanations** | Built-in (matched fields, intent) | Application responsibility |
| **Field weighting** | Per-field ranking control | Not supported |

**Best for different purposes**:
- RetrievalOps: Fine-grained retrieval control and explainability
- LlamaIndex: Full RAG pipeline with many integrations

**They work together**: Use RetrievalOps for retrieval, LlamaIndex for orchestration.

---

## vs. Pinecone

Pinecone is a managed vector database service. RetrievalOps is a retrieval SDK.

| Aspect | RetrievalOps | Pinecone |
|--------|-------------|----------|
| **Type** | Self-hosted SDK | Managed service |
| **Operations** | Self-managed | Fully managed |
| **Storage** | PostgreSQL + pgvector | Pinecone proprietary |
| **Hybrid search** | RRF fusion (semantic + keyword) | Keyword filtering + vector search |
| **Ranking control** | Field-level weights | Global/index level |
| **Result explanations** | Matched fields, intent detection | Similarity scores only |
| **Setup** | Docker + PostgreSQL | Cloud console |
| **Data location** | Your infrastructure | Pinecone cloud |
| **Pricing model** | Self-hosted costs | Usage-based (vectors, queries) |
| **Local development** | Full Docker stack | Cloud-only |

**Best for different purposes**:
- RetrievalOps: Fine-grained control, private infrastructure, explainability
- Pinecone: Managed service, enterprise scale, operational simplicity

---

## vs. Weaviate

Weaviate is a vector database with built-in hybrid search. RetrievalOps is a retrieval orchestration SDK.

| Aspect | RetrievalOps | Weaviate |
|--------|-------------|----------|
| **Type** | Retrieval SDK | Vector database |
| **Storage** | PostgreSQL + pgvector | Weaviate (embedded or standalone) |
| **Configuration** | Entity schema DSL | GraphQL schema definition |
| **Hybrid search** | RRF (semantic + keyword) | BM25 fusion (native FTS) |
| **Ranking control** | Field-level weights | Index-level configuration |
| **Result scoring** | Explanations + score breakdown | explainScore (available) |
| **Learning curve** | Focused (retrieval layer) | Steeper (full database) |
| **Setup** | Docker for PostgreSQL | Docker container or managed |
| **Deployment** | Any environment | Standalone or cloud |
| **Integrations** | PostgreSQL ecosystem | Weaviate-specific |

**Best for different purposes**:
- RetrievalOps: Portable retrieval layer, field-level ranking control, existing infrastructure
- Weaviate: Standalone vector database, GraphQL API, complete search solution

---

## vs. Milvus

Milvus is a vector database optimized for scale. RetrievalOps is a retrieval orchestration SDK.

| Aspect | RetrievalOps | Milvus |
|--------|-------------|--------|
| **Type** | Retrieval SDK | Vector database |
| **Primary language** | TypeScript/JavaScript | Python, with SDKs for other languages |
| **Storage** | PostgreSQL + pgvector | Milvus (embedded or standalone) |
| **Hybrid search** | RRF fusion | Scalar filtering + vector search |
| **Ranking control** | Field-level weights | Filtering + similarity scoring |
| **Result explanations** | Matched fields, intent | Similarity scores |
| **Scale characteristics** | PostgreSQL limits | Designed for billions of vectors |
| **Setup complexity** | Docker for PostgreSQL | Docker or Kubernetes deployment |
| **Use case** | Fine-grained retrieval control | Massive-scale vector search |

**Best for different purposes**:
- RetrievalOps: TypeScript applications, field-level ranking, explainability
- Milvus: Massive scale requirements, Python-first workflows

---

## vs. Qdrant

Qdrant is a high-performance vector database. RetrievalOps is a retrieval orchestration SDK.

| Aspect | RetrievalOps | Qdrant |
|--------|-------------|--------|
| **Type** | Retrieval SDK | Vector database |
| **Language** | TypeScript/JavaScript | Rust, language-agnostic (REST/gRPC) |
| **Storage** | PostgreSQL + pgvector | Qdrant (embedded or server) |
| **Hybrid search** | RRF fusion (semantic + keyword) | Multi-vector, named vectors, filtering |
| **Ranking control** | Field-level weights | Named vectors, payload filtering, scoring |
| **Result explanations** | Matched fields, intent detection | Similarity scores, multi-vector breakdown |
| **Performance focus** | PostgreSQL/IVFFlat | HNSW, optimized for scale |
| **Setup** | Docker + PostgreSQL | Docker container or server |
| **Deployment options** | Self-hosted | Self-hosted + managed cloud (Qdrant Cloud) |
| **Client libraries** | TypeScript native | Multiple languages via REST/gRPC |

**Best for different purposes**:
- RetrievalOps: TypeScript applications, portable schema, field-level ranking control, explainability
- Qdrant: High-performance vector search, language-agnostic access, managed cloud option

---

## Quick Selection Guide

| Need | Recommended |
|------|------------|
| **Retrieval layer only** | RetrievalOps |
| **End-to-end RAG** | LlamaIndex |
| **Managed vector DB** | Pinecone, Qdrant Cloud |
| **Self-hosted vector DB** | Weaviate, Qdrant, Milvus |
| **Field-level ranking control** | RetrievalOps |
| **Explainable results** | RetrievalOps |
| **High-scale search (1B+ vectors)** | Milvus, Pinecone |
| **TypeScript-native** | RetrievalOps, LlamaIndex |
| **Python-first** | LlamaIndex, Milvus |
| **Language-agnostic** | Qdrant, Weaviate, Milvus |
| **Lowest operational burden** | Pinecone, Qdrant Cloud |
| **Maximum control** | RetrievalOps (with PostgreSQL) |

---

## When to Use RetrievalOps

**RetrievalOps is designed for**:
- Applications needing field-level ranking control
- Systems requiring explainable search results
- TypeScript/Node.js environments
- Hybrid dense + keyword retrieval
- Privacy-sensitive deployments (self-hosted)
- Cost-optimized architectures

**Consider alternatives if**:
- You need end-to-end RAG orchestration (→ LlamaIndex)
- You prefer fully managed infrastructure (→ Pinecone, Qdrant Cloud)
- You need maximum scale (→ Milvus, Pinecone)
- You require language-agnostic APIs (→ Qdrant, Weaviate)

---

## Migration Guides

### From LlamaIndex → RetrievalOps
See [MIGRATION_LLAMAINDEX.md](./docs/migration-llamaindex.md)

### From Pinecone → RetrievalOps
See [MIGRATION_PINECONE.md](./docs/migration-pinecone.md)

### To LlamaIndex from RetrievalOps
RetrievalOps integrates with LlamaIndex! Use RetrievalOps for retrieval, LlamaIndex for orchestration.

---

## Portable Retrieval Contract

The core insight behind RetrievalOps is that a portable **retrieval contract** enables:

1. **Declarative configuration** — Define retrieval intent in schema, not code
2. **Operational clarity** — Understanding why results ranked helps debugging
3. **Future composability** — Swap storage backends without changing retrieval logic
4. **Evaluation frameworks** — Measure retrieval quality consistently

```typescript
// RetrievalOps: Schema defines retrieval intent
const entity = defineEntity({
  name: "ticket",
  fields: {
    title: { retrieval: ["semantic", "keyword"], weight: 1.2 },
    rootCause: { retrieval: ["semantic"], weight: 1.4 }
  }
});

// Search tells you why results ranked
const results = await retrieval.search({ entity, query: "..." });
results.results[0].explanation; // { intent, matchedFields, scoreBreakdown }
```

Other tools solve the storage or orchestration problem well. RetrievalOps focuses on the contract that sits between your application logic and retrieval infrastructure.

### Hybrid Search Approaches

Different tools implement hybrid search differently:

**RetrievalOps**:
- RRF fusion combining semantic + keyword signals
- Per-field ranking weights
- Built into retrieval orchestration layer

**Pinecone**:
- Vector similarity + metadata filtering
- Scoring via vector distance only

**Qdrant**:
- Named vectors for multi-vector queries
- Payload filtering + custom scoring
- Multi-vector reranking

**Weaviate**:
- BM25 keyword search + vector similarity
- explainScore for result explanation

---

## Choosing the Right Tool

**Pick RetrievalOps if you answer YES to**:
- Do you need explainable retrieval results?
- Do you want to control field-level weighting?
- Are you building in TypeScript/Node.js?
- Do you want to run locally without API costs?
- Do you need hybrid dense + keyword search?

**Pick alternatives if**:
- You need Python (Milvus, LlamaIndex)
- You want fully managed cloud (Pinecone, Weaviate Cloud)
- You need massive scale only (Milvus, Qdrant)
- You want end-to-end RAG framework (LlamaIndex)

---

**Still have questions?** [Open a Discussion](https://github.com/Urstruelyrajeshthota/RetrievalOps/discussions)
