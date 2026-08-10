/**
 * Multi-Adapter Examples for RetrievalOps v0.2.1
 *
 * Demonstrates all 4 supported backends:
 * 1. PostgreSQL + pgvector
 * 2. Qdrant
 * 3. Weaviate
 * 4. Milvus
 */

import { createDefaultFactory, AdapterConfigs, type AdapterType } from '@itsrajeshthota/retrievalops-contracts';

// Example 1: PostgreSQL Adapter
async function example1_postgresql() {
  console.log('\n=== Example 1: PostgreSQL Adapter ===\n');

  const { PgVectorAdapter } = await import('@itsrajeshthota/retrievalops-pgvector');

  const adapter = new PgVectorAdapter({
    connectionString: 'postgresql://localhost/retrievalops',
    indexingStrategy: 'hnsw',
    hnsw: {
      m: 16,
      efConstruction: 200,
      ef: 100,
    },
  });

  await adapter.initialize();

  // Index documents
  await adapter.indexBatch({
    documents: [
      {
        id: 'doc-1',
        vector: new Array(384).fill(0.1),
        metadata: { title: 'Python Guide', category: 'programming' },
      },
      {
        id: 'doc-2',
        vector: new Array(384).fill(0.2),
        metadata: { title: 'JavaScript Basics', category: 'web' },
      },
    ],
  });

  // Search
  const results = await adapter.denseSearch({
    query: new Array(384).fill(0.15),
    limit: 5,
  });

  console.log(`PostgreSQL found ${results.length} results`);
  results.forEach(r => console.log(`  - ${r.metadata.title}: ${r.score.toFixed(3)}`));

  await adapter.close();
}

// Example 2: Qdrant Adapter
async function example2_qdrant() {
  console.log('\n=== Example 2: Qdrant Adapter ===\n');

  const { QdrantAdapter } = await import('@itsrajeshthota/retrievalops-qdrant');

  const adapter = new QdrantAdapter({
    url: 'http://localhost:6333',
    collectionName: 'documents',
    vectorSize: 384,
    hnsw: {
      m: 16,
      efConstruction: 200,
    },
  });

  await adapter.initialize();

  // Index documents
  await adapter.indexBatch({
    documents: [
      {
        id: 'qdrant-1',
        vector: new Array(384).fill(0.1),
        metadata: { title: 'Machine Learning', category: 'ai' },
      },
      {
        id: 'qdrant-2',
        vector: new Array(384).fill(0.2),
        metadata: { title: 'Deep Learning', category: 'ai' },
      },
    ],
  });

  // Search
  const results = await adapter.denseSearch({
    query: new Array(384).fill(0.15),
    limit: 5,
  });

  console.log(`Qdrant found ${results.length} results`);
  results.forEach(r => console.log(`  - ${r.metadata.title}: ${r.score.toFixed(3)}`));

  await adapter.close();
}

// Example 3: Weaviate Adapter
async function example3_weaviate() {
  console.log('\n=== Example 3: Weaviate Adapter ===\n');

  const { WeaviateAdapter } = await import('@itsrajeshthota/retrievalops-weaviate');

  const adapter = new WeaviateAdapter({
    url: 'http://localhost:8080',
    className: 'Document',
    vectorDim: 384,
    hnsw: {
      m: 16,
      efConstruction: 200,
    },
  });

  await adapter.initialize();

  // Index documents
  await adapter.indexBatch({
    documents: [
      {
        id: 'weaviate-1',
        vector: new Array(384).fill(0.1),
        metadata: { title: 'GraphQL Guide', category: 'web' },
      },
      {
        id: 'weaviate-2',
        vector: new Array(384).fill(0.2),
        metadata: { title: 'REST APIs', category: 'web' },
      },
    ],
  });

  // Dense search
  const denseResults = await adapter.denseSearch({
    query: new Array(384).fill(0.15),
    limit: 5,
  });

  console.log(`Weaviate found ${denseResults.length} dense search results`);
  denseResults.forEach(r => console.log(`  - ${r.metadata.title}: ${r.score.toFixed(3)}`));

  // Keyword search (Weaviate has native BM25)
  const keywordResults = await adapter.keywordSearch({
    query: 'GraphQL',
    limit: 5,
  });

  console.log(`Weaviate keyword search found ${keywordResults.length} results`);

  await adapter.close();
}

// Example 4: Milvus Adapter
async function example4_milvus() {
  console.log('\n=== Example 4: Milvus Adapter ===\n');

  const { MilvusAdapter } = await import('@itsrajeshthota/retrievalops-milvus');

  const adapter = new MilvusAdapter({
    host: 'localhost',
    port: 19530,
    collectionName: 'documents',
    vectorDim: 384,
    indexType: 'HNSW',
    metricType: 'COSINE',
  });

  await adapter.initialize();

  // Index documents
  await adapter.indexBatch({
    documents: [
      {
        id: 'milvus-1',
        vector: new Array(384).fill(0.1),
        metadata: { title: 'Distributed Systems', category: 'architecture' },
      },
      {
        id: 'milvus-2',
        vector: new Array(384).fill(0.2),
        metadata: { title: 'Scaling Databases', category: 'architecture' },
      },
    ],
  });

  // Search
  const results = await adapter.denseSearch({
    query: new Array(384).fill(0.15),
    limit: 5,
  });

  console.log(`Milvus found ${results.length} results`);
  results.forEach(r => console.log(`  - ${r.metadata.title}: ${r.score.toFixed(3)}`));

  await adapter.close();
}

