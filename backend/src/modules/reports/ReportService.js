/**
 * ReportService
 * Orchestrates report generation by pulling data from Analytics,
 * Competitor, Trend services and AI agents.
 * Reports are immutable — every generate() call creates a new document.
 */
import ReportRepository from './ReportRepository.js';
import AnalyticsService from '../analytics/AnalyticsService.js';
import CompetitorService from '../competitors/CompetitorService.js';
import TrendService from '../trends/TrendService.js';
import CacheService from '../../infrastructure/cache/index.js';
import eventBus from '../../events/eventBus.js';
import { EVENT_TYPES } from '../../events/eventTypes.js';
import logger from '../../utils/logger.js';

const CACHE_NS = 'reports';
const CACHE_TTL = 60 * 15; // 15 min

/** Period boundaries for each report type */
function buildPeriod(type, referenceDate = new Date()) {
  const end = new Date(referenceDate);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);

  switch (type) {
    case 'weekly':
      start.setDate(end.getDate() - 6);
      break;
    case 'monthly':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'quarterly':
      start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'yearly':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      start.setDate(end.getDate() - 6);
  }
  return { startDate: start, endDate: end };
}

function buildTitle(type, period) {
  const label = {
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
    custom: 'Custom',
  }[type] || 'Growth';
  const date = period.startDate.toISOString().slice(0, 10);
  return `${label} Growth Report — ${date}`;
}

