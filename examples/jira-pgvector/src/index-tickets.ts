/**
 * Jira Ticket Indexing Example
 *
 * Demonstrates how to index Jira tickets into RetrievalOps.
 */

import { RetrievalOps } from '@retrievalops/core';
import { PgVectorAdapter } from '@retrievalops/pgvector';
import { LocalEmbeddingProvider } from '@retrievalops/local';
import { jiraTicket, SAMPLE_TICKETS, JiraTicketDocument } from './entity';

/**
 * Index all sample tickets
 */
export async function indexTickets(): Promise<void> {
  console.log('🚀 RetrievalOps Jira Example - Indexing Tickets\n');

  // Initialize RetrievalOps
  const retrieval = new RetrievalOps({
    store: new PgVectorAdapter({
      connectionString:
        process.env.DATABASE_URL ||
        'postgresql://retrievalops:dev_password@localhost:5432/retrievalops_dev',
      schema: 'retrieval_ops',
      autoCreateSchema: true,
    }),
    embeddings: new LocalEmbeddingProvider({
      model: 'Xenova/all-MiniLM-L6-v2',
    }),
  });

  // Register entity schema
  console.log('📋 Registering entity schema...');
  retrieval.registerEntity(jiraTicket);
  console.log('✓ Entity registered\n');

  // Index each ticket
  console.log('📝 Indexing tickets...\n');
  let successCount = 0;
  let totalVectors = 0;

  for (const ticket of SAMPLE_TICKETS) {
    console.log(`Indexing ${ticket.key}: ${ticket.summary}`);

    try {
      const result = await retrieval.index({
        entity: jiraTicket,
        document: ticket,
      });

      if (result.success) {
        console.log(
          `  ✓ Indexed ${result.vectorCount} vectors for ${result.indexedFields.length} fields`
        );
        successCount++;
        totalVectors += result.vectorCount;
      } else {
        console.log(`  ✗ Failed to index`);
      }
    } catch (error) {
      console.log(`  ✗ Error: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log();
  }

  console.log('='.repeat(60));
  console.log(`📊 Indexing Summary`);
  console.log('='.repeat(60));
  console.log(`  Tickets indexed: ${successCount}/${SAMPLE_TICKETS.length}`);
  console.log(`  Total vectors:   ${totalVectors}`);
  console.log(`  Embedding model: Xenova/all-MiniLM-L6-v2 (384D)`);
  console.log(`  Database:        PostgreSQL + pgvector`);
  console.log('='.repeat(60));
  console.log();

  if (successCount === SAMPLE_TICKETS.length) {
    console.log('✅ All tickets indexed successfully!');
    console.log('\nNext: Run `npm run search` to search the indexed tickets.\n');
  } else {
    console.log(`⚠️  ${SAMPLE_TICKETS.length - successCount} tickets failed to index.`);
    console.log('Check your database connection and try again.\n');
  }
}

// Run indexing if executed directly
if (require.main === module) {
  indexTickets().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
