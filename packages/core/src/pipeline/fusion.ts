/**
 * Result Fusion Algorithms
 *
 * Combines results from multiple search strategies.
 */

export interface FusionConfig {
  denseWeight?: number;
  keywordWeight?: number;
  fusion?: 'rrf' | 'weighted';
  rrfK?: number;
}

export class Fusion {
  private config: Required<FusionConfig>;

  constructor(config?: FusionConfig) {
    this.config = {
      denseWeight: config?.denseWeight || 0.6,
      keywordWeight: config?.keywordWeight || 0.4,
      fusion: config?.fusion || 'rrf',
      rrfK: config?.rrfK || 60,
    };
  }

  /**
   * Reciprocal Rank Fusion (RRF)
   *
   * Combines rankings from multiple sources using harmonic mean.
   * Formula: score = 1 / (k + rank)
   *
   * @param denseResults - Results from dense search
   * @param keywordResults - Results from keyword search
   * @returns Fused results ranked by combined score
   */
  rrf(denseResults: any[], keywordResults: any[]): any[] {
    const k = this.config.rrfK;
    const combined = new Map<string, any>();

    // Process dense results
    denseResults.forEach((result, rank) => {
      const key = result.entityId;
      const rrfScore = 1 / (k + rank + 1);

      if (!combined.has(key)) {
        combined.set(key, {
          ...result,
          fusionScores: { dense: rrfScore, keyword: 0 },
          originalScores: { dense: result.score, keyword: 0 },
        });
      } else {
        const entry = combined.get(key)!;
        entry.fusionScores.dense = rrfScore;
        entry.originalScores.dense = result.score;
      }
    });

    // Process keyword results
    keywordResults.forEach((result, rank) => {
      const key = result.entityId;
      const rrfScore = 1 / (k + rank + 1);

      if (!combined.has(key)) {
        combined.set(key, {
          ...result,
          fusionScores: { dense: 0, keyword: rrfScore },
          originalScores: { dense: 0, keyword: result.score },
        });
      } else {
        const entry = combined.get(key)!;
        entry.fusionScores.keyword = rrfScore;
        entry.originalScores.keyword = result.score;
      }
    });

    // Calculate combined scores and sort
    const results = Array.from(combined.values()).map((result) => {
      const denseFusionScore = result.fusionScores.dense * this.config.denseWeight;
      const keywordFusionScore = result.fusionScores.keyword * this.config.keywordWeight;
      const combinedScore = denseFusionScore + keywordFusionScore;

      return {
        ...result,
        score: Math.min(combinedScore, 1.0), // Normalize to [0, 1]
        fusionScores: {
          ...result.fusionScores,
          combined: combinedScore,
        },
      };
    });

    // Sort by combined score
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Weighted Fusion
   *
   * Simple weighted average of scores.
   *
   * @param denseResults - Results from dense search
   * @param keywordResults - Results from keyword search
   * @returns Fused results ranked by combined score
   */
  weighted(denseResults: any[], keywordResults: any[]): any[] {
    const combined = new Map<string, any>();

    // Normalize dense scores
    const denseMax = Math.max(...denseResults.map((r) => r.score), 1);
    const denseNormalized = denseResults.map((r) => ({
      ...r,
      normalizedScore: r.score / denseMax,
    }));

    // Normalize keyword scores
    const keywordMax = Math.max(...keywordResults.map((r) => r.score), 1);
    const keywordNormalized = keywordResults.map((r) => ({
      ...r,
      normalizedScore: r.score / keywordMax,
    }));

    // Process dense results
    denseNormalized.forEach((result) => {
      const key = result.entityId;
      if (!combined.has(key)) {
        combined.set(key, {
          ...result,
          denseScore: result.normalizedScore,
          keywordScore: 0,
        });
      } else {
        combined.get(key)!.denseScore = result.normalizedScore;
      }
    });

    // Process keyword results
    keywordNormalized.forEach((result) => {
      const key = result.entityId;
      if (!combined.has(key)) {
        combined.set(key, {
          ...result,
          denseScore: 0,
          keywordScore: result.normalizedScore,
        });
      } else {
        combined.get(key)!.keywordScore = result.normalizedScore;
      }
    });

    // Calculate weighted scores
    const results = Array.from(combined.values()).map((result) => {
      const combinedScore =
        result.denseScore * this.config.denseWeight +
        result.keywordScore * this.config.keywordWeight;

      return {
        ...result,
        score: Math.min(combinedScore, 1.0), // Normalize to [0, 1]
        denseScore: result.denseScore,
        keywordScore: result.keywordScore,
      };
    });

    // Sort by combined score
    return results.sort((a, b) => b.score - a.score);
  }
}
