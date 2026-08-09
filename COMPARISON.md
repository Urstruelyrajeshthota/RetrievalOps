# RetrievalOps vs. Alternatives

How RetrievalOps compares to other retrieval solutions.

## vs. LlamaIndex

| Feature | RetrievalOps | LlamaIndex |
|---------|-------------|-----------|
| **Focus** | Retrieval orchestration | Full RAG framework |
| **Storage** | PostgreSQL + pgvector | Multiple (20+) |
| **Embeddings** | Local + pluggable | API-based (OpenAI, etc) |
| **Schema DSL** | ✅ Multi-field with weights | ❌ Basic |
| **Hybrid Search** | ✅ RRF fusion | ✅ Via integration |
| **Explanations** | ✅ Built-in | ❌ |
| **Field Weighting** | ✅ Per-field control | ❌ |
| **Local Inference** | ✅ No API keys | ❌ Requires API |
| **Cost** | Free (open-source) | Free (but API costs) |
| **Learning Curve** | Low (focused) | High (comprehensive) |

**Use RetrievalOps if**: You want fine-grained retrieval control with explainability.  
**Use LlamaIndex if**: You want end-to-end RAG with many integrations.

---

## vs. Pinecone

| Feature | RetrievalOps | Pinecone |
|---------|-------------|----------|
| **Type** | Self-hosted SDK | Managed service |
| **Cost** | Free (self-hosted) | $0.40/1M queries |
| **Hybrid Search** | ✅ Native | ✅ Via metadata |
| **Schema DSL** | ✅ Multi-field | ❌ |
| **Explainability** | ✅ Full explanations | ❌ Similarity only |
| **Control** | ✅ Full | ❌ Managed |
| **Setup Time** | 10 minutes | 5 minutes (cloud) |
| **Data Privacy** | ✅ Your servers | ❌ Cloud |
| **Scalability** | ✅ PostgreSQL scale | ✅ Unlimited |
| **Local Dev** | ✅ Docker | ❌ Cloud-only |

**Use RetrievalOps if**: You want self-hosted, explainable retrieval.  
**Use Pinecone if**: You want managed, scalable infrastructure.

---

## vs. Weaviate

| Feature | RetrievalOps | Weaviate |
|---------|-------------|----------|
| **Type** | SDK + storage | Vector database |
| **Learning** | Schema DSL | GraphQL schema |
| **Setup** | Easy (Docker) | Medium (complex) |
| **Hybrid** | ✅ RRF fusion | ✅ BM25 fusion |
| **Field Weights** | ✅ Per-field | ❌ Global |
| **Explanations** | ✅ Built-in | ❌ |
| **PostgreSQL** | ✅ Native | ❌ Separate DB |
| **Cost** | Free | Free/Enterprise |
| **Community** | Growing | Large |

**Use RetrievalOps if**: You want simplicity + explainability.  
**Use Weaviate if**: You want a standalone vector DB.

---

## vs. Milvus

| Feature | RetrievalOps | Milvus |
|---------|-------------|---------|
| **Type** | SDK framework | Vector database |
| **Setup** | Very easy | Medium |
| **Language** | TypeScript | Python-first |
| **Hybrid** | ✅ RRF | ✅ Filtering |
| **Schema DSL** | ✅ Multi-field | ❌ |
| **Explainability** | ✅ Full | ❌ |
| **Scaling** | Moderate | Excellent |
| **Community** | Growing | Large (Chinese) |

**Use RetrievalOps if**: You're building in TypeScript/Node.js.  
**Use Milvus if**: You need massive scale or Python.

---

## vs. Qdrant

| Feature | RetrievalOps | Qdrant |
|---------|-------------|---------|
| **Type** | SDK + storage | Vector database |
| **Language** | TypeScript | Rust (any language) |
| **Setup** | Easy | Medium |
| **Hybrid** | ✅ RRF native | ✅ Payload filtering |
| **Schema DSL** | ✅ Type-safe | ❌ |
| **Explanations** | ✅ | ❌ |
| **Field Weights** | ✅ | ❌ |
| **Performance** | Good | Excellent |
| **Cloud** | ❌ Self-hosted | ✅ Managed option |

**Use RetrievalOps if**: You want explainable retrieval with TypeScript.  
**Use Qdrant if**: You need high performance or managed cloud.

---

## Summary Matrix

| Dimension | RetrievalOps | LlamaIndex | Pinecone | Weaviate | Milvus | Qdrant |
|-----------|------------|-----------|----------|----------|--------|--------|
| **Ease of Use** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **Explainability** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐ | ⭐ | ⭐ | ⭐ |
| **Field Weighting** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐ | ⭐ |
| **Hybrid Search** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Performance** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Cost** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **TypeScript** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **Learning Curve** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐ | ⭐⭐⭐ |

---

## When to Use RetrievalOps

✅ **Perfect for**:
- Building production search systems
- Needing explainable retrieval decisions
- Fine-tuning field-level ranking
- TypeScript/Node.js applications
- Hybrid dense + keyword search
- Cost-conscious projects (self-hosted)
- Privacy-sensitive applications

❌ **Not ideal for**:
- Rapid prototyping (use LlamaIndex)
- Multi-language support (use Pinecone)
- No ops budget (use managed Qdrant/Pinecone)
- Python-first projects (use Milvus)

---

## Migration Guides

### From LlamaIndex → RetrievalOps
See [MIGRATION_LLAMAINDEX.md](./docs/migration-llamaindex.md)

### From Pinecone → RetrievalOps
See [MIGRATION_PINECONE.md](./docs/migration-pinecone.md)

### To LlamaIndex from RetrievalOps
RetrievalOps integrates with LlamaIndex! Use RetrievalOps for retrieval, LlamaIndex for orchestration.

---

## Feature Comparison Details

### Entity Schema & Configuration

**RetrievalOps**:
```typescript
const entity = defineEntity({
  name: "ticket",
  fields: {
    title: { retrieval: ["semantic", "keyword"], weight: 1.2 },
    body: { retrieval: ["semantic"], weight: 0.9 }
  }
});
```

**LlamaIndex**:
```python
from llama_index import Document, VectorStoreIndex
docs = [Document(text=...)]
index = VectorStoreIndex.from_documents(docs)
```

RetrievalOps gives finer control, LlamaIndex is simpler.

### Hybrid Search Implementation

**RetrievalOps**:
- Native RRF (Reciprocal Rank Fusion)
- Score normalization
- Field weighting

**Pinecone**:
- Requires metadata filtering
- No fusion algorithm
- Limited ranking control

**Qdrant**:
- Custom scoring
- Payload filtering
- More complex setup

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
