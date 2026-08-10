/**
 * RetrievalOps v0.2.1: Corrected Examples
 *
 * IMPORTANT: These examples follow the actual SearchAdapter contract
 * using correct field names and required fields.
 *
 * Previous examples used wrong signatures:
 * - query/limit instead of queryVector/topK
 * - documents instead of vectors
 * - Missing required fields
 *
 * THESE examples are correct and will compile.
 */

import {
  createDefaultFactory,
  AdapterConfigs,
  type AdapterType,
  type DenseSearchRequest,
  type KeywordSearchRequest,
  type IndexRequest,
  type BatchIndexRequest,
} from '@itsrajeshthota/retrievalops-contracts';

// Example 1: PostgreSQL Adapter (CORRECT)
async function example1_postgresql() {
  console.log('\n=== Example 1: PostgreSQL Adapter (CORRECT) ===\n');

  const { PgVectorAdapter } = await import('@itsrajeshthota/retrievalops-pgvector');

  const adapter = new PgVectorAdapter({
    connectionString: 'postgresql://localhost/retrievalops',
  });

  await adapter.initialize();

  // Index documents - CORRECT: using actual IndexRequest contract
  const indexRequest: IndexRequest = {
    id: 'doc-1',
    entityType: 'document',        // REQUIRED
    entityId: 'doc-123',           // REQUIRED
    field: 'content',              // REQUIRED
    text: 'Machine learning basics', // REQUIRED
    vector: new Array(384).fill(0.1),
    contentHash: 'sha256-abc123',  // REQUIRED
    embeddingModel: 'Xenova/all-MiniLM-L6-v2', // REQUIRED
    embeddingVersion: '1.0',       // REQUIRED
    distanceMetric: 'cosine',      // REQUIRED
    dimensions: 384,               // REQUIRED
    metadata: { title: 'ML Guide', category: 'programming' },
  };

  const batchRequest: BatchIndexRequest = {
    vectors: [indexRequest, { ...indexRequest, id: 'doc-2', entityId: 'doc-124' }],
  };

  const batchResult = await adapter.indexBatch(batchRequest);
  console.log(`Indexed: ${batchResult.indexedCount}, Failed: ${batchResult.failedCount}`);

  // Dense search - CORRECT: using queryVector and topK
  const denseSearchRequest: DenseSearchRequest = {
    queryVector: new Array(384).fill(0.15), // REQUIRED
    entityType: 'document',                  // REQUIRED
    topK: 5,                                // REQUIRED
  };

  const results = await adapter.denseSearch(denseSearchRequest);
  console.log(`PostgreSQL found ${results.length} results`);

  // Keyword search - CORRECT: using correct field names
  const keywordSearchRequest: KeywordSearchRequest = {
    query: 'machine learning',  // REQUIRED
    entityType: 'document',     // REQUIRED
    topK: 5,                   // REQUIRED
  };

  const kwResults = await adapter.keywordSearch(keywordSearchRequest);
  console.log(`Keyword search found ${kwResults.length} results`);

  await adapter.close();
}

// Example 2: Qdrant Adapter (CORRECT)
async function example2_qdrant() {
  console.log('\n=== Example 2: Qdrant Adapter (CORRECT) ===\n');

  const { QdrantAdapter } = await import('@itsrajeshthota/retrievalops-qdrant');

  const adapter = new QdrantAdapter({
    url: 'http://localhost:6333',
    collectionName: 'documents',
    vectorDim: 384,
  });

  await adapter.initialize();

  // Index with correct contract
  const indexRequest: IndexRequest = {
    id: 'qdrant-1',
    entityType: 'document',
    entityId: 'doc-201',
    field: 'content',
    text: 'Deep learning fundamentals',
    vector: new Array(384).fill(0.1),
    contentHash: 'sha256-def456',
    embeddingModel: 'Xenova/all-MiniLM-L6-v2',
    embeddingVersion: '1.0',
    distanceMetric: 'cosine',
    dimensions: 384,
    metadata: { title: 'DL Guide', category: 'ai' },
  };

  const result = await adapter.index(indexRequest);
  console.log(`Indexed: ${result.success ? 'success' : 'failed'}`);

  // Dense search - CORRECT
  const searchRequest: DenseSearchRequest = {
    queryVector: new Array(384).fill(0.15),
    entityType: 'document',
    topK: 10,
  };

  const results = await adapter.denseSearch(searchRequest);
  console.log(`Qdrant found ${results.length} results`);

  // Check capabilities
  const caps = await adapter.getCapabilities();
  console.log(`Qdrant capabilities:`, { dense: caps.dense, keyword: caps.keyword, hybrid: caps.hybrid });

  await adapter.close();
}

