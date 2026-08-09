// RetrievalOps Core SDK
// Main entry point for the retrieval orchestration SDK

// Main SDK class
export { RetrievalOps } from './retrieval-ops';
export type { RetrievalOpsConfig } from './retrieval-ops';

// Entity schema
export {
  defineEntity,
  validateEntity,
  getEmbeddableFields,
  getFieldWeight,
} from './entity';
export type {
  EntityDefinition,
  FieldConfig,
  EntitySecurity,
} from './entity';

// Core types
export type {
  RetrievalContext,
  IndexRequest,
  IndexResult,
  SearchRequest,
  SearchResult,
  RankedResult,
  ResultExplanation,
  MatchedField,
  RetrievalPlan,
  RetrievalTelemetry,
  RetrievalStrategy,
  DeleteRequest,
  DeleteResult,
} from './types';

// Entity registry
export { EntityRegistry, getGlobalRegistry, resetGlobalRegistry } from './registry';

// Errors
export {
  RetrievalOpsError,
  EntityValidationError,
  EntityNotFoundError,
  ModelMismatchError,
  AccessDeniedError,
  MissingFieldError,
  AdapterError,
  EmbeddingError,
  SearchError,
  IndexError,
  ConfigurationError,
} from './errors';

// Pipeline utilities
export { Fusion } from './pipeline/fusion';
export type { FusionConfig } from './pipeline/fusion';

// Re-export contracts
export type {
  SearchAdapter,
  EmbeddingProvider,
  Reranker,
  QueryPlanner,
  RetrievalPolicy,
  AdapterCapabilities,
  SearchCandidate,
  RankedCandidate,
  EmbeddingModelMetadata,
} from '@retrievalops/contracts';