// Example 5: Factory Pattern - Runtime Selection
async function example5_factory() {
  console.log('\n=== Example 5: Factory Pattern ===\n');

  const factory = await createDefaultFactory();

  // Get adapter type from environment or parameter
  const adapterType: AdapterType = (process.env.ADAPTER_TYPE as AdapterType) || 'postgresql';
  const config = AdapterConfigs.fromEnv(adapterType);

  console.log(`Creating adapter: ${adapterType}`);
  const adapter = await factory.create(adapterType, config);

  await adapter.initialize();

  // Index
  await adapter.index({
    id: 'factory-example',
    vector: new Array(384).fill(0.5),
    metadata: { title: 'Factory Pattern Example', category: 'design' },
  });

  // Search
  const results = await adapter.denseSearch({
    query: new Array(384).fill(0.5),
    limit: 10,
  });

  console.log(`Found ${results.length} results using ${adapterType}`);

  await adapter.close();
}

// Example 6: Multi-Adapter Comparison
async function example6_comparison() {
  console.log('\n=== Example 6: Multi-Adapter Comparison ===\n');

  const factory = await createDefaultFactory();
  const adapters: Array<{ name: AdapterType; latency: number }> = [];

  const testVector = new Array(384).fill(0.5);
  const testDoc = {
    id: 'comparison-test',
    vector: testVector,
    metadata: { title: 'Test Document', category: 'testing' },
  };

  for (const adapterType of ['postgresql', 'qdrant', 'weaviate', 'milvus'] as AdapterType[]) {
    if (!factory.hasAdapter(adapterType)) continue;

    try {
      console.log(`\nTesting ${adapterType}...`);
      const config = AdapterConfigs.fromEnv(adapterType);
      const adapter = await factory.create(adapterType, config);

      await adapter.initialize();

      // Index
      await adapter.index(testDoc);

      // Search with timing
      const start = Date.now();
      const results = await adapter.denseSearch({ query: testVector, limit: 5 });
      const latency = Date.now() - start;

      adapters.push({ name: adapterType, latency });
      console.log(`✓ ${adapterType}: ${latency}ms, found ${results.length} results`);

      await adapter.close();
    } catch (error) {
      console.log(`✗ ${adapterType}: Not available (${error instanceof Error ? error.message : 'unknown'})`);
    }
  }

  // Compare
  console.log('\n=== Comparison Results ===');
  adapters.sort((a, b) => a.latency - b.latency);
  adapters.forEach((a, i) => {
    console.log(`${i + 1}. ${a.name.padEnd(12)} ${a.latency}ms`);
  });
}

// Example 7: Environment-Based Configuration
async function example7_env_config() {
  console.log('\n=== Example 7: Environment-Based Config ===\n');

  // Set environment variables
  process.env.ADAPTER_TYPE = 'postgresql';
  process.env.DATABASE_URL = 'postgresql://localhost/retrievalops';
  process.env.VECTOR_SIZE = '384';

  const factory = await createDefaultFactory();

  // Create adapter from environment
  const adapter = await factory.createFromEnv();

  console.log(`✓ Adapter created from environment: ${adapter.getBackendType()}`);

  await adapter.initialize();
  const health = await adapter.health();

  console.log(`Health: ${health.status} (latency: ${health.latency}ms)`);

  await adapter.close();
}

// Example 8: Adapter Statistics & Monitoring
async function example8_monitoring() {
  console.log('\n=== Example 8: Monitoring & Statistics ===\n');

  const factory = await createDefaultFactory();
  const adapterType: AdapterType = 'qdrant';

  const adapter = await factory.create(adapterType, AdapterConfigs.fromEnv(adapterType));

  await adapter.initialize();

  // Get statistics
  const stats = await adapter.getStats();

  console.log(`Backend: ${stats.backend}`);
  console.log(`Version: ${stats.version}`);
  console.log(`Total Documents: ${stats.totalDocuments}`);
  console.log(`Index Size: ${stats.indexSize} bytes`);
  console.log(`Health: ${stats.health}`);

  // Health monitoring
  const health = await adapter.health();

  console.log(`\nHealth Status: ${health.status}`);
  console.log(`Latency: ${health.latency}ms`);
  console.log(`Timestamp: ${health.timestamp}`);

  await adapter.close();
}

// Main execution
async function main() {
  console.log('RetrievalOps v0.2.1 Multi-Adapter Examples');
  console.log('==========================================');

  const examples = [
    {
      name: 'PostgreSQL',
      fn: example1_postgresql,
    },
    {
      name: 'Qdrant',
      fn: example2_qdrant,
    },
    {
      name: 'Weaviate',
      fn: example3_weaviate,
    },
    {
      name: 'Milvus',
      fn: example4_milvus,
    },
    {
      name: 'Factory Pattern',
      fn: example5_factory,
    },
    {
      name: 'Comparison',
      fn: example6_comparison,
    },
    {
      name: 'Environment Config',
      fn: example7_env_config,
    },
    {
      name: 'Monitoring',
      fn: example8_monitoring,
    },
  ];

  // Run selected example or all
  const exampleName = process.argv[2];

  if (exampleName) {
    const example = examples.find(e => e.name.toLowerCase() === exampleName.toLowerCase());
    if (example) {
      try {
        await example.fn();
      } catch (error) {
        console.error(`Error in ${example.name}:`, error instanceof Error ? error.message : error);
      }
    } else {
      console.log(`Example not found: ${exampleName}`);
      console.log(`Available examples: ${examples.map(e => e.name).join(', ')}`);
    }
  } else {
    console.log(`\nUsage: npx ts-node v0.2.1-examples.ts <example>`);
    console.log(`Available examples:`);
    examples.forEach((e, i) => console.log(`  ${i + 1}. ${e.name}`));
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export {
  example1_postgresql,
  example2_qdrant,
  example3_weaviate,
  example4_milvus,
  example5_factory,
  example6_comparison,
  example7_env_config,
  example8_monitoring,
};
