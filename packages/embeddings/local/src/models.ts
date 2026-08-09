/**
 * Model Registry
 *
 * Curated list of recommended embedding models with metadata.
 */

import { EmbeddingModelInfo } from './types';

export class ModelRegistry {
  private models: Map<string, EmbeddingModelInfo> = new Map();

  constructor() {
    this.registerDefaultModels();
  }

  /**
   * Register default recommended models.
   */
  private registerDefaultModels(): void {
    // All-MiniLM-L6-v2: Fast, good quality, 384D
    this.models.set('Xenova/all-MiniLM-L6-v2', {
      name: 'Xenova/all-MiniLM-L6-v2',
      version: '2.6.0',
      dimensions: 384,
      pooling: 'mean',
      metric: 'cosine',
      description:
        'Fast, lightweight model. Good for real-time search. ~50 tokens/sec per CPU.',
      performance: {
        throughput: 50,
        memory: 150,
      },
    });

    // All-MiniLM-L6-v2 on GPU: Much faster
    this.models.set('Xenova/all-MiniLM-L6-v2-gpu', {
      name: 'Xenova/all-MiniLM-L6-v2',
      version: '2.6.0',
      dimensions: 384,
      pooling: 'mean',
      metric: 'cosine',
      description:
        'Same as all-MiniLM-L6-v2 but optimized for GPU. ~500 tokens/sec on NVIDIA GPU.',
      performance: {
        throughput: 500,
        memory: 1024,
      },
    });

    // All-mpnet-base-v2: Higher quality, 768D
    this.models.set('Xenova/all-mpnet-base-v2', {
      name: 'Xenova/all-mpnet-base-v2',
      version: '2.6.0',
      dimensions: 768,
      pooling: 'mean',
      metric: 'cosine',
      description:
        'Higher quality embeddings. Slower than MiniLM. ~10 tokens/sec per CPU.',
      performance: {
        throughput: 10,
        memory: 400,
      },
    });

    // BGE Small: Optimized for dense retrieval
    this.models.set('Xenova/bge-small-en-v1.5', {
      name: 'Xenova/bge-small-en-v1.5',
      version: '1.5.0',
      dimensions: 384,
      pooling: 'mean',
      metric: 'cosine',
      description:
        'Optimized for information retrieval tasks. Better ranking than general-purpose models.',
      performance: {
        throughput: 45,
        memory: 160,
      },
    });

    // BGE Base: Highest quality for retrieval
    this.models.set('Xenova/bge-base-en-v1.5', {
      name: 'Xenova/bge-base-en-v1.5',
      version: '1.5.0',
      dimensions: 768,
      pooling: 'mean',
      metric: 'cosine',
      description:
        'High-quality retrieval model. Better quality than MiniLM. ~8 tokens/sec per CPU.',
      performance: {
        throughput: 8,
        memory: 500,
      },
    });

    // Multilingual models
    this.models.set('Xenova/multilingual-e5-small', {
      name: 'Xenova/multilingual-e5-small',
      version: '1.0.0',
      dimensions: 384,
      pooling: 'mean',
      metric: 'cosine',
      description:
        'Multilingual support (100+ languages). Good for international applications.',
      performance: {
        throughput: 40,
        memory: 180,
      },
    });

    this.models.set('Xenova/multilingual-e5-base', {
      name: 'Xenova/multilingual-e5-base',
      version: '1.0.0',
      dimensions: 768,
      pooling: 'mean',
      metric: 'cosine',
      description:
        'Multilingual with higher quality. Slower but better for diverse languages.',
      performance: {
        throughput: 8,
        memory: 550,
      },
    });
  }

  /**
   * Get model info by name.
   */
  getModelInfo(name: string): EmbeddingModelInfo | null {
    return this.models.get(name) || null;
  }

  /**
   * Check if model is registered.
   */
  hasModel(name: string): boolean {
    return this.models.has(name);
  }

  /**
   * List all model names.
   */
  listModels(): string[] {
    return Array.from(this.models.keys());
  }

  /**
   * List all model details.
   */
  listModelDetails(): EmbeddingModelInfo[] {
    return Array.from(this.models.values());
  }

  /**
   * Register a custom model.
   */
  registerModel(info: EmbeddingModelInfo): void {
    if (this.models.has(info.name)) {
      throw new Error(`Model ${info.name} is already registered`);
    }
    this.models.set(info.name, info);
  }

  /**
   * Get models by dimension.
   */
  getModelsByDimension(dimension: number): EmbeddingModelInfo[] {
    return Array.from(this.models.values()).filter(
      (m) => m.dimensions === dimension
    );
  }

  /**
   * Get recommended model for a use case.
   */
  getRecommendedModel(useCase: 'speed' | 'quality' | 'multilingual'): string {
    switch (useCase) {
      case 'speed':
        return 'Xenova/all-MiniLM-L6-v2';
      case 'quality':
        return 'Xenova/bge-base-en-v1.5';
      case 'multilingual':
        return 'Xenova/multilingual-e5-base';
      default:
        return 'Xenova/all-MiniLM-L6-v2';
    }
  }
}
