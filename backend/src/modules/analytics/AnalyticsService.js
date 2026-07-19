/**
 * AnalyticsService
 * Orchestrates analytics calculations for a user.
 * All metrics are computed from stored database data — no AI involved.
 */

import AnalyticsRepository from './AnalyticsRepository.js';
import ConnectedAccountRepository from '../integrations/ConnectedAccountRepository.js';

import { calcPostEngagementRate, calcAverageEngagementRate, calcAverageEngagementPerPost, calcEngagementByPlatform } from '../../utils/analytics/engagementCalc.js';
import { calcFollowerGrowth, calcReachAndImpressionsGrowth, calcMovingAverage, calcDailyDeltas } from '../../utils/analytics/growthCalc.js';
import { calcPostingFrequency, calcContentVelocity, calcConsistencyScore, calcPostingGaps } from '../../utils/analytics/consistencyCalc.js';
import { mergeDistributions, calcAudienceGrowthRate, calcTotalAudience, topN } from '../../utils/analytics/audienceCalc.js';
import { calcBestHours, calcBestDays, calcEngagementHeatmap, topPostingSlots } from '../../utils/analytics/bestTimeCalc.js';
import { rankPosts, identifyTopAndBottomContent } from '../../utils/analytics/contentScoring.js';

import { NotFoundError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

/**
 * Parse and validate date-range query params.
 * Defaults to the last 30 days.
 *
 * @param {string} [startDate]
 * @param {string} [endDate]
 * @param {string} [compare]  'previous_period' | 'previous_year'
 * @returns {{ start: Date, end: Date, prevStart: Date|null, prevEnd: Date|null }}
 */
function resolveDateRange(startDate, endDate, compare) {
  const end = endDate ? new Date(endDate) : new Date();
  end.setUTCHours(23, 59, 59, 999);

  const start = startDate
    ? new Date(startDate)
    : new Date(end.getTime() - 30 * 86_400_000);
  start.setUTCHours(0, 0, 0, 0);

  let prevStart = null;
  let prevEnd = null;

  if (compare === 'previous_period') {
    const periodMs = end.getTime() - start.getTime();
    prevEnd = new Date(start.getTime() - 1);
    prevStart = new Date(prevEnd.getTime() - periodMs);
  } else if (compare === 'previous_year') {
    prevStart = new Date(start);
    prevStart.setFullYear(prevStart.getFullYear() - 1);
    prevEnd = new Date(end);
    prevEnd.setFullYear(prevEnd.getFullYear() - 1);
  }

  return { start, end, prevStart, prevEnd };
}

const AnalyticsService = {
  // ─── Overview ─────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/analytics/overview
   * High-level metrics: follower count, engagement, reach, impressions.
   */
  async getOverview(userId, { platform, startDate, endDate, compare } = {}) {
    const { start, end, prevStart, prevEnd } = resolveDateRange(startDate, endDate, compare);

    const [engagement, prevEngagement, followerHistory] = await Promise.all([
      AnalyticsRepository.aggregateEngagement(userId, { platform, startDate: start, endDate: end }),
      compare
        ? AnalyticsRepository.aggregateEngagement(userId, { platform, startDate: prevStart, endDate: prevEnd })
        : Promise.resolve(null),
      AnalyticsRepository.findFollowerHistory(userId, { platform, startDate: start, endDate: end }),
    ]);

    const { net: followerNet, growthRate: followerGrowthRate } = calcFollowerGrowth(followerHistory);

    const result = {
      period: { start, end },
      followers: {
        net: followerNet,
        growthRate: followerGrowthRate,
      },
      engagement: {
        totalPosts: engagement.totalPosts,
        totalLikes: engagement.totalLikes,
        totalComments: engagement.totalComments,
        totalShares: engagement.totalShares,
        totalSaves: engagement.totalSaves,
        totalViews: engagement.totalViews,
        avgEngagementRate: Math.round((engagement.avgEngagementRate || 0) * 100) / 100,
      },
      reach: {
        total: engagement.totalReach,
        impressions: engagement.totalImpressions,
      },
    };

    if (compare && prevEngagement) {
      result.comparison = {
        period: { start: prevStart, end: prevEnd },
        engagementRateChange: calcGrowthRate(
          engagement.avgEngagementRate,
          prevEngagement.avgEngagementRate
        ),
        reachChange: calcGrowthRate(engagement.totalReach, prevEngagement.totalReach),
        postsChange: calcGrowthRate(engagement.totalPosts, prevEngagement.totalPosts),
      };
    }

    return result;
  },

  // ─── Growth ───────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/analytics/growth
   * Follower growth time-series with optional moving average.
   */
  async getGrowth(userId, { platform, startDate, endDate, compare } = {}) {
    const { start, end, prevStart, prevEnd } = resolveDateRange(startDate, endDate, compare);

    const [history, prevHistory] = await Promise.all([
      AnalyticsRepository.aggregateFollowerHistory(userId, { startDate: start, endDate: end }),
      compare
        ? AnalyticsRepository.aggregateFollowerHistory(userId, { startDate: prevStart, endDate: prevEnd })
        : Promise.resolve([]),
    ]);

    const snapshots = history.map((h) => ({
      date: h.date,
      followers: h.totalFollowers,
      delta: h.totalDelta,
    }));

    const { net, growthRate, startFollowers, endFollowers } = calcFollowerGrowth(
      history.map((h) => ({ date: h.date, followers: h.totalFollowers }))
    );

    const movingAvg = calcMovingAverage(
      history.map((h) => ({ date: h.date, followers: h.totalFollowers }))
    );

    const result = {
      period: { start, end },
      summary: { net, growthRate, startFollowers, endFollowers },
      timeSeries: snapshots,
      movingAverage: movingAvg,
    };

    if (compare && prevHistory.length > 0) {
      const prev = calcFollowerGrowth(
        prevHistory.map((h) => ({ date: h.date, followers: h.totalFollowers }))
      );
      result.comparison = {
        period: { start: prevStart, end: prevEnd },
        ...prev,
      };
    }

    return result;
  },

  // ─── Engagement ───────────────────────────────────────────────────────────

  /**
   * GET /api/v1/analytics/engagement
   * Detailed engagement breakdown by platform and over time.
   */
  async getEngagement(userId, { platform, startDate, endDate, compare } = {}) {
    const { start, end, prevStart, prevEnd } = resolveDateRange(startDate, endDate, compare);

    const [posts, byPlatform, prevEngagement] = await Promise.all([
      AnalyticsRepository.findPosts(userId, { platform, startDate: start, endDate: end }),
      AnalyticsRepository.engagementByPlatform(userId, { startDate: start, endDate: end }),
      compare
        ? AnalyticsRepository.aggregateEngagement(userId, { platform, startDate: prevStart, endDate: prevEnd })
        : Promise.resolve(null),
    ]);

    const avgEngagementRate = calcAverageEngagementRate(posts);
    const avgPerPost = calcAverageEngagementPerPost(posts);

    const result = {
      period: { start, end },
      summary: {
        avgEngagementRate,
        totalPosts: posts.length,
        ...avgPerPost,
      },
      byPlatform,
    };

    if (compare && prevEngagement) {
      result.comparison = {
        period: { start: prevStart, end: prevEnd },
        avgEngagementRateChange: _growthRate(avgEngagementRate, prevEngagement.avgEngagementRate),
      };
    }

    return result;
  },

  // ─── Content Performance ──────────────────────────────────────────────────

  /**
   * GET /api/v1/analytics/content-performance
   * Top / bottom content, content velocity, consistency score.
   */
  async getContentPerformance(userId, { platform, startDate, endDate, limit = 10 } = {}) {
    const { start, end } = resolveDateRange(startDate, endDate);
    const periodDays = Math.round((end - start) / 86_400_000);

    const posts = await AnalyticsRepository.findPosts(userId, {
      platform,
      startDate: start,
      endDate: end,
      limit: 500,
    });

    const { top, bottom } = identifyTopAndBottomContent(posts, 0, parseInt(limit, 10));
    const velocity = calcContentVelocity(posts, periodDays);
    const consistency = calcConsistencyScore(posts, start, end);
    const frequency = calcPostingFrequency(posts, periodDays);
    const gaps = calcPostingGaps(posts);

    return {
      period: { start, end },
      summary: {
        totalPosts: posts.length,
        postingFrequency: frequency,
        contentVelocity: velocity,
        consistencyScore: consistency,
        avgGapDays: gaps.avgGapDays,
      },
      topContent: top.map(({ post, score }) => ({
        id: post._id,
        title: post.title,
        platform: post.platform,
        format: post.format,
        publishedAt: post.publishedAt,
        engagement: post.engagement,
        engagementRate: post.engagementRate,
        score,
      })),
      bottomContent: bottom.map(({ post, score }) => ({
        id: post._id,
        title: post.title,
        platform: post.platform,
        format: post.format,
        publishedAt: post.publishedAt,
        engagement: post.engagement,
        engagementRate: post.engagementRate,
        score,
      })),
    };
  },

  // ─── Best Posting Time ────────────────────────────────────────────────────

  /**
   * GET /api/v1/analytics/best-posting-time
   */
  async getBestPostingTime(userId, { platform, startDate, endDate } = {}) {
    const { start, end } = resolveDateRange(startDate, endDate);

    const posts = await AnalyticsRepository.findPosts(userId, {
      platform,
      startDate: start,
      endDate: end,
      limit: 500,
    });

    const bestHours = calcBestHours(posts);
    const bestDays = calcBestDays(posts);
    const heatmap = calcEngagementHeatmap(posts);
    const topSlots = topPostingSlots(heatmap, 5);

    return {
      period: { start, end },
      totalPostsAnalysed: posts.length,
      bestHours: bestHours.slice(0, 5),
      bestDays: bestDays.slice(0, 3),
      topSlots,
      heatmap,
    };
  },

  // ─── Audience ─────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/analytics/audience
   */
  async getAudience(userId, { platform, startDate, endDate } = {}) {
    const { start, end } = resolveDateRange(startDate, endDate);

    const [latestSnapshots, history] = await Promise.all([
      AnalyticsRepository.findLatestAudienceSnapshots(userId, { platform }),
      AnalyticsRepository.findAudienceHistory(userId, {
        platform,
        startDate: start,
        endDate: end,
      }),
    ]);

    const totals = calcTotalAudience(
      latestSnapshots.map((s) => ({
        platform: s.platform,
        totalFollowers: s.totalFollowers,
        totalFollowing: s.totalFollowing,
      }))
    );

    const { growthRate, net } = calcAudienceGrowthRate(history);

    // Merge demographics across platforms for a rolled-up view
    const ageGroups = mergeDistributions(latestSnapshots.map((s) => s.demographics?.ageGroups || []));
    const genders = mergeDistributions(latestSnapshots.map((s) => s.demographics?.genders || []));
    const countries = mergeDistributions(latestSnapshots.map((s) => s.demographics?.countries || []));

    return {
      period: { start, end },
      totals,
      growth: { net, growthRate },
      demographics: {
        ageGroups: topN(ageGroups, 6),
        genders: topN(genders, 5),
        countries: topN(countries, 10),
      },
      byPlatform: latestSnapshots.map((s) => ({
        platform: s.platform,
        snapshotDate: s.snapshotDate,
        totalFollowers: s.totalFollowers,
        totalFollowing: s.totalFollowing,
        audienceGrowthRate: s.audienceGrowthRate,
      })),
    };
  },
};

// Inline helper (avoids circular import of growthCalc)
function _growthRate(current, previous) {
  if (!previous) return null;
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

export default AnalyticsService;