// Example 3: Weaviate Adapter (CORRECT - NO hybrid yet)
async function example3_weaviate() {
  console.log('\n=== Example 3: Weaviate Adapter (CORRECT) ===\n');

  const { WeaviateAdapter } = await import('@itsrajeshthota/retrievalops-weaviate');

  const adapter = new WeaviateAdapter({
    url: 'http://localhost:8080',
    className: 'Document',
    vectorDim: 384,
  });

  await adapter.initialize();

  // Index
  const indexRequest: IndexRequest = {
    id: 'weaviate-1',
    entityType: 'document',
    entityId: 'doc-301',
    field: 'content',
    text: 'GraphQL query optimization',
    vector: new Array(384).fill(0.1),
    contentHash: 'sha256-ghi789',
    embeddingModel: 'Xenova/all-MiniLM-L6-v2',
    embeddingVersion: '1.0',
    distanceMetric: 'cosine',
    dimensions: 384,
    metadata: { title: 'GraphQL Guide', category: 'web' },
  };

  const result = await adapter.index(indexRequest);
  console.log(`Weaviate index: ${result.success ? 'success' : 'failed'}`);

  // Dense search
  const denseSearch: DenseSearchRequest = {
    queryVector: new Array(384).fill(0.15),
    entityType: 'document',
    topK: 5,
  };

  const denseResults = await adapter.denseSearch(denseSearch);
  console.log(`Weaviate dense search: ${denseResults.length} results`);

  // Keyword search
  const keywordSearch: KeywordSearchRequest = {
    query: 'GraphQL',
    entityType: 'document',
    topK: 5,
  };

  const kwResults = await adapter.keywordSearch(keywordSearch);
  console.log(`Weaviate keyword search: ${kwResults.length} results`);

  // NOTE: Hybrid search is NOT implemented in v0.2.1
  // It's coming in v0.2.2
  // Do NOT use: adapter.hybridSearch() - this method does not exist

  await adapter.close();
}

// Example 4: Milvus Adapter (CORRECT - EXPERIMENTAL ONLY)
async function example4_milvus() {
  console.log('\n=== Example 4: Milvus Adapter (EXPERIMENTAL - NO DATABASE INTEGRATION YET) ===\n');

  const { MilvusAdapter } = await import('@itsrajeshthota/retrievalops-milvus');

  const adapter = new MilvusAdapter({
    host: 'localhost',
    port: 19530,
    collectionName: 'documents',
    vectorDim: 384,
  });

  // WARNING: Milvus in v0.2.1 is EXPERIMENTAL
  // - No real database connection
  // - Data is NOT persisted
  // - This is an API contract only
  // - Real implementation coming in v0.2.2

  await adapter.initialize();

  const indexRequest: IndexRequest = {
    id: 'milvus-1',
    entityType: 'document',
    entityId: 'doc-401',
    field: 'content',
    text: 'Distributed vector indexing',
    vector: new Array(384).fill(0.1),
    contentHash: 'sha256-jkl012',
    embeddingModel: 'Xenova/all-MiniLM-L6-v2',
    embeddingVersion: '1.0',
    distanceMetric: 'cosine',
    dimensions: 384,
  };

  // This will NOT persist to any database in v0.2.1
  const result = await adapter.index(indexRequest);
  console.log(`Milvus index attempt: ${result.success ? 'accepted' : 'failed'} (data NOT persisted)`);

  // Check capabilities - will all be false because this is experimental
  const caps = await adapter.getCapabilities();
  console.log(`Milvus capabilities:`, caps);

  await adapter.close();
}

