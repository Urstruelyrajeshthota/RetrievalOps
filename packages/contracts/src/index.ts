// Contracts for RetrievalOps
// These interfaces define the core contracts that all adapters and providers must implement

// Adapter contracts (canonical — implemented by pgvector, qdrant, weaviate, milvus, opensearch)
export type {
  Vector,
  IndexRequest,
  IndexResult,
  DenseSearchRequest,
  KeywordSearchRequest,
  SearchCandidate,
  DeleteRequest,
  DeleteResult,
  HealthStatus,
  AdapterStats,
  BatchIndexRequest,
  BatchIndexResult,
  AdapterCapabilities,
  SearchAdapter,
  SearchAdapterFactory,
} from './search-adapter';

export { createAdapterTestSuite, validateAdapterCompliance } from './adapter-test-suite';
export type {
  AdapterTestContract,
  AdapterTestFixture,
  AdapterComplianceReport,
} from './adapter-test-suite';

export interface EmbeddingModelMetadata {
  name: string;
  /**
   * Model/provider version, stored with every vector for provenance and
   * used to detect stale embeddings when the model changes.
   */
  version: string;
  dimensions: number;
  pooling?: 'mean' | 'cls';
  metric?: 'cosine' | 'l2' | 'ip';
  costPerMillionTokens?: number;
}

export type IntentTaskType =
  | 'fact_lookup'
  | 'root_cause'
  | 'risk_assessment'
  | 'policy_check'
  | 'change_analysis'
  | 'unknown';

export interface DecisionContext {
  query?: string;
  task?: string;
  entityType?: string;
  tenantId?: string;
  principalId?: string;
  userMetadata?: Record<string, unknown>;
  retrievedDocuments?: Array<Record<string, unknown>>;
  constraints?: Record<string, unknown>;
}

export interface DecisionOption {
  value: string;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface ChoiceResult {
  selected: string;
  selectedStrategy?: string;
  confidence: number;
  reason?: string;
  rationale?: string;
  evidenceBudget?: {
    maxDocuments: number;
    maxTokens: number;
  };
  modelVersion?: string;
  requiresReview?: boolean;
  metadata?: Record<string, unknown>;
}

export interface RetrievalDecision extends ChoiceResult {
  selected: string;
  selectedStrategy?: string;
  confidence: number;
  rationale?: string;
  evidenceBudget?: {
    maxDocuments: number;
    maxTokens: number;
  };
  modelVersion?: string;
  requiresReview?: boolean;
}

export interface ScoreResult {
  score: number;
  confidence: number;
  breakdown?: Record<string, number>;
  reason?: string;
}

export interface DecisionProvider {
  choose(
    state: DecisionContext,
    options: DecisionOption[] | string[]
  ): Promise<RetrievalDecision>;
  score(state: DecisionContext, rubric: string[]): Promise<ScoreResult>;
  evaluate(state: DecisionContext, question: string): Promise<number>;
}

export interface IntentCompilationRequest {
  query: string;
  task?: string;
  entityType?: string;
  context?: {
    tenantId?: string;
    principalId?: string;
    userMetadata?: Record<string, unknown>;
    previousActions?: string[];
  };
}

export interface IntentProfile {
  normalizedIntent: string;
  taskType: IntentTaskType;
  requiredEvidenceTypes: string[];
  retrievalStrategyHint: 'dense' | 'keyword' | 'hybrid' | 'multi_index' | 'none';
  retrievalBudget: {
    maxCandidates: number;
    maxResults: number;
    maxDepth?: number;
  };
  riskFlags: string[];
  confidence: number;
  deniesAccess?: boolean;
  justification?: string;
}

export interface IntentCompiler {
  compile(request: IntentCompilationRequest): Promise<IntentProfile>;
}

export interface EmbeddingProvider {
  metadata(): EmbeddingModelMetadata;
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

import type { SearchCandidate } from './search-adapter';

export interface Reranker {
  rerank(
    query: string,
    candidates: SearchCandidate[]
  ): Promise<RankedCandidate[]>;
}

export interface RankedCandidate extends SearchCandidate {
  rerankScore?: number;
}

export interface QueryPlanner {
  plan(request: PlanningRequest): Promise<RetrievalPlan>;
}

export interface PlanningRequest {
  query: string;
  entityType: string;
  context?: Record<string, unknown>;
}

export interface RetrievalPlan {
  strategy: string;
  steps: RetrievalStep[];
}

export interface RetrievalStep {
  type: 'dense' | 'keyword' | 'exact' | 'filter';
  config: Record<string, unknown>;
}

export interface RetrievalPolicy {
  authorize(request: AuthorizationRequest): Promise<PolicyDecision>;
  filter(
    candidates: SearchCandidate[],
    context: RetrievalContext
  ): Promise<SearchCandidate[]>;
}

export interface AuthorizationRequest {
  entityType: string;
  tenantId?: string;
  principalId?: string;
  action: string;
}

export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
}

export interface RetrievalContext {
  tenantId?: string;
  principalId?: string;
  userMetadata?: Record<string, unknown>;
}
