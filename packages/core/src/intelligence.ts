import type {
  ChoiceResult,
  DecisionContext,
  DecisionOption,
  DecisionProvider,
  IntentCompilationRequest,
  IntentCompiler,
  IntentProfile,
  ScoreResult,
} from '@retrievalops/contracts';

export class SimpleIntentCompiler implements IntentCompiler {
  async compile(request: IntentCompilationRequest): Promise<IntentProfile> {
    const queryText = (request.task ?? request.query ?? '').toLowerCase();
    const riskTerms = ['risk', 'why', 'failure', 'incident', 'breach', 'root cause', 'regression'];
    const policyTerms = ['policy', 'authorization', 'access', 'permission', 'deny', 'allowed'];
    const changeTerms = ['change', 'release', 'deploy', 'upgrade', 'migration'];

    let taskType: IntentProfile['taskType'] = 'unknown';
    let retrievalStrategyHint: IntentProfile['retrievalStrategyHint'] = 'hybrid';
    let requiredEvidenceTypes: string[] = ['document'];
    let riskFlags: string[] = [];

    if (queryText.includes('why') || queryText.includes('root cause')) {
      taskType = 'root_cause';
      retrievalStrategyHint = 'hybrid';
      requiredEvidenceTypes = ['incident_history', 'log_excerpt', 'support_ticket'];
      riskFlags = ['causal_analysis'];
    } else if (riskTerms.some((term) => queryText.includes(term))) {
      taskType = 'risk_assessment';
      retrievalStrategyHint = 'hybrid';
      requiredEvidenceTypes = ['release_history', 'defect_log', 'sprint_metrics'];
      riskFlags = ['release_risk'];
    } else if (policyTerms.some((term) => queryText.includes(term))) {
      taskType = 'policy_check';
      retrievalStrategyHint = 'keyword';
      requiredEvidenceTypes = ['access_policy', 'permission_rule'];
      riskFlags = ['policy_review'];
    } else if (changeTerms.some((term) => queryText.includes(term))) {
      taskType = 'change_analysis';
      retrievalStrategyHint = 'hybrid';
      requiredEvidenceTypes = ['release_note', 'deployment_log', 'change_ticket'];
    } else if (queryText.includes('what') || queryText.includes('who') || queryText.includes('when')) {
      taskType = 'fact_lookup';
      retrievalStrategyHint = 'dense';
      requiredEvidenceTypes = ['document'];
    }

    const maxCandidates = Math.min(40, Math.max(10, requiredEvidenceTypes.length * 10));
    const maxResults = Math.min(10, Math.max(3, Math.ceil(maxCandidates / 4)));

    return {
      normalizedIntent: taskType,
      taskType,
      requiredEvidenceTypes,
      retrievalStrategyHint,
      retrievalBudget: {
        maxCandidates,
        maxResults,
      },
      riskFlags,
      confidence: 0.83,
      justification: `Task classified as ${taskType} based on query intent and evidence requirements.`,
    };
  }
}

export class DefaultDecisionProvider implements DecisionProvider {
  async choose(state: DecisionContext, options: DecisionOption[] | string[]): Promise<ChoiceResult> {
    const normalizedOptions = Array.isArray(options)
      ? options.map((option) => (typeof option === 'string' ? { value: option } : option))
      : [];

    const queryText = (state.query ?? '').toLowerCase();
    const riskDriven = /(risk|why|root cause|incident|breach|failure|policy)/i.test(queryText);

    const preferred =
      normalizedOptions.find((option) => option.value === 'hybrid')?.value ??
      normalizedOptions.find((option) => option.value === 'dense')?.value ??
      normalizedOptions.find((option) => option.value === 'keyword')?.value ??
      normalizedOptions.find((option) => option.value === 'exact')?.value ??
      normalizedOptions[0]?.value ??
      'hybrid';

    const selected =
      normalizedOptions.find((option) => option.value === state.task)?.value ??
      (riskDriven ? preferred : preferred);

    const confidence = riskDriven ? 0.9 : 0.76;
    const evidenceBudget = {
      maxDocuments: riskDriven ? 12 : 8,
      maxTokens: riskDriven ? 2400 : 1800,
    };

    return {
      selected,
      selectedStrategy: selected,
      confidence,
      reason: `Selected strategy ${selected} based on task intent and evidence requirements.`,
      rationale: `Selected strategy ${selected} based on task intent and evidence requirements.`,
      evidenceBudget,
      modelVersion: 'retrievalops-default',
      requiresReview: riskDriven,
      metadata: {
        query: state.query,
        entityType: state.entityType,
      },
    };
  }

  async score(state: DecisionContext, rubric: string[]): Promise<ScoreResult> {
    const base = Math.min(0.99, Math.max(0.1, rubric.length / 6));
    const queryBoost = /(risk|why|root cause|incident|breach|failure)/i.test(state.query ?? '') ? 0.2 : 0.05;
    const score = Math.min(0.99, base + queryBoost);

    return {
      score,
      confidence: 0.82,
      breakdown: {
        rubricCoverage: base,
        queryAlignment: queryBoost,
      },
      reason: 'The evidence was scored using task alignment and rubric coverage.',
    };
  }

  async evaluate(state: DecisionContext, question: string): Promise<number> {
    const text = (question ?? '').toLowerCase();
    const riskBoost = /(risk|why|root cause|incident|breach|failure)/i.test(text) ? 0.18 : 0.0;
    const evidenceCount = state.retrievedDocuments?.length ?? 0;
    const evidenceBoost = Math.min(0.35, evidenceCount * 0.08);
    return Math.min(1, 0.42 + riskBoost + evidenceBoost);
  }
}

export class JevDecisionProvider extends DefaultDecisionProvider {
  constructor(private readonly delegate?: Partial<DecisionProvider>) {
    super();
  }

  override async choose(state: DecisionContext, options: DecisionOption[] | string[]): Promise<ChoiceResult> {
    if (this.delegate?.choose) {
      return this.delegate.choose(state, options);
    }
    return super.choose(state, options);
  }

  override async score(state: DecisionContext, rubric: string[]): Promise<ScoreResult> {
    if (this.delegate?.score) {
      return this.delegate.score(state, rubric);
    }
    return super.score(state, rubric);
  }

  override async evaluate(state: DecisionContext, question: string): Promise<number> {
    if (this.delegate?.evaluate) {
      return this.delegate.evaluate(state, question);
    }
    return super.evaluate(state, question);
  }
}