// Example 5: Factory Pattern (CORRECT)
async function example5_factory() {
  console.log('\n=== Example 5: Factory Pattern (CORRECT) ===\n');

  const factory = await createDefaultFactory();

  // Get adapter type and config from environment
  const adapterType: AdapterType = (process.env.ADAPTER_TYPE as AdapterType) || 'postgresql';
  const config = AdapterConfigs.fromEnv(adapterType);

  console.log(`Creating adapter: ${adapterType}`);
  const adapter = await factory.create(adapterType, config);

  await adapter.initialize();

  // Use correct contract signatures
  const indexRequest: IndexRequest = {
    id: 'factory-example',
    entityType: 'document',
    entityId: 'doc-500',
    field: 'content',
    text: 'Factory pattern example',
    vector: new Array(384).fill(0.5),
    contentHash: 'sha256-mno345',
    embeddingModel: 'Xenova/all-MiniLM-L6-v2',
    embeddingVersion: '1.0',
    distanceMetric: 'cosine',
    dimensions: 384,
  };

  await adapter.index(indexRequest);

  // Search
  const searchRequest: DenseSearchRequest = {
    queryVector: new Array(384).fill(0.5),
    entityType: 'document',
    topK: 10,
  };

  const results = await adapter.denseSearch(searchRequest);
  console.log(`Found ${results.length} results using ${adapterType}`);

  await adapter.close();
}

// Example 6: Capability Detection
async function example6_capabilities() {
  console.log('\n=== Example 6: Capability Detection (CORRECT) ===\n');

  const factory = await createDefaultFactory();

  // Create adapters and check capabilities
  const adapters = [
    { type: 'postgresql' as AdapterType, config: AdapterConfigs.postgresFromEnv() },
    { type: 'qdrant' as AdapterType, config: AdapterConfigs.qdrantFromEnv() },
    { type: 'weaviate' as AdapterType, config: AdapterConfigs.weaviateFromEnv() },
    { type: 'milvus' as AdapterType, config: AdapterConfigs.milvusFromEnv() },
  ];

  for (const { type, config } of adapters) {
    try {
      const adapter = await factory.create(type, config);
      await adapter.initialize();

      const caps = await adapter.getCapabilities();
      console.log(`${type}:`, {
        dense: caps.dense,
        keyword: caps.keyword,
        hybrid: caps.hybrid,
        transactions: caps.transactions,
        multiTenant: caps.multiTenant,
      });

      await adapter.close();
    } catch (error) {
      console.log(`${type}: Not available (${error instanceof Error ? error.message : 'unknown error'})`);
    }
  }
}

// Example 7: Error Handling with Required Fields
async function example7_validation() {
  console.log('\n=== Example 7: Validation (CORRECT) ===\n');

  const { PgVectorAdapter } = await import('@itsrajeshthota/retrievalops-pgvector');

  const adapter = new PgVectorAdapter({
    connectionString: 'postgresql://localhost/retrievalops',
  });

  await adapter.initialize();

  // This is CORRECT - all required fields provided
  const validRequest: IndexRequest = {
    id: 'valid-1',
    entityType: 'document',
    entityId: 'doc-600',
    field: 'content',
    text: 'Valid request with all required fields',
    vector: new Array(384).fill(0.1),
    contentHash: 'sha256-pqr678',
    embeddingModel: 'Xenova/all-MiniLM-L6-v2',
    embeddingVersion: '1.0',
    distanceMetric: 'cosine',
    dimensions: 384,
  };

  const result = await adapter.index(validRequest);
  console.log(`Valid request: ${result.success ? 'success' : result.error}`);

  // NOTE: TypeScript will show a compile error if you try this:
  // const invalidRequest: IndexRequest = {
  //   id: 'invalid-1',
  //   vector: [...],
  //   // Missing required fields: entityType, entityId, field, text, etc.
  // };
  // This ensures type safety at compile time.

  await adapter.close();
}

// Main execution
async function main() {
  console.log('RetrievalOps v0.2.1: CORRECTED Examples');
  console.log('==========================================');
  console.log('\nThese examples use the ACTUAL SearchAdapter contract');
  console.log('with correct field names and required fields.\n');

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
      name: 'Milvus (Experimental)',
      fn: example4_milvus,
    },
    {
      name: 'Factory Pattern',
      fn: example5_factory,
    },
    {
      name: 'Capability Detection',
      fn: example6_capabilities,
    },
    {
      name: 'Validation',
      fn: example7_validation,
    },
  ];

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
    console.log('Usage: npx ts-node v0.2.1-examples-CORRECTED.ts <example-name>');
    console.log(`\nAvailable examples:`);
    examples.forEach((e, i) => console.log(`  ${i + 1}. ${e.name}`));
  }
}

main().catch(error => {
  console.error('Fatal error:', error instanceof Error ? error.message : error);
  process.exit(1);
});

export {
  example1_postgresql,
  example2_qdrant,
  example3_weaviate,
  example4_milvus,
  example5_factory,
  example6_capabilities,
  example7_validation,
};
