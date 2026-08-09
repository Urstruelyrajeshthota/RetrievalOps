/**
 * Local Embedding Provider
 *
 * On-device embedding generation using transformers.js.
 * No API keys required, no external service calls.
 */

import type { EmbeddingProvider } from '@retrievalops/contracts';
import {
  LocalEmbeddingConfig,
  EmbeddingModelInfo,
  BatchEmbeddingResult,
  ModelMetadata,
} from './types';
import { ModelRegistry } from './models';

// Note: In actual implementation, this would import from '@xenova/transformers'
// For now, we'll define the interface
interface Pipeline {
  (texts: string[]): Promise<{ data: number[][] }>;
}

/**
 * Local embedding provider using transformers.js.
 *
 * Supports multiple models from Hugging Face Model Hub.
 * Runs entirely on-device with no external API calls.
 *
 * @example
 * ```ts
 * const provider = new LocalEmbeddingProvider({
 *   model: "Xenova/all-MiniLM-L6-v2",
 *   pooling: "mean"
 * });
 *
 * const queryVector = await provider.embedQuery("What is AI?");
 * const docVectors = await provider.embedDocuments([
 *   "Artificial Intelligence is...",
 *   "Machine Learning is..."
 * ]);
 * ```
 */
export class LocalEmbeddingProvider implements EmbeddingProvider {
  private config: Required<LocalEmbeddingConfig>;
  private pipeline: Pipeline | null = null;
  private modelInfo: EmbeddingModelInfo | null = null;
  private modelRegistry: ModelRegistry;
  private initialized: boolean = false;

  constructor(config?: LocalEmbeddingConfig) {
    this.config = {
      model: config?.model || 'Xenova/all-MiniLM-L6-v2',
      pooling: config?.pooling || 'mean',
      cacheDir: config?.cacheDir || this.getDefaultCacheDir(),
      autoDownload: config?.autoDownload !== false,
      batchSize: config?.batchSize || 32,
      maxLength: config?.maxLength || 512,
      normalize: config?.normalize !== false,
      onProgress: config?.onProgress,
    };

    this.modelRegistry = new ModelRegistry();
  }

  /**
   * Get model metadata.
   */
  metadata(): { name: string; version: string; dimensions: number } {
    if (!this.modelInfo) {
      throw new Error(
        'Provider not initialized. Call initialize() or embedQuery() first.'
      );
    }

    return {
      name: this.modelInfo.name,
      version: this.modelInfo.version,
      dimensions: this.modelInfo.dimensions,
    };
  }

  /**
   * Embed a single query text.
   */
  async embedQuery(text: string): Promise<number[]> {
    await this.ensureInitialized();

    if (!this.pipeline) {
      throw new Error('Embedding pipeline not loaded');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Query text cannot be empty');
    }

    try {
      const result = await this.pipeline([text]);
      let embedding = result.data[0];

      if (this.config.normalize) {
        embedding = this.normalizeVector(embedding);
      }

      return embedding;
    } catch (error) {
      throw new Error(
        `Failed to embed query: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Embed multiple document texts.
   *
   * Processes in batches for efficiency.
   */
  async embedDocuments(texts: string[]): Promise<number[][]> {
    await this.ensureInitialized();

    if (!this.pipeline) {
      throw new Error('Embedding pipeline not loaded');
    }

    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('Texts must be a non-empty array');
    }

    // Validate texts
    const validTexts = texts.map((t, i) => {
      if (!t || typeof t !== 'string') {
        throw new Error(`Text at index ${i} is not a valid string`);
      }
      return t;
    });

    try {
      const embeddings: number[][] = [];

      // Process in batches
      for (let i = 0; i < validTexts.length; i += this.config.batchSize) {
        const batch = validTexts.slice(
          i,
          Math.min(i + this.config.batchSize, validTexts.length)
        );

        const result = await this.pipeline(batch);

        for (let embedding of result.data) {
          if (this.config.normalize) {
            embedding = this.normalizeVector(embedding);
          }
          embeddings.push(embedding);
        }
      }

      return embeddings;
    } catch (error) {
      throw new Error(
        `Failed to embed documents: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Initialize the embedding pipeline.
   *
   * Downloads the model on first call if autoDownload is enabled.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.reportProgress({
        status: 'downloading',
        name: this.config.model,
      });

      // Get model info from registry
      this.modelInfo = this.modelRegistry.getModelInfo(this.config.model);

      if (!this.modelInfo) {
        throw new Error(
          `Unknown model: ${this.config.model}. ` +
          `Supported models: ${this.modelRegistry.listModels().join(', ')}`
        );
      }

      // In actual implementation, this would load the transformers.js pipeline
      // For now, we'll create a mock that shows the structure
      this.pipeline = await this.loadPipeline();

      this.reportProgress({
        status: 'ready',
        name: this.config.model,
      });

      this.initialized = true;
    } catch (error) {
      throw new Error(
        `Failed to initialize embedding provider: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * List available models.
   */
  listModels(): EmbeddingModelInfo[] {
    return this.modelRegistry.listModelDetails();
  }

  /**
   * Get information about a specific model.
   */
  getModelInfo(modelName: string): EmbeddingModelInfo | null {
    return this.modelRegistry.getModelInfo(modelName);
  }

  /**
   * Get current model metadata.
   */
  getCurrentModelMetadata(): ModelMetadata {
    if (!this.modelInfo) {
      throw new Error('Provider not initialized');
    }

    return {
      name: this.modelInfo.name,
      version: this.modelInfo.version,
      dimensions: this.modelInfo.dimensions,
      metric: this.modelInfo.metric,
    };
  }

  /**
   * Unload the model from memory.
   */
  async unload(): Promise<void> {
    this.pipeline = null;
    this.initialized = false;
  }

  /**
   * Get statistics about the provider.
   */
  getStats(): {
    initialized: boolean;
    modelLoaded: boolean;
    modelName?: string;
    dimensions?: number;
  } {
    return {
      initialized: this.initialized,
      modelLoaded: this.pipeline !== null,
      modelName: this.modelInfo?.name,
      dimensions: this.modelInfo?.dimensions,
    };
  }

  // Private methods

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private async loadPipeline(): Promise<Pipeline> {
    // This is a placeholder. In actual implementation:
    // import { pipeline } from '@xenova/transformers';
    // return await pipeline('feature-extraction', this.config.model);

    // For now, return a mock pipeline
    return async (texts: string[]) => {
      // Mock: return dummy embeddings
      return {
        data: texts.map(() => Array(this.modelInfo?.dimensions || 384).fill(0.5)),
      };
    };
  }

  private normalizeVector(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));

    if (norm === 0) {
      return vector;
    }

    return vector.map((v) => v / norm);
  }

  private getDefaultCacheDir(): string {
    // Use process.env.HF_HOME if set, otherwise use node temp dir
    if (typeof process !== 'undefined' && process.env?.HF_HOME) {
      return process.env.HF_HOME;
    }

    // Fallback to system temp directory
    if (typeof require !== 'undefined') {
      try {
        const os = require('os');
        return os.tmpdir();
      } catch {
        return '/tmp';
      }
    }

    return '/tmp';
  }

  private reportProgress(progress: {
    status: 'downloading' | 'processing' | 'ready';
    name?: string;
    file?: string;
    progress?: number;
  }): void {
    if (this.config.onProgress) {
      this.config.onProgress(progress);
    }
  }
}
