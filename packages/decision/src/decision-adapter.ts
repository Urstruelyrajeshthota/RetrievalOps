import type {
  ChoiceResult,
  DecisionContext,
  DecisionOption,
  DecisionProvider,
  ScoreResult,
} from '@itsrajeshthota/retrievalops-contracts';

export interface DecisionAdapterConfig {
  model?: string;
  defaultStrategy?: string;
  confidenceFloor?: number;
}

export class DecisionAdapter implements DecisionProvider {
  constructor(private readonly config: DecisionAdapterConfig = {}) {}

  async choose(
    state: DecisionContext,
    options: DecisionOption[] | string[]
  ): Promise<ChoiceResult> {
    const normalized = Array.isArray(options)
      ? options.map((option) =>
          typeof option === 'string' ? { value: option, label: option } : option
        )
      : [];

    const queryText = (state.query ?? '').toLowerCase();
    const matchScore = /(risk|root cause|incident|failure|regression|why)/i.test(queryText)
      ? 0.92
      : 0.72;

    const selected =
      normalized.find((option) => option.value === state.task)?.value ??
      normalized.find((option) => option.value === 'hybrid')?.value ??
      normalized[0]?.value ??
      this.config.defaultStrategy ??
      'hybrid';

    return {
      selected,
      confidence: Math.max(this.config.confidenceFloor ?? 0.7, matchScore),
      reason: `Decision adapter selected ${selected} using task intent and evidence needs.`,
      metadata: {
        model: this.config.model ?? 'retrievalops-decision',
        entityType: state.entityType,
      },
    };
  }

  async score(state: DecisionContext, rubric: string[]): Promise<ScoreResult> {
    const queryText = (state.query ?? '').toLowerCase();
    const alignment = /risk|incident|root cause|why|regression/i.test(queryText) ? 0.21 : 0.08;
    const coverage = Math.min(0.9, rubric.length / 6);
    const score = Math.min(0.99, 0.35 + coverage + alignment);

    return {
      score,
      confidence: 0.8,
      breakdown: {
        rubricCoverage: coverage,
        queryAlignment: alignment,
      },
      reason: 'Evidence preference was scored against task alignment and rubric coverage.',
    };
  }

  async evaluate(state: DecisionContext, question: string): Promise<number> {
    const text = (question ?? '').toLowerCase();
    const riskBoost = /risk|incident|root cause|why|regression|breach/i.test(text) ? 0.2 : 0.08;
    const evidenceCount = state.retrievedDocuments?.length ?? 0;
    const evidenceBoost = Math.min(0.35, evidenceCount * 0.08);
    return Math.min(1, 0.45 + riskBoost + evidenceBoost);
  }
}
