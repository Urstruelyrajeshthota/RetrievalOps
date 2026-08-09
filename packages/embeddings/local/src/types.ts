/**
 * Local Embedding Provider Type Definitions
 *
 * Using transformers.js for on-device embedding generation.
 */

export interface LocalEmbeddingConfig {
  /**
   * Model identifier from Hugging Face.
   *
   * Recommended models:
   * - "Xenova/all-MiniLM-L6-v2" (384D, fast, good quality)
   * - "Xenova/all-mpnet-base-v2" (768D, slower, higher quality)
   * - "Xenova/bge-small-en-v1.5" (384D, optimized for search)
   *
   * Default: "Xenova/all-MiniLM-L6-v2"
   */
  model?: string;

  /**
   * Pooling strategy.
   * - "mean": Average of all token embeddings (default)
   * - "cls": Use [CLS] token embedding
   */
  pooling?: 'mean' | 'cls';

  /**
   * Cache directory for downloaded models.
   * Default: Node.js os.tmpdir()
   */
  cacheDir?: string;

  /**
   * Download progress callback.
   * Called as model files are downloaded.
   */
  onProgress?: (progress: {
    status: 'downloading' | 'processing' | 'ready';
    name?: string;
    file?: string;
    progress?: number;
  }) => void;

  /**
   * Auto-download models on first use (default: true).
   */
  autoDownload?: boolean;

  /**
   * Batch size for processing multiple texts (default: 32).
   */
  batchSize?: number;

  /**
   * Maximum text length in characters (default: 512 tokens ≈ 2000 chars).
   */
  maxLength?: number;

  /**
   * Normalize embeddings to unit vectors (default: true).
   */
  normalize?: boolean;
}

export interface EmbeddingModelInfo {
  /**
   * Model name/identifier.
   */
  name: string;

  /**
   * Model version.
   */
  version: string;

  /**
   * Vector dimension size.
   */
  dimensions: number;

  /**
   * Pooling strategy used.
   */
  pooling: 'mean' | 'cls';

  /**
   * Distance metric recommended for this model.
   */
  metric: 'cosine' | 'dot' | 'euclidean';

  /**
   * Model description/notes.
   */
  description?: string;

  /**
   * Performance characteristics.
   */
  performance?: {
    /**
     * Average tokens per second.
     */
    throughput?: number;

    /**
     * Approximate memory usage in MB.
     */
    memory?: number;
  };
}

export interface BatchEmbeddingResult {
  /**
   * Successfully embedded texts.
   */
  embeddings: number[][];

  /**
   * Indices of successfully embedded texts (in original order).
   */
  successIndices: number[];

  /**
   * Failed texts and their errors.
   */
  errors?: Array<{
    index: number;
    text: string;
    error: string;
  }>;
}

export interface ModelMetadata {
  name: string;
  version: string;
  dimensions: number;
  metric: 'cosine' | 'dot' | 'euclidean';
}
