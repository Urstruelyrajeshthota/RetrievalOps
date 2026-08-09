# @retrievalops/local

Local on-device embedding provider for RetrievalOps.

Generates embeddings using transformers.js. No API keys required, no external service calls, 100% privacy-respecting.

## Features

- **On-Device Processing** — All computation happens locally
- **No API Keys** — No external dependencies or rate limits
- **Multiple Models** — 7+ pre-configured models from Hugging Face
- **Pooling Strategies** — Mean and CLS pooling support
- **Batch Processing** — Efficient handling of multiple texts
- **Vector Normalization** — Automatic L2 normalization
- **Model Registry** — Curated list with performance metrics

## Installation

```bash
npm install @retrievalops/local @xenova/transformers
```

## Quick Start

```ts
import { LocalEmbeddingProvider } from '@retrievalops/local';

// Create provider (uses default model)
const provider = new LocalEmbeddingProvider();

// Embed a query
const queryVector = await provider.embedQuery('What is AI?');

// Embed documents
const docVectors = await provider.embedDocuments([
  'Artificial Intelligence is...',
  'Machine Learning is...'
]);
```

## Configuration

```ts
const provider = new LocalEmbeddingProvider({
  // Model selection
  model: 'Xenova/all-MiniLM-L6-v2',        // Default
  
  // Pooling strategy
  pooling: 'mean',                         // or 'cls'
  
  // Performance tuning
  batchSize: 32,                           // Texts per batch
  maxLength: 512,                          // Max tokens
  
  // Output
  normalize: true,                         // Normalize to unit vectors
  
  // Caching
  cacheDir: '/path/to/models',             // Model cache location
  autoDownload: true,                      // Download on first use
  
  // Callbacks
  onProgress: (progress) => {
    console.log(`${progress.status}: ${progress.name}`);
  }
});

await provider.initialize();
```

## Available Models

### Fast (384D, ~50 tokens/sec)

```ts
new LocalEmbeddingProvider({
  model: 'Xenova/all-MiniLM-L6-v2'
})
```

Best for real-time applications. Good quality at minimal resource cost.

### Quality (768D, ~10 tokens/sec)

```ts
new LocalEmbeddingProvider({
  model: 'Xenova/all-mpnet-base-v2'
})
```

Higher quality but slower. Use when quality is more important than speed.

### Retrieval-Optimized (384D, ~45 tokens/sec)

```ts
new LocalEmbeddingProvider({
  model: 'Xenova/bge-small-en-v1.5'
})
```

Specifically optimized for information retrieval tasks.

### Multilingual (384D-768D)

```ts
new LocalEmbeddingProvider({
  model: 'Xenova/multilingual-e5-base'  // 768D, high quality
})
```

Supports 100+ languages. Use for international applications.

## Usage

### Single Query

```ts
const embedding = await provider.embedQuery('Hello world');
// Returns: number[] (384 dimensions by default)
```

### Batch Documents

```ts
const embeddings = await provider.embedDocuments([
  'First document',
  'Second document',
  'Third document'
]);
// Returns: number[][] (array of 384-dim vectors)
```

### List Models

```ts
// All available models
const models = provider.listModels();

// Model details
const models = provider.getModelInfo('Xenova/all-MiniLM-L6-v2');
// {
//   name: 'Xenova/all-MiniLM-L6-v2',
//   version: '2.6.0',
//   dimensions: 384,
//   metric: 'cosine',
//   pooling: 'mean'
// }
```

### Recommendations

```ts
const registry = new ModelRegistry();

// Get recommended models
registry.getRecommendedModel('speed');        // Fastest
registry.getRecommendedModel('quality');      // Best quality
registry.getRecommendedModel('multilingual'); // Multi-lang support
```

### Model Statistics

```ts
const stats = provider.getStats();
// {
//   initialized: true,
//   modelLoaded: true,
//   modelName: 'Xenova/all-MiniLM-L6-v2',
//   dimensions: 384
// }
```

## Integration with RetrievalOps

```ts
import { RetrievalOps } from '@retrievalops/core';
import { PgVectorAdapter } from '@retrievalops/pgvector';
import { LocalEmbeddingProvider } from '@retrievalops/local';

const retrieval = new RetrievalOps({
  store: new PgVectorAdapter({ connectionString: '...' }),
  embeddings: new LocalEmbeddingProvider({
    model: 'Xenova/all-MiniLM-L6-v2'
  })
});

// Index documents
await retrieval.index({
  entity: documentSchema,
  document: { id: '1', title: 'Test', content: '...' }
});

// Search
const results = await retrieval.search({
  entity: documentSchema,
  query: 'What is..?'
});
```

## Performance Tips

### Choose the Right Model

| Use Case | Model | Speed | Quality |
|----------|-------|-------|---------|
| Real-time search | all-MiniLM-L6-v2 | Fast | Good |
| Highest quality | all-mpnet-base-v2 | Slow | Excellent |
| Information retrieval | bge-base-en-v1.5 | Medium | Excellent |
| Multi-language | multilingual-e5-base | Slow | Excellent |

### Batch Processing

```ts
// Good: Process multiple texts together
const embeddings = await provider.embedDocuments([...]);

// Avoid: Individual embeddings in a loop
for (const text of texts) {
  await provider.embedQuery(text); // Slow!
}
```

### Caching

Models are cached locally. First run downloads (~200-500MB). Subsequent runs are instant.

Set `HF_HOME` environment variable to customize cache location:

```bash
export HF_HOME=/path/to/cache
```

## Advanced Usage

### Custom Models

Register custom Hugging Face models:

```ts
const registry = new ModelRegistry();

registry.registerModel({
  name: 'sentence-transformers/all-minilm-l6-v2',
  version: '1.0.0',
  dimensions: 384,
  pooling: 'mean',
  metric: 'cosine'
});
```

### Progress Tracking

```ts
const provider = new LocalEmbeddingProvider({
  onProgress: (progress) => {
    switch (progress.status) {
      case 'downloading':
        console.log(`Downloading ${progress.name}...`);
        break;
      case 'processing':
        console.log(`Processing... ${Math.round(progress.progress || 0)}%`);
        break;
      case 'ready':
        console.log(`Ready to embed!`);
        break;
    }
  }
});
```

### Dynamic Model Switching

```ts
// Unload current model
await provider.unload();

// Switch to different model
const newProvider = new LocalEmbeddingProvider({
  model: 'Xenova/all-mpnet-base-v2'
});

const embedding = await newProvider.embedQuery('test');
```

## Limitations

- **First-run latency** — Model download on first use (~30 seconds for 200MB)
- **Memory usage** — Depends on model size (150MB-500MB)
- **Hardware** — CPU-only by default (use with GPU for 10x speedup)
- **Model size** — Embeddings are limited by model's context window

## Requirements

- Node.js 18+
- @xenova/transformers
- 200-500MB disk space per model

## See Also

- [@retrievalops/core](../../core) — Main RetrievalOps SDK
- [@retrievalops/pgvector](../pgvector) — PostgreSQL adapter
- [Hugging Face Models](https://huggingface.co/Xenova)
- [Transformers.js](https://xenova.github.io/transformers.js/)

## License

Apache 2.0
