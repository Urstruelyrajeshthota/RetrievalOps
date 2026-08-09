/**
 * Jira Ticket Entity Schema
 *
 * Defines how to embed and search Jira tickets across multiple fields
 * with different retrieval strategies and weights.
 */

import { defineEntity } from '@retrievalops/core';

/**
 * Jira ticket entity for PAY project (Payment team)
 *
 * Fields:
 * - summary: Issue title (high priority for matching)
 * - description: Detailed issue description
 * - errorMessage: Error stack trace or message
 * - rootCause: What caused the issue
 * - resolution: How it was fixed
 * - environment: Where it occurred (dev, staging, prod)
 */
export const jiraTicket = defineEntity({
  name: 'jira_ticket',
  id: 'key',

  fields: {
    // ID field
    key: {
      retrieval: ['exact'],
      weight: 1.0
    },

    // Summary: High priority for search
    summary: {
      retrieval: ['semantic', 'keyword'],
      weight: 1.2
    },

    // Description: Standard priority
    description: {
      retrieval: ['semantic', 'keyword'],
      weight: 0.9
    },

    // Error message: High priority (often contains root cause)
    errorMessage: {
      retrieval: ['semantic', 'exact'],
      weight: 1.3
    },

    // Root cause: Highest priority for understanding issues
    rootCause: {
      retrieval: ['semantic'],
      weight: 1.4
    },

    // Resolution: How it was fixed
    resolution: {
      retrieval: ['semantic'],
      weight: 1.1
    },

    // Environment: Used for filtering
    environment: {
      retrieval: ['exact'],
      weight: 0.0
    },

    // Project key: Used for filtering
    projectKey: {
      retrieval: ['exact'],
      weight: 0.0
    },

    // Reporter: Not embedded
    reporter: {
      retrieval: ['exact'],
      weight: 0.0
    },
  },

  // Security configuration for multi-tenancy
  security: {
    tenantField: 'projectKey',  // Isolate by project
  },

  version: '1.0.0',
  description: 'Jira ticket entity for PAY project with multi-field retrieval',
});

/**
 * Helper to create a Jira ticket document
 */
export interface JiraTicketDocument {
  key: string;
  summary: string;
  description: string;
  errorMessage?: string;
  rootCause?: string;
  resolution?: string;
  environment: 'development' | 'staging' | 'production';
  projectKey: string;
  reporter: string;
}

/**
 * Sample Jira tickets for demonstration
 */
export const SAMPLE_TICKETS: JiraTicketDocument[] = [
  {
    key: 'PAY-142',
    summary: 'Payment deployment failed with HTTP 503',
    description: 'During our Friday deployment, the payment service went down and returned 503 errors to all checkout attempts. This caused significant revenue loss.',
    errorMessage: 'HTTP 503 Service Unavailable: Database connection timeout',
    rootCause: 'Database SSL certificate expired on the replica during deployment, causing all connection attempts to fail.',
    resolution: 'Renewed the database certificate and restarted the database pods. Verified connectivity before marking as resolved.',
    environment: 'production',
    projectKey: 'PAY',
    reporter: 'john.doe@company.com',
  },
  {
    key: 'PAY-143',
    summary: 'Checkout timeout on high traffic days',
    description: 'Customers report that checkout takes 30+ seconds to complete during high traffic periods like Black Friday.',
    errorMessage: 'RequestTimeoutException: Payment processing took longer than 30 seconds',
    rootCause: 'Payment processing service was not scaled up for holiday traffic. Connection pool exhausted.',
    resolution: 'Increased connection pool size from 50 to 200. Added auto-scaling rules for peak hours.',
    environment: 'production',
    projectKey: 'PAY',
    reporter: 'jane.smith@company.com',
  },
  {
    key: 'PAY-144',
    summary: 'NullPointerException in refund processing',
    description: 'Refund requests are failing with NullPointerException when processing refunds for orders with multiple items.',
    errorMessage: 'java.lang.NullPointerException at RefundProcessor.processRefund(RefundProcessor.java:142)',
    rootCause: 'Missing null check for order items when iterating over multi-item orders. Bug introduced in refactor.',
    resolution: 'Added null checks before accessing order items. Added unit tests for multi-item refunds.',
    environment: 'staging',
    projectKey: 'PAY',
    reporter: 'bob.johnson@company.com',
  },
  {
    key: 'PAY-145',
    summary: 'Duplicate charges appearing in billing',
    description: 'Some customers report being charged multiple times for a single transaction. Critical billing issue.',
    errorMessage: 'Duplicate transaction detected: transaction_id=xyz was processed 3 times',
    rootCause: 'Idempotency key not being passed correctly during payment retry. Retry logic was missing null check.',
    resolution: 'Fixed idempotency key generation and ensured it\'s passed to all payment API calls. Added transaction deduplication.',
    environment: 'production',
    projectKey: 'PAY',
    reporter: 'alice.brown@company.com',
  },
  {
    key: 'PAY-146',
    summary: 'Payment API rate limit exceeded',
    description: 'External payment provider is rejecting requests with 429 Too Many Requests errors during peak load.',
    errorMessage: 'HTTP 429: Rate limit exceeded. Limit: 1000 requests/minute',
    rootCause: 'No rate limiting or batching logic on our side. Requests sent as fast as they arrive.',
    resolution: 'Implemented token bucket rate limiter with 500 req/min limit. Added request batching for peak hours.',
    environment: 'production',
    projectKey: 'PAY',
    reporter: 'charlie.davis@company.com',
  },
  {
    key: 'PAY-147',
    summary: 'Webhook signature verification failing',
    description: 'Payment confirmation webhooks are being rejected because signature verification is failing.',
    errorMessage: 'InvalidSignatureException: HMAC signature verification failed for webhook',
    rootCause: 'Webhook secret key mismatch between our configuration and payment provider\'s keys.',
    resolution: 'Verified webhook keys in both systems. Regenerated keys on payment provider side and updated our config.',
    environment: 'staging',
    projectKey: 'PAY',
    reporter: 'diana.martinez@company.com',
  },
];
