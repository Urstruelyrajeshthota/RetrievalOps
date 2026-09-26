import type {
  IntentCompilationRequest,
  IntentCompiler,
  IntentProfile,
} from '@itsrajeshthota/retrievalops-contracts';

export class DefaultIntentCompiler implements IntentCompiler {
  async compile(request: IntentCompilationRequest): Promise<IntentProfile> {
    const query = (request.task ?? request.query ?? '').toLowerCase();

    const riskTerms = ['risk', 'incident', 'failure', 'root cause', 'regression', 'why'];
    const policyTerms = ['policy', 'permission', 'access', 'authorization', 'deny', 'permit'];
    const changeTerms = ['release', 'upgrade', 'deploy', 'change', 'migration'];

    let taskType: IntentProfile['taskType'] = 'unknown';
    let retrievalStrategyHint: IntentProfile['retrievalStrategyHint'] = 'hybrid';
    let requiredEvidenceTypes = ['document'];
    let riskFlags: string[] = [];

    if (riskTerms.some((term) => query.includes(term))) {
      taskType = 'risk_assessment';
      retrievalStrategyHint = 'hybrid';
      requiredEvidenceTypes = ['release_history', 'defect_log', 'sprint_metrics'];
      riskFlags = ['release_risk'];
    } else if (policyTerms.some((term) => query.includes(term))) {
      taskType = 'policy_check';
      retrievalStrategyHint = 'keyword';
      requiredEvidenceTypes = ['access_policy', 'permission_rule'];
      riskFlags = ['policy_review'];
    } else if (changeTerms.some((term) => query.includes(term))) {
      taskType = 'change_analysis';
      retrievalStrategyHint = 'hybrid';
      requiredEvidenceTypes = ['change_log', 'release_note', 'deployment_record'];
    } else if (query.includes('why') || query.includes('root cause')) {
      taskType = 'root_cause';
      retrievalStrategyHint = 'hybrid';
      requiredEvidenceTypes = ['incident_history', 'log_excerpt', 'support_ticket'];
    } else if (query.includes('what') || query.includes('who') || query.includes('when')) {
      taskType = 'fact_lookup';
      retrievalStrategyHint = 'dense';
      requiredEvidenceTypes = ['document'];
    }

    const maxCandidates = Math.min(60, Math.max(12, requiredEvidenceTypes.length * 10));
    const maxResults = Math.min(12, Math.max(3, Math.ceil(maxCandidates / 4)));

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
      confidence: 0.87,
      justification: `Intent classified as ${taskType}.`,
    };
  }
}
