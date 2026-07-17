/**
 * TrendAnalyzer
 * Applies analytical scoring to raw trend data.
 * Calculates velocity, confidence, lifespan, and category-level summaries.
 */

import TrendRepository from '../../repositories/TrendRepository.js';
import logger from '../../utils/logger.js';

const MS_PER_DAY = 86_400_000;

class TrendAnalyzer {
  /**
   * Calculate trend velocity: how quickly a trend is gaining volume.
   *
   * @param {number} currentVolume
   * @param {number} previousVolume
   * @param {number} intervalDays
   * @returns {number}  velocity score 0-100
   */
  calcVelocity(currentVolume, previousVolume, intervalDays = 7) {
    if (previousVolume === 0 || intervalDays === 0) {
      return currentVolume > 0 ? 100 : 0;
    }
    const rawRate = ((currentVolume - previousVolume) / previousVolume) * 100;
    const dailyRate = rawRate / intervalDays;
    return Math.min(100, Math.max(0, Math.round(dailyRate)));
  }

  /**
   * Calculate a composite trend score (0-100) from raw signals.
   *
   * @param {{ volume: number, growthRate: number, velocity: number, recencyDays: number }} signals
   * @returns {number}
   */
  calcTrendScore({ volume = 0, growthRate = 0, velocity = 0, recencyDays = 0 }) {
    // Normalise each signal to 0-1
    const volumeScore = Math.min(1, volume / 1_000_000);          // caps at 1M volume
    const growthScore = Math.min(1, Math.max(0, growthRate / 100)); // 100% growth = 1.0
    const velocityScore = velocity / 100;
    const recencyScore = Math.max(0, 1 - recencyDays / 30);       // 30+ day old trends score 0

    const composite =
      volumeScore * 0.30 +
      growthScore * 0.30 +
      velocityScore * 0.25 +
      recencyScore * 0.15;

    return Math.round(composite * 100);
  }

  /**
   * Estimate trend confidence based on data completeness and consistency.
   *
   * @param {{ volume: number, growthRate: number, relatedTags: string[] }} trend
   * @returns {number}  0-100
   */
  calcConfidence({ volume = 0, growthRate = 0, relatedTags = [] }) {
    let score = 0;
    if (volume > 0) score += 30;
    if (volume > 10_000) score += 20;
    if (Math.abs(growthRate) > 0) score += 20;
    if (relatedTags.length > 0) score += 15;
    if (relatedTags.length > 3) score += 15;
    return Math.min(100, score);
  }

  /**
   * Estimate trend lifespan in days based on category and velocity.
   *
   * @param {string} category
   * @param {number} growthRate
   * @returns {number}  estimated lifespan in days
   */
  estimateLifespan(category, growthRate = 0) {
    const BASE_LIFESPANS = {
      hashtag: 7,
      topic: 30,
      audio: 14,
      format: 90,
      keyword: 60,
      challenge: 21,
      other: 14,
    };

    const base = BASE_LIFESPANS[category] || 14;
    // Faster-growing trends die sooner (hype cycle)
    const modifier = growthRate > 50 ? 0.5 : growthRate > 20 ? 0.75 : 1.0;
    return Math.round(base * modifier);
  }

  /**
   * Classify a trend into a content strategy category.
   *
   * @param {{ category: string, trendScore: number, growthRate: number }} trend
   * @returns {string}  'evergreen' | 'viral' | 'seasonal' | 'emerging' | 'fading'
   */
  classifyTrend({ category, trendScore = 0, growthRate = 0 }) {
    if (category === 'format' || category === 'keyword') return 'evergreen';
    if (growthRate > 50 && trendScore > 70) return 'viral';
    if (growthRate > 10 && trendScore > 40) return 'emerging';
    if (growthRate < -10) return 'fading';
    return 'seasonal';
  }

  /**
   * Enrich stored trend documents with computed analytics fields.
   * This is called after collection to refresh scores.
   *
   * @param {string} [platform='all']
   * @returns {Promise<{processed: number}>}
   */
  async enrichTrends(platform = 'all') {
    logger.info('TrendAnalyzer: enriching trends', { platform });

    const filter = platform !== 'all' ? { platform } : {};
    const trends = await TrendRepository.findTrends({
      ...filter,
      minScore: 0,
      limit: 500,
      status: null, // include all statuses
    });

    let processed = 0;

    for (const trend of trends) {
      try {
        const recencyDays = Math.round(
          (Date.now() - new Date(trend.detectedAt).getTime()) / MS_PER_DAY
        );
        const velocity = this.calcVelocity(trend.volume, trend.volume * 0.85); // estimated
        const enrichedScore = this.calcTrendScore({
          volume: trend.volume,
          growthRate: trend.growthRate,
          velocity,
          recencyDays,
        });
        const confidence = this.calcConfidence(trend);
        const lifespanDays = this.estimateLifespan(trend.category, trend.growthRate);
        const strategyClass = this.classifyTrend(trend);

        await TrendRepository.upsert({
          ...trend,
          trendScore: enrichedScore,
          expiresAt: new Date(
            new Date(trend.detectedAt).getTime() + lifespanDays * MS_PER_DAY
          ),
          description:
            trend.description ||
            `${strategyClass} ${trend.category} trend (confidence: ${confidence}%)`,
        });

        processed++;
      } catch (err) {
        logger.warn('TrendAnalyzer: failed to enrich trend', {
          name: trend.name,
          error: err.message,
        });
      }
    }

    logger.info('TrendAnalyzer: enrichment complete', { processed });
    return { processed };
  }

  /**
   * Generate a summary of the current trend landscape.
   *
   * @param {Array} trends
   * @returns {object}
   */
  summariseTrendLandscape(trends = []) {
    const byCategory = {};
    const byStatus = {};
    let avgScore = 0;

    for (const t of trends) {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      avgScore += t.trendScore || 0;
    }

    return {
      total: trends.length,
      avgScore: trends.length > 0 ? Math.round(avgScore / trends.length) : 0,
      byCategory,
      byStatus,
      topTrend: trends[0] || null,
    };
  }
}

export default new TrendAnalyzer();
