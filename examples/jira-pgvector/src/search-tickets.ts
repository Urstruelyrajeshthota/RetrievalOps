/**
 * Jira Ticket Search Example
 *
 * Demonstrates end-to-end retrieval with hybrid search and explanations.
 */

import { RetrievalOps } from '@retrievalops/core';
import { PgVectorAdapter } from '@retrievalops/pgvector';
import { LocalEmbeddingProvider } from '@retrievalops/local';
import { jiraTicket, JiraTicketDocument } from './entity';

/**
 * Search queries to demonstrate different retrieval scenarios
 */
const SEARCH_QUERIES = [
  {
    query: 'database connection timeout',
    description: 'Finding root cause: database connectivity issue',
  },
  {
    query: 'payment processing timeout',
    description: 'Finding high-load performance issues',
  },
  {
    query: 'null pointer exception refund',
    description: 'Finding null reference bugs',
  },
  {
    query: 'duplicate charges billing',
    description: 'Finding duplicate transaction issues',
  },
  {
    query: 'rate limiting API 429',
    description: 'Finding rate limit errors',
  },
];

/**
 * Format search results for display
 */
function formatResults(
  results: any[],
  query: string,
  elapsedMs: number
): string {
  if (results.length === 0) {
    return `  No results found for: "${query}" (${elapsedMs}ms)`;
  }

  const lines = [
    `  Results for: "${query}" (${elapsedMs}ms)`,
    `  ────────────────────────────────────────`,
  ];

  results.slice(0, 5).forEach((result, idx) => {
    lines.push(`  ${idx + 1}. ${result.id}`);
    lines.push(`     Score: ${result.score.toFixed(3)}`);
    lines.push(`     Summary: ${result.summary}`);

    if (result.explanation) {
      if (result.explanation.matchedFields?.length > 0) {
        const fields = result.explanation.matchedFields
          .slice(0, 2)
          .map((f: any) => `${f.field}`)
          .join(', ');
        lines.push(`     Fields: ${fields}`);
      }
    }

    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Run search demonstrations
 */
export async function searchTickets(): Promise<void> {
  console.log('🚀 RetrievalOps Jira Example - Search Tickets\n');

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

  console.log('🔍 Searching indexed tickets...\n');

  let totalQueries = 0;
  let totalResults = 0;
  const timings: number[] = [];

  for (const { query, description } of SEARCH_QUERIES) {
    console.log(`📌 ${description}`);

    const startTime = performance.now();

    try {
      const result = await retrieval.search({
        entity: jiraTicket,
        query,
        topK: 5,
        strategy: 'hybrid',
      });

      const elapsedMs = Math.round(performance.now() - startTime);
      timings.push(elapsedMs);

      if (result.success && result.results.length > 0) {
        console.log(formatResults(result.results, query, elapsedMs));
        totalResults += result.results.length;

        if (result.telemetry) {
          console.log(`  Telemetry:`);
          console.log(
            `    Strategy: ${result.telemetry.strategy || 'hybrid'}`
          );
          console.log(
            `    Dense candidates: ${result.telemetry.denseResultCount || 0}`
          );
          console.log(
            `    Keyword candidates: ${result.telemetry.keywordResultCount || 0}`
          );
          console.log('');
        }
      } else {
        console.log(formatResults([], query, elapsedMs));
        console.log('');
      }
    } catch (error) {
      const elapsedMs = Math.round(performance.now() - startTime);
      console.log(`  ✗ Error: ${error instanceof Error ? error.message : String(error)}`);
      console.log('');
    }

    totalQueries++;
  }

  console.log('='.repeat(60));
  console.log('📊 Search Summary');
  console.log('='.repeat(60));
  console.log(`  Total queries:     ${totalQueries}`);
  console.log(`  Total results:     ${totalResults}`);
  if (timings.length > 0) {
    const avgTime = Math.round(timings.reduce((a, b) => a + b, 0) / timings.length);
    const minTime = Math.min(...timings);
    const maxTime = Math.max(...timings);
    console.log(`  Avg latency:       ${avgTime}ms`);
    console.log(`  Min latency:       ${minTime}ms`);
    console.log(`  Max latency:       ${maxTime}ms`);
  }
  console.log(`  Strategy:          Hybrid (Dense + Keyword RRF)`);
  console.log(`  Embedding model:   Xenova/all-MiniLM-L6-v2 (384D)`);
  console.log('='.repeat(60));
  console.log();

  if (totalResults > 0) {
    console.log('✅ Search demonstration complete!');
    console.log(
      '\nKey observations:\n' +
        '  • Hybrid search combines dense + keyword signals\n' +
        '  • Field weights influence ranking\n' +
        '  • Results include explanations (matched fields, intent)\n' +
        '  • Telemetry shows dense vs. keyword candidate counts\n'
    );
  } else {
    console.log('⚠️  No results found. Ensure tickets are indexed first.');
    console.log('Run `npm run index` to index the sample tickets.\n');
  }
}

// Run search if executed directly
if (require.main === module) {
  searchTickets().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
