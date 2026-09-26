import { describe, it, expect } from 'vitest';
import { AgentSwarmForce } from '../src/swarm';

describe('AgentSwarmForce', () => {
  it('should route a root-cause query to specialist agents and return a consensus result', async () => {
    const swarm = new AgentSwarmForce({
      agents: [
        {
          id: 'retriever',
          role: 'retriever',
          description: 'fetches evidence',
          priority: 1,
          execute: async () => ({
            agentId: 'retriever',
            score: 0.9,
            summary: 'retrieved incident and logs',
          }),
        },
        {
          id: 'risk-analyst',
          role: 'risk_analyst',
          description: 'evaluates risk and causal indicators',
          priority: 2,
          execute: async () => ({
            agentId: 'risk-analyst',
            score: 0.96,
            summary: 'root cause aligned with release and incident history',
          }),
        },
        {
          id: 'policy-checker',
          role: 'policy_checker',
          description: 'checks policy boundaries',
          priority: 3,
          execute: async () => ({
            agentId: 'policy-checker',
            score: 0.8,
            summary: 'policy check passed',
          }),
        },
      ],
    });

    const result = await swarm.execute({
      query: 'Root cause of the payment failure on release 2.4',
      entityType: 'incident',
      context: { tenantId: 'tenant-42' },
    });

    expect(result.success).toBe(true);
    expect(result.plan.strategy).toBe('hybrid');
    expect(result.plan.selectedAgents.some((agent) => agent.role === 'risk_analyst')).toBe(true);
    expect(result.summary.toLowerCase()).toContain('root cause');
    expect(result.consensusScore).toBeGreaterThan(0.7);
  });

  it('should limit execution to the configured evidence budget', async () => {
    const swarm = new AgentSwarmForce({
      agents: [
        { id: 'a', role: 'retriever', description: 'a', priority: 1, execute: async () => ({ agentId: 'a', score: 0.7, summary: 'one' }) },
        { id: 'b', role: 'evidence_verifier', description: 'b', priority: 2, execute: async () => ({ agentId: 'b', score: 0.8, summary: 'two' }) },
        { id: 'c', role: 'risk_analyst', description: 'c', priority: 3, execute: async () => ({ agentId: 'c', score: 0.9, summary: 'three' }) },
      ],
      maxAgents: 2,
    });

    const result = await swarm.execute({
      query: 'Policy check for admin access',
      entityType: 'policy',
    });

    expect(result.plan.selectedAgents.length).toBeLessThanOrEqual(2);
    expect(result.success).toBe(true);
  });
});
