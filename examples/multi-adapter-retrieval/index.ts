/**
 * Multi-Adapter Retrieval Example
 *
 * Demonstrates using RetrievalOps with multiple database backends.
 * Easily switch between PostgreSQL and Qdrant at runtime.
 */

import { RetrievalOps, defineEntity } from '@itsrajeshthota/retrievalops-core';
import { LocalEmbeddingProvider } from '@itsrajeshthota/retrievalops-local';
import { PgVectorAdapter } from '@itsrajeshthota/retrievalops-pgvector';
import { QdrantAdapter } from '@itsrajeshthota/retrievalops-qdrant';
import {
  SearchAdapterFactory,
  AdapterConfigs,
  getAdapterTypeFromEnv,
} from '@itsrajeshthota/retrievalops-contracts';

/**
 * Example entity: Document search
 */
const documentEntity = defineEntity({
  name: 'document',
  id: 'docId',
  fields: {
    title: {
      retrieval: ['semantic', 'keyword'],
      weight: 1.2,
    },
    content: {
      retrieval: ['semantic'],
      weight: 1.0,
    },
    tags: {
      retrieval: ['keyword', 'exact'],
      weight: 0.8,
    },
  },
});

/**
 * Sample documents for indexing
 */
const sampleDocuments = [
  {
    docId: 'doc-1',
    title: 'Getting Started with RetrievalOps',
    content: 'RetrievalOps is a retrieval orchestration SDK for building AI applications.',
    tags: 'tutorial,beginner',
  },
  {
    docId: 'doc-2',
    title: 'Multi-Database Support in v0.2.0',
    content: 'RetrievalOps now supports multiple database backends: PostgreSQL and Qdrant.',
    tags: 'feature,release',
  },
  {
    docId: 'doc-3',
    title: 'Hybrid Search with RRF',
    content:
      'Reciprocal Rank Fusion combines dense and keyword search for better results.',
    tags: 'advanced,performance',
  },
  {
    docId: 'doc-4',
    title: 'Deploying to Production',
    content:
      'Guide to deploying RetrievalOps with PostgreSQL or Qdrant in production environments.',
    tags: 'devops,production',
  },
];

/**
 * Example 1: Using PostgreSQL adapter
 */
async function examplePostgreSQL() {
  console.log('\n📚 Example 1: PostgreSQL Adapter');
  console.log('================================\n');

  const adapter = new PgVectorAdapter({
    connectionString: 'postgresql://postgres:password@localhost:5432/retrievalops',
    schema: 'retrieval_ops',
    autoCreateSchema: true,
  });

  const retrieval = new RetrievalOps({
    store: adapter,
    embeddings: new LocalEmbeddingProvider({
      model: 'Xenova/all-MiniLM-L6-v2',
    }),
  });

  await retrieval.initialize();

  // Index documents
  console.log('Indexing documents...');
  await retrieval.index({
    entity: documentEntity,
    documents: sampleDocuments,
  });
  console.log('✓ Indexed 4 documents\n');

  // Search
  const query = 'How do I deploy to production?';
  console.log(`Searching for: "${query}"\n`);

  const results = await retrieval.search({
    entity: documentEntity,
    query,
    topK: 3,
  });

  results.results.forEach((result, i) => {
    console.log(`${i + 1}. ${result.text}`);
    console.log(`   Score: ${result.explanation.scores.semantic?.toFixed(3)}\n`);
  });

  await adapter.close();
}

/**
 * Example 2: Using Qdrant adapter
 */
async function exampleQdrant() {
  console.log('\n🚀 Example 2: Qdrant Adapter');
  console.log('============================\n');

  const adapter = new QdrantAdapter({
    url: 'http://localhost:6333',
    collectionName: 'documents',
    autoCreateCollection: true,
  });

  const retrieval = new RetrievalOps({
    store: adapter,
    embeddings: new LocalEmbeddingProvider({
      model: 'Xenova/all-MiniLM-L6-v2',
    }),
  });

  await retrieval.initialize();

  // Index documents
  console.log('Indexing documents...');
  await retrieval.index({
    entity: documentEntity,
    documents: sampleDocuments,
  });
  console.log('✓ Indexed 4 documents\n');

  // Search
  const query = 'What are the new features?';
  console.log(`Searching for: "${query}"\n`);

  const results = await retrieval.search({
    entity: documentEntity,
    query,
    topK: 3,
  });

  results.results.forEach((result, i) => {
    console.log(`${i + 1}. ${result.text}`);
    console.log(`   Score: ${result.explanation.scores.semantic?.toFixed(3)}\n`);
  });

  await adapter.close();
}