const ReportService = {
  /**
   * Start async report generation via queue (preferred for API requests).
   * Returns the pending Report document immediately.
   */
  async initiateGeneration(userId, { type = 'weekly', platform, referenceDate } = {}) {
    const period = buildPeriod(type, referenceDate ? new Date(referenceDate) : undefined);
    const title = buildTitle(type, period);

    const report = await ReportRepository.create(userId, {
      type,
      period,
      title,
      platforms: platform ? [platform] : [],
      status: 'generating',
    });

    logger.info('ReportService: generation initiated', {
      userId: String(userId),
      reportId: String(report._id),
      type,
    });

    return report;
  },

  /**
   * Execute the full report generation pipeline (called by the worker).
   */
  async generate(userId, reportId) {
    try {
      const report = await ReportRepository.findById(reportId, userId);
      const { period, platforms } = report;
      const platform = platforms?.[0] || undefined;

      const dateRange = { startDate: period.startDate, endDate: period.endDate };

      // Gather data in parallel
      const [overview, growth, engagement, content, bestTime, competitors, trends] =
        await Promise.allSettled([
          AnalyticsService.getOverview(userId, { platform }),
          AnalyticsService.getGrowth(userId, { ...dateRange, platform }),
          AnalyticsService.getEngagement(userId, { ...dateRange, platform }),
          AnalyticsService.getContentPerformance(userId, { ...dateRange, platform }),
          AnalyticsService.getBestPostingTime(userId, { platform }),
          CompetitorService.listCompetitors(userId).catch(() => []),
          TrendService.getTrends({ limit: 10 }).catch(() => []),
        ]);

      const V = (settled) => settled.status === 'fulfilled' ? settled.value : null;

      const overviewData   = V(overview)   || {};
      const growthData     = V(growth)     || {};
      const engagementData = V(engagement) || {};
      const contentData    = V(content)    || {};
      const trendData      = V(trends)     || [];
      const competitorList = V(competitors) || [];

      // Build section data
      const growthMetrics = {
        followersGained:  growthData.summary?.followersGained ?? 0,
        followersLost:    growthData.summary?.followersLost ?? 0,
        netGrowth:        growthData.summary?.netGrowth ?? 0,
        growthRate:       growthData.summary?.growthRate ?? 0,
        totalReach:       overviewData.totalReach ?? 0,
        totalImpressions: overviewData.totalImpressions ?? 0,
        byPlatform:       growthData.byPlatform ?? {},
      };

      const engagementMetrics = {
        avgEngagementRate: engagementData.summary?.avgEngagementRate ?? 0,
        totalEngagements:  engagementData.summary?.totalEngagements ?? 0,
        totalLikes:        engagementData.summary?.totalLikes ?? 0,
        totalComments:     engagementData.summary?.totalComments ?? 0,
        totalShares:       engagementData.summary?.totalShares ?? 0,
        byPlatform:        engagementData.byPlatform ?? {},
      };

      const contentPerformance = {
        postsPublished:       contentData.summary?.postsPublished ?? 0,
        topPerformingFormat:  contentData.summary?.topFormat ?? null,
        topPerformingPlatform: overviewData.topPlatform ?? null,
        topPosts:             contentData.topContent?.map((p) => p._id).filter(Boolean) ?? [],
        consistencyScore:     contentData.summary?.consistencyScore ?? 0,
      };

      const competitorComparison = {
        summary:            `Tracking ${competitorList.length} competitor(s).`,
        competitorCount:    competitorList.length,
        relativeGrowthRate: 'N/A',
        contentGaps:        [],
        advantages:         [],
      };

      const risingTrendNames = trendData
        .filter((t) => t.status === 'rising')
        .slice(0, 5)
        .map((t) => t.name);

      const trendSummary = {
        summary:             `${trendData.length} active trends detected.`,
        risingTrends:        risingTrendNames,
        relevantHashtags:    trendData.filter((t) => t.category === 'hashtag').slice(0, 5).map((t) => t.name),
        missedOpportunities: [],
      };

      const aiInsights = {
        narrative:       'AI narrative pending — connect an AI provider to enable.',
        strengths:       growthData.summary?.netGrowth > 0 ? ['Positive follower growth this period'] : [],
        weaknesses:      engagementData.summary?.avgEngagementRate < 2 ? ['Below-average engagement rate'] : [],
        recommendations: ['Post consistently', 'Engage with comments within the first hour'],
        opportunities:   risingTrendNames.length > 0 ? [`Capitalize on trending: ${risingTrendNames[0]}`] : [],
      };

      const kpis = [
        { metric: 'Follower Growth',   current: growthMetrics.netGrowth, target: 100,  unit: 'followers', status: growthMetrics.netGrowth >= 100 ? 'on_track' : 'at_risk' },
        { metric: 'Engagement Rate',   current: engagementMetrics.avgEngagementRate, target: 3, unit: '%', status: engagementMetrics.avgEngagementRate >= 3 ? 'on_track' : 'at_risk' },
        { metric: 'Posts Published',   current: contentPerformance.postsPublished, target: 7, unit: 'posts', status: contentPerformance.postsPublished >= 7 ? 'on_track' : 'at_risk' },
      ];

      const priorityScore = Math.min(
        100,
        Math.round(
          (growthMetrics.netGrowth > 0 ? 30 : 10) +
          Math.min(40, engagementMetrics.avgEngagementRate * 10) +
          (contentPerformance.postsPublished > 5 ? 30 : 10)
        )
      );

      const nextWeekGoals = [
        'Maintain posting consistency',
        'Engage with at least 20 comments per day',
        ...(risingTrendNames.length > 0 ? [`Create content around: ${risingTrendNames[0]}`] : []),
      ];

      const executiveSummary = `${report.title}: Net follower growth of ${growthMetrics.netGrowth}, ` +
        `avg engagement rate ${engagementMetrics.avgEngagementRate.toFixed(2)}%, ` +
        `${contentPerformance.postsPublished} posts published.`;

      // Update report with all sections
      const updated = await ReportRepository.updateStatus(reportId, 'ready', {
        executiveSummary,
        growthMetrics,
        engagementMetrics,
        contentPerformance,
        competitorComparison,
        trendSummary,
        aiInsights,
        kpis,
        priorityScore,
        nextWeekGoals,
        generatedAt: new Date(),
      });

      await CacheService.del(CACHE_NS, `latest:${userId}`);
      await CacheService.del(CACHE_NS, `latest:${userId}:${report.type}`);

      eventBus.emit(EVENT_TYPES.REPORT_GENERATED, {
        userId: String(userId),
        reportId: String(reportId),
        type: report.type,
      });

      logger.info('ReportService: generation complete', {
        userId: String(userId),
        reportId: String(reportId),
        priorityScore,
      });

      return updated;
    } catch (err) {
      await ReportRepository.updateStatus(reportId, 'failed', { failReason: err.message });
      eventBus.emit(EVENT_TYPES.REPORT_FAILED, { userId: String(userId), reportId: String(reportId), error: err.message });
      logger.error('ReportService: generation failed', { reportId: String(reportId), error: err.message });
      throw err;
    }
  },

  async getAll(userId, opts) {
    return ReportRepository.findAllByUser(userId, opts);
  },

  async getById(userId, reportId) {
    return ReportRepository.findById(reportId, userId);
  },

  async getLatest(userId, type = null) {
    return CacheService.getOrSet(
      CACHE_NS,
      `latest:${userId}${type ? `:${type}` : ''}`,
      () => ReportRepository.findLatest(userId, type),
      CACHE_TTL
    );
  },

  async deleteReport(userId, reportId) {
    return ReportRepository.softDelete(reportId, userId);
  },
};

export default ReportService;
