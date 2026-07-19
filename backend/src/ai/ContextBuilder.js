/**
 * ContextBuilder
 * Assembles structured context objects for AI agents from multiple data sources.
 * Each agent type gets exactly the data it needs — nothing more.
 *
 * Context sources:
 *  - Analytics (AnalyticsService)
 *  - Audience (AudienceAnalytics)
 *  - Posts (Post model)
 *  - Competitors (CompetitorAnalytics)
 *  - Trends (TrendData)
 *  - Historical reports (GrowthReport)
 */

import AnalyticsService from '../modules/analytics/AnalyticsService.js';
import CompetitorAnalyticsRepository from '../modules/competitors/CompetitorAnalyticsRepository.js';
import TrendRepository from '../modules/trends/TrendRepository.js';
import AnalyticsRepository from '../modules/analytics/AnalyticsRepository.js';
import logger from '../utils/logger.js';

class ContextBuilder {
  /**
   * Build analytics context — used by AnalyticsAgent.
   */
  async buildAnalyticsContext(userId, { platform, startDate, endDate } = {}) {
    try {
      const [overview, growth, engagement, contentPerf, bestTime] = await Promise.all([
        AnalyticsService.getOverview(userId, { platform, startDate, endDate }),
        AnalyticsService.getGrowth(userId, { platform, startDate, endDate }),
        AnalyticsService.getEngagement(userId, { platform, startDate, endDate }),
        AnalyticsService.getContentPerformance(userId, { platform, startDate, endDate }),
        AnalyticsService.getBestPostingTime(userId, { platform }),
      ]);

      return {
        overview,
        growth,
        engagement,
        contentPerformance: {
          summary: contentPerf.summary,
          topContent: contentPerf.topContent?.slice(0, 5),
        },
        bestTime: {
          bestHours: bestTime.bestHours?.slice(0, 3),
          bestDays: bestTime.bestDays?.slice(0, 3),
          topSlots: bestTime.topSlots?.slice(0, 3),
        },
      };
    } catch (err) {
      logger.warn('ContextBuilder.buildAnalyticsContext failed', { error: err.message });
      return null;
    }
  }

  /**
   * Build content context — used by ContentAgent.
   */
  async buildContentContext(userId, { platform, startDate, endDate } = {}) {
    try {
      const [topPosts, audience, bestTime] = await Promise.all([
        AnalyticsRepository.findTopPosts(userId, { platform, startDate, endDate, limit: 10 }),
        AnalyticsService.getAudience(userId, { platform }),
        AnalyticsService.getBestPostingTime(userId, { platform }),
      ]);

      return {
        topPosts: topPosts.map((p) => ({
          title: p.title,
          format: p.format,
          engagementRate: p.engagementRate,
          publishedAt: p.publishedAt,
          platform: p.platform,
        })),
        audience: {
          demographics: audience.demographics,
          totals: audience.totals,
        },
        bestTime: {
          bestHours: bestTime.bestHours?.slice(0, 3),
          bestDays: bestTime.bestDays?.slice(0, 3),
        },
      };
    } catch (err) {
      logger.warn('ContextBuilder.buildContentContext failed', { error: err.message });
      return null;
    }
  }

  /**
   * Build trend context — used by TrendAgent.
   */
  async buildTrendContext(platform) {
    try {
      const [topics, hashtags, formats, velocity] = await Promise.all([
        TrendRepository.findTopics({ platform, limit: 10 }),
        TrendRepository.findHashtags({ platform, limit: 20 }),
        TrendRepository.findCreatorTrends({ platform, limit: 10 }),
        TrendRepository.findHighVelocity({ platform, limit: 5 }),
      ]);

      return { topics, hashtags, formats, highVelocity: velocity };
    } catch (err) {
      logger.warn('ContextBuilder.buildTrendContext failed', { error: err.message });
      return null;
    }
  }

  /**
   * Build competitor context — used by CompetitorAgent.
   */
  async buildCompetitorContext(userId) {
    try {
      const snapshots = await CompetitorAnalyticsRepository.findLatestForUser(userId);

      return {
        competitorCount: snapshots.length,
        competitors: snapshots.map((s) => ({
          followerCount: s.followerCount,
          avgEngagementRate: s.avgEngagementRate,
          postFrequencyPerWeek: s.postFrequencyPerWeek,
          topHashtags: s.topHashtags?.slice(0, 5),
          scores: s.scores,
          topicGaps: s.topicGaps?.slice(0, 5),
          strengthAreas: s.strengthAreas?.slice(0, 3),
        })),
      };
    } catch (err) {
      logger.warn('ContextBuilder.buildCompetitorContext failed', { error: err.message });
      return null;
    }
  }

  /**
   * Build the full combined context — used by GrowthCoachAgent.
   */
  async buildGrowthCoachContext(userId, { platform, startDate, endDate } = {}) {
    const [analytics, content, trends, competitors] = await Promise.allSettled([
      this.buildAnalyticsContext(userId, { platform, startDate, endDate }),
      this.buildContentContext(userId, { platform, startDate, endDate }),
      this.buildTrendContext(platform),
      this.buildCompetitorContext(userId),
    ]);

    return {
      analytics: analytics.status === 'fulfilled' ? analytics.value : null,
      content: content.status === 'fulfilled' ? content.value : null,
      trends: trends.status === 'fulfilled' ? trends.value : null,
      competitors: competitors.status === 'fulfilled' ? competitors.value : null,
    };
  }
}

export default new ContextBuilder();