/**
 * Example 3: Using factory for dynamic adapter selection
 */
async function exampleFactory() {
  console.log('\n🏭 Example 3: Using SearchAdapterFactory');
  console.log('========================================\n');

  const factory = new SearchAdapterFactory();

  // Register adapters
  factory.register('postgresql', async (config) => new PgVectorAdapter(config));
  factory.register('qdrant', async (config) => new QdrantAdapter(config));

  // Select adapter type (from env or parameter)
  const adapterType = process.env.ADAPTER_TYPE || 'postgresql';
  console.log(`Creating ${adapterType} adapter...\n`);

  const config = AdapterConfigs.fromEnv(adapterType as 'postgresql' | 'qdrant');
  const adapter = await factory.create(adapterType, config);

  console.log(`✓ ${adapter.getBackendType()} adapter v${adapter.getVersion()} ready\n`);

  const retrieval = new RetrievalOps({
    store: adapter,
    embeddings: new LocalEmbeddingProvider({
      model: 'Xenova/all-MiniLM-L6-v2',
    }),
  });

  await retrieval.initialize();

  // Index documents
  console.log('Indexing documents...');
  await retrieval.index({
    entity: documentEntity,
    documents: sampleDocuments,
  });
  console.log('✓ Indexed 4 documents\n');

  // Search
  const query = 'Tell me about retrieval orchestration';
  console.log(`Searching for: "${query}"\n`);

  const results = await retrieval.search({
    entity: documentEntity,
    query,
    topK: 3,
  });

  results.results.forEach((result, i) => {
    console.log(`${i + 1}. ${result.text}`);
    console.log(`   Score: ${result.explanation.scores.semantic?.toFixed(3)}\n`);
  });

  await adapter.close();
}

/**
 * Example 4: Switching adapters without code changes
 */
async function exampleAdapterSwitch() {
  console.log('\n🔄 Example 4: Switching Adapters at Runtime');
  console.log('============================================\n');

  const factory = new SearchAdapterFactory();
  factory.register('postgresql', async (config) => new PgVectorAdapter(config));
  factory.register('qdrant', async (config) => new QdrantAdapter(config));

  // Simulate different environments
  const environments = [
    {
      name: 'Development',
      type: 'postgresql',
      config: AdapterConfigs.postgresFromEnv(),
    },
    {
      name: 'Production',
      type: 'qdrant',
      config: AdapterConfigs.qdrantFromEnv(),
    },
  ];

  for (const env of environments) {
    console.log(`🔧 Environment: ${env.name}`);
    console.log(`   Backend: ${env.type}`);

    try {
      const adapter = await factory.create(env.type, env.config);

      // Just check health without full indexing
      const health = await adapter.health();
      console.log(`   Health: ${health.status}`);
      console.log(`   Latency: ${health.latencyMs}ms`);
      console.log(`   Vectors: ${health.vectorCount}\n`);

      await adapter.close();
    } catch (error) {
      console.log(`   ⚠️  ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }
  }
}

/**
 * Run examples
 */
async function runExamples() {
  const example = process.argv[2] || 'factory';

  try {
    switch (example) {
      case 'postgres':
        await examplePostgreSQL();
        break;
      case 'qdrant':
        await exampleQdrant();
        break;
      case 'factory':
        await exampleFactory();
        break;
      case 'switch':
        await exampleAdapterSwitch();
        break;
      case 'all':
        await examplePostgreSQL();
        await exampleQdrant();
        await exampleFactory();
        await exampleAdapterSwitch();
        break;
      default:
        console.log('Usage: npx ts-node index.ts [postgres|qdrant|factory|switch|all]');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run examples
runExamples();
