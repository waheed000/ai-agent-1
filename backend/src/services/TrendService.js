/**
 * TrendService
 * Orchestrates trend collection, analysis, and querying.
 */

import TrendRepository from '../repositories/TrendRepository.js';
import TrendCollector from './trends/TrendCollector.js';
import TrendAnalyzer from './trends/TrendAnalyzer.js';
import CacheService from './CacheService.js';
import eventBus from '../events/eventBus.js';
import { EVENT_TYPES } from '../events/eventTypes.js';
import logger from '../utils/logger.js';

const TrendService = {
  // ─── Query endpoints ──────────────────────────────────────────────────────

  async getTrends({ platform, category, status, limit, minScore } = {}) {
    const cacheKey = `trends:${platform || 'all'}:${category || 'all'}:${status || 'rising'}:${limit || 50}:${minScore || 0}`;
    return CacheService.getOrSet('trends', cacheKey, () =>
      TrendRepository.findTrends({ platform, category, status, limit, minScore })
    );
  },

  async getTopics({ platform, limit, minScore } = {}) {
    const cacheKey = `topics:${platform || 'all'}:${limit || 20}:${minScore || 0}`;
    return CacheService.getOrSet('trends', cacheKey, () =>
      TrendRepository.findTopics({ platform, limit, minScore })
    );
  },

  async getHashtags({ platform, limit, minScore } = {}) {
    const cacheKey = `hashtags:${platform || 'all'}:${limit || 30}:${minScore || 0}`;
    return CacheService.getOrSet('trends', cacheKey, () =>
      TrendRepository.findHashtags({ platform, limit, minScore })
    );
  },

  async getCreatorTrends({ platform, limit } = {}) {
    const cacheKey = `creators:${platform || 'all'}:${limit || 20}`;
    return CacheService.getOrSet('trends', cacheKey, () =>
      TrendRepository.findCreatorTrends({ platform, limit })
    );
  },

  // ─── Refresh pipeline ─────────────────────────────────────────────────────

  /**
   * Trigger a full trend collection + analysis cycle.
   * @param {string} [platform='all']
   * @param {string} [category]
   * @returns {Promise<object>}
   */
  async refreshTrends({ platform = 'all', category } = {}) {
    logger.info('TrendService: refresh started', { platform, category });

    // 1. Collect
    const collectResult = await TrendCollector.collect(platform, category);

    // 2. Enrich scores
    const enrichResult = await TrendAnalyzer.enrichTrends(platform);

    // 3. Bust cache
    await CacheService.delPattern('trends', '');

    // 4. Emit event
    eventBus.emit(EVENT_TYPES.TREND_UPDATED, { platform, ...collectResult });

    logger.info('TrendService: refresh complete', {
      collected: collectResult.stored,
      enriched: enrichResult.processed,
    });

    return {
      success: true,
      collected: collectResult.stored,
      enriched: enrichResult.processed,
      platform,
    };
  },

  /**
   * Build a trend landscape summary.
   */
  async getLandscapeSummary(platform = 'all') {
    const trends = await TrendRepository.findTrends({
      platform: platform === 'all' ? undefined : platform,
      limit: 100,
      minScore: 0,
    });
    return TrendAnalyzer.summariseTrendLandscape(trends);
  },
};

export default TrendService;
