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
