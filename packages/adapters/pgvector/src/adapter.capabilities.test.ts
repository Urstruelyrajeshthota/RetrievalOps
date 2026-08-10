/**
 * PostgreSQL Adapter - Capability Detection Tests
 *
 * Verifies that getCapabilities() returns accurate feature declarations
 */

import { PgVectorAdapter } from './adapter';
import type { AdapterCapabilities } from '@retrievalops/contracts';

describe('PgVectorAdapter - getCapabilities()', () => {
  let adapter: PgVectorAdapter;

  beforeEach(() => {
    adapter = new PgVectorAdapter({
      connectionString: 'postgresql://localhost/test',
      schema: 'test_schema',
      tableName: 'test_vectors',
      autoCreateSchema: false,
    });
  });

  it('should declare dense vector search capability', async () => {
    const caps = await adapter.getCapabilities();
    expect(caps.dense).toBe(true);
  });

  it('should declare keyword/full-text search capability', async () => {
    const caps = await adapter.getCapabilities();
    expect(caps.keyword).toBe(true);
  });

  it('should declare hybrid search capability (composable)', async () => {
    const caps = await adapter.getCapabilities();
    expect(caps.hybrid).toBe(true);
  });

  it('should declare native explain capability', async () => {
    const caps = await adapter.getCapabilities();
    expect(caps.nativeExplain).toBe(true);
  });

  it('should declare multi-tenancy support', async () => {
    const caps = await adapter.getCapabilities();
    expect(caps.multiTenant).toBe(true);
  });

  it('should declare ACID transaction support', async () => {
    const caps = await adapter.getCapabilities();
    expect(caps.transactions).toBe(true);
  });

  it('should declare filtering support', async () => {
    const caps = await adapter.getCapabilities();
    expect(caps.filtering).toBe(true);
  });

  it('should declare partitioning support', async () => {
    const caps = await adapter.getCapabilities();
    expect(caps.partitioning).toBe(true);
  });

  it('should declare no native clustering (single-node)', async () => {
    const caps = await adapter.getCapabilities();
    expect(caps.clustering).toBe(false);
  });

  it('should return complete capabilities object', async () => {
    const caps = await adapter.getCapabilities();

    const expectedKeys: (keyof AdapterCapabilities)[] = [
      'dense',
      'keyword',
      'hybrid',
      'nativeExplain',
      'multiTenant',
      'transactions',
      'filtering',
      'partitioning',
      'clustering',
    ];

    expectedKeys.forEach(key => {
      expect(caps).toHaveProperty(key);
      expect(typeof caps[key]).toBe('boolean');
    });
  });

  it('should return consistent capabilities on multiple calls', async () => {
    const caps1 = await adapter.getCapabilities();
    const caps2 = await adapter.getCapabilities();

    expect(caps1).toEqual(caps2);
  });
});
