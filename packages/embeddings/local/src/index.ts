/**
 * Local Embedding Provider
 *
 * On-device embedding generation using transformers.js.
 * No API keys, no external service calls, fully privacy-respecting.
 */

export { LocalEmbeddingProvider } from './provider';
export { ModelRegistry } from './models';
export type {
  LocalEmbeddingConfig,
  EmbeddingModelInfo,
  BatchEmbeddingResult,
  ModelMetadata,
} from './types';
