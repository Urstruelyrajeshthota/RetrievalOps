import { DecisionAdapter } from '@itsrajeshthota/retrievalops-decision';

export class JevDecisionAdapter extends DecisionAdapter {
  constructor(config?: { model?: string; defaultStrategy?: string; confidenceFloor?: number }) {
    super({
      model: config?.model ?? 'jev',
      defaultStrategy: config?.defaultStrategy ?? 'hybrid',
      confidenceFloor: config?.confidenceFloor ?? 0.8,
    });
  }
}

export type { DecisionAdapterConfig } from '@itsrajeshthota/retrievalops-decision';
