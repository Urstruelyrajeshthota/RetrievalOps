# RetrievalOps FAQ

## General Questions

### What is RetrievalOps?

RetrievalOps is an open-source SDK for production-grade retrieval systems with:
- Multi-field entity schemas with field-level control
- Hybrid retrieval combining dense and keyword search
- Explainable results showing why each result ranked
- Local embeddings (no API keys required)

### How is it different from vector databases?

Vector databases store and retrieve vectors. RetrievalOps sits on top, adding:
- Explainability and field-level control
- Multiple retrieval signal combination
- Schema-driven development

### How is it different from RAG frameworks?

RAG frameworks (LlamaIndex, LangChain) chain retrieval -> LLM.
RetrievalOps focuses on the retrieval layer itself with:
- Fine-grained ranking control
- Explainable results
- Field weighting per document field
- Works with any RAG framework

### Do I need a vector database?

Yes, RetrievalOps needs a storage backend.
Currently supports PostgreSQL + pgvector.

### Can I use local embeddings?

Yes! RetrievalOps uses transformers.js by default.
Embeddings run locally on your machine. No API keys needed.

### What embedding models are supported?

7 pre-configured models:
- Fast: Xenova/all-MiniLM-L6-v2 (384D)
- High-quality: Xenova/all-mpnet-base-v2 (768D)
- Retrieval-optimized: BGE models
- Multilingual: mBERT variants

## Technical Questions

### How does field weighting work?

Each field has a weight (0.0 to 1.4+).
Scores are multiplied by these weights before ranking.

### How does hybrid search work?

RetrievalOps combines dense and keyword search using RRF:
score = 1/(k + rank_dense) + 1/(k + rank_keyword)

### What is RRF?

Reciprocal Rank Fusion combines rankings from multiple sources.
Mathematically sound, no tuning needed, better than weighted average.

### How do result explanations work?

Each result includes intent, matched fields, and score breakdown.
Lets you understand why results ranked.

### How do I enforce permissions?

Use security configuration with tenantField and permissionField.
RetrievalOps enforces these during search.

## Deployment

### How do I deploy to production?

1. Set up PostgreSQL with pgvector
2. Set DATABASE_URL environment variable
3. Run your application
4. Monitor via telemetry

### How do I scale RetrievalOps?

RetrievalOps scales with PostgreSQL + pgvector:
- Horizontal scaling via read replicas
- Vertical scaling via hardware upgrades
- Pooling for connection efficiency

### Can I use it in serverless?

Yes, with caveats. Cold starts are slower.
Recommended: persistent containers.

### What about costs?

RetrievalOps itself is free (open-source).
Costs are PostgreSQL hosting + (optional) embedding API.

## Comparison

### vs. LlamaIndex?

RetrievalOps: Retrieval layer, explainable, low learning curve
LlamaIndex: End-to-end RAG, integrations

### vs. Pinecone?

RetrievalOps: Self-hosted, free, full control, explainable
Pinecone: Managed service, $0.40/1M queries

### vs. Qdrant?

RetrievalOps: TypeScript SDK, explainable
Qdrant: Vector database, language-agnostic

## Getting Started

### Where do I start?

1. Read README.md
2. Run examples/jira-pgvector/
3. Check packages/core/README.md

### How long does setup take?

From zero to search in 15 minutes.

### Can I see working examples?

Yes! See examples/jira-pgvector with 6 sample Jira tickets.

---

More questions? Open a discussion →
https://github.com/Urstruelyrajeshthota/RetrievalOps/discussions
