import type {
  DecisionProvider,
  IntentCompiler,
  IntentCompilationRequest,
  IntentProfile,
} from '@retrievalops/contracts';
import { DefaultDecisionProvider, SimpleIntentCompiler } from './intelligence';

export interface AgentSwarmRequest {
  query: string;
  entityType?: string;
  context?: {
    tenantId?: string;
    principalId?: string;
    userMetadata?: Record<string, unknown>;
  };
}

export interface AgentSwarmExecutionResult {
  agentId: string;
  role: string;
  score: number;
  summary: string;
  metadata?: Record<string, unknown>;
}

export interface AgentSwarmDefinition {
  id: string;
  role: string;
  description: string;
  priority: number;
  execute: (request: AgentSwarmRequest) => Promise<AgentSwarmExecutionResult>;
}

export interface AgentSwarmPlan {
  strategy: 'dense' | 'keyword' | 'hybrid';
  selectedAgents: Array<{
    id: string;
    role: string;
    priority: number;
    score: number;
  }>;
  evidenceBudget: number;
  consensusScore: number;
  riskFlags: string[];
}

export interface AgentSwarmOutcome {
  success: boolean;
  strategy: 'dense' | 'keyword' | 'hybrid';
  summary: string;
  consensusScore: number;
  plan: AgentSwarmPlan;
  results: AgentSwarmExecutionResult[];
}

export class AgentSwarmForce {
  private readonly agents: AgentSwarmDefinition[];
  private readonly maxAgents: number;
  private readonly intentCompiler: IntentCompiler;
  private readonly decision: DecisionProvider;

  constructor(config: {
    agents?: AgentSwarmDefinition[];
    maxAgents?: number;
    intentCompiler?: IntentCompiler;
    decision?: DecisionProvider;
  } = {}) {
    this.agents = config.agents ?? [];
    this.maxAgents = config.maxAgents ?? 3;
    this.intentCompiler = config.intentCompiler ?? new SimpleIntentCompiler();
    this.decision = config.decision ?? new DefaultDecisionProvider();
  }

  async execute(request: AgentSwarmRequest): Promise<AgentSwarmOutcome> {
    const intent = await this.intentCompiler.compile({
      query: request.query,
      task: request.query,
      entityType: request.entityType,
      context: request.context,
    });

    const strategy = this.resolveStrategy(intent);
    const selected = this.pickAgents(intent, request.query);

    const results: AgentSwarmExecutionResult[] = [];

    for (const agent of selected) {
      try {
        const result = await agent.execute(request);
        results.push({
          ...result,
          role: agent.role,
          summary: result.summary || `${agent.role} completed review`,
        });
      } catch (error) {
        results.push({
          agentId: agent.id,
          role: agent.role,
          score: 0,
          summary: `Agent ${agent.role} failed: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }

    const consensusScore = this.computeConsensus(results);
    const summary = this.buildSummary(intent, results, strategy, consensusScore);

    return {
      success: results.length > 0,
      strategy,
      summary,
      consensusScore,
      plan: {
        strategy,
        selectedAgents: results
          .map((result) => ({
            id: result.agentId,
            role: result.role,
            priority: this.getPriority(result.agentId),
            score: result.score,
          }))
          .sort((a, b) => a.priority - b.priority),
        evidenceBudget: intent.retrievalBudget?.maxResults ?? this.maxAgents,
        consensusScore,
        riskFlags: intent.riskFlags ?? [],
      },
      results,
    };
  }

  private resolveStrategy(intent: IntentProfile): 'dense' | 'keyword' | 'hybrid' {
    const hint = intent.retrievalStrategyHint ?? 'hybrid';
    if (hint === 'dense') return 'dense';
    if (hint === 'keyword') return 'keyword';
    return 'hybrid';
  }

  private pickAgents(intent: IntentProfile, query: string): AgentSwarmDefinition[] {
    const ranked = [...this.agents].sort((a, b) => a.priority - b.priority);

    if (ranked.length === 0) {
      return [];
    }

    const normalizedQuery = query.toLowerCase();
    const candidates = ranked.filter((agent) => {
      const role = agent.role.toLowerCase();
      const intentType = intent.normalizedIntent?.toLowerCase() ?? intent.taskType?.toLowerCase() ?? 'unknown';

      if (intentType === 'risk_assessment' && /risk|incident|root cause|failure|breach/.test(normalizedQuery)) {
        return role.includes('risk') || role.includes('retriever') || role.includes('analyst');
      }

      if (intentType === 'policy_check') {
        return role.includes('policy') || role.includes('retriever') || role.includes('checker');
      }

      if (intentType === 'root_cause') {
        return role.includes('risk') || role.includes('analyst') || role.includes('retriever');
      }

      return role.includes('retriever') || role.includes('analyst') || role.includes('checker');
    });

    return (candidates.length > 0 ? candidates : ranked).slice(0, this.maxAgents);
  }

  private computeConsensus(results: AgentSwarmExecutionResult[]): number {
    if (results.length === 0) {
      return 0;
    }

    const total = results.reduce((sum, result) => sum + result.score, 0);
    return Math.min(1, total / results.length);
  }

  private buildSummary(
    intent: IntentProfile,
    results: AgentSwarmExecutionResult[],
    strategy: 'dense' | 'keyword' | 'hybrid',
    consensusScore: number
  ): string {
    const task = (intent.normalizedIntent ?? intent.taskType ?? 'unknown').replace(/_/g, ' ');
    const heads = results.map((result) => `${result.role}:${result.score.toFixed(2)}`).join(', ');
    return `${task} swarm executed with ${strategy} routing; consensus=${consensusScore.toFixed(2)}; agents=[${heads}]`;
  }

  private getPriority(agentId: string): number {
    const match = this.agents.find((agent) => agent.id === agentId);
    return match?.priority ?? Number.MAX_SAFE_INTEGER;
  }
}
