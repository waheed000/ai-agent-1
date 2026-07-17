/**
 * StrategyService
 * Generates 7-day, 30-day, and 90-day growth strategies.
 * Uses analytics + trends + competitor data to produce actionable plans.
 */
import StrategyRepository from '../repositories/StrategyRepository.js';
import AnalyticsService from './AnalyticsService.js';
import TrendService from './TrendService.js';
import CompetitorService from './CompetitorService.js';
import CacheService from './CacheService.js';
import eventBus from '../events/eventBus.js';
import { EVENT_TYPES } from '../events/eventTypes.js';
import logger from '../utils/logger.js';

const CACHE_NS = 'strategy';
const CACHE_TTL = 60 * 30; // 30 min

const PLAN_DAYS = { '7day': 7, '30day': 30, '90day': 90 };

function buildTitle(planType) {
  return { '7day': '7-Day', '30day': '30-Day', '90day': '90-Day' }[planType] + ' Growth Strategy';
}

/** Generate a day-by-day plan skeleton */
function buildDayPlan(planType, platforms, trendNames) {
  const days = PLAN_DAYS[planType] || 7;
  const focusPool = [
    'Content creation', 'Community engagement', 'Analytics review',
    'Trend incorporation', 'Collaboration outreach', 'Format experimentation',
    'Hashtag optimization', 'Audience research', 'Repurpose top content', 'Rest & planning',
  ];
  const today = new Date();

  return Array.from({ length: days }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    return {
      day: i + 1,
      date,
      focus: focusPool[i % focusPool.length],
      actions: [
        `Create or schedule content for ${platforms[i % platforms.length] || 'primary platform'}`,
        'Respond to comments and DMs',
        i % 7 === 0 ? 'Review weekly analytics' : 'Track engagement metrics',
      ],
      contentSuggestion: trendNames[i % trendNames.length]
        ? `Incorporate trending topic: ${trendNames[i % trendNames.length]}`
        : 'Share original content aligned with your niche',
      platform: platforms[i % platforms.length] || 'instagram',
      estimatedTime: i % 3 === 0 ? '2 hours' : '45 min',
    };
  });
}

function buildGrowthExperiments(trendNames) {
  return [
    {
      name: 'Reel Frequency Test',
      hypothesis: 'Posting 5 reels/week will increase follower growth by 20%.',
      method: 'Increase reel frequency for 2 weeks, compare with baseline.',
      duration: '2 weeks',
      successMetric: 'Follower growth rate',
      expectedLift: '+20% followers',
    },
    {
      name: 'Trending Hashtag Adoption',
      hypothesis: `Using trend hashtag "${trendNames[0] || '#viral'}" will boost reach.`,
      method: 'Include in every post for 1 week.',
      duration: '1 week',
      successMetric: 'Reach per post',
      expectedLift: '+30% reach',
    },
    {
      name: 'Posting Time Optimization',
      hypothesis: 'Posting at peak engagement hours will increase interactions.',
      method: 'Use best-time recommendations for all posts this week.',
      duration: '1 week',
      successMetric: 'Average engagement rate',
      expectedLift: '+15% engagement',
    },
  ];
}

function buildChecklist(planType) {
  const items = [
    { action: 'Audit your existing content library', category: 'content', priority: 'high', dueDay: 1 },
    { action: 'Set up analytics tracking dashboard', category: 'analytics', priority: 'high', dueDay: 1 },
    { action: 'Research top 10 trending hashtags in your niche', category: 'growth', priority: 'high', dueDay: 2 },
    { action: 'Create a content bank of 20 ideas', category: 'content', priority: 'medium', dueDay: 3 },
    { action: 'Optimize bio and profile on all platforms', category: 'optimization', priority: 'medium', dueDay: 2 },
    { action: 'Schedule your first week of posts', category: 'content', priority: 'high', dueDay: 3 },
    { action: 'Engage with 10 accounts in your niche daily', category: 'engagement', priority: 'medium', dueDay: 1 },
    { action: 'Review competitor content strategies', category: 'analytics', priority: 'low', dueDay: 5 },
    { action: 'Test at least 2 new content formats', category: 'content', priority: 'medium', dueDay: 7 },
    { action: 'Review and iterate on week 1 performance', category: 'analytics', priority: 'high', dueDay: 7 },
  ];

  const maxDay = PLAN_DAYS[planType] || 7;
  return items.filter((i) => i.dueDay <= maxDay);
}

function buildRiskAnalysis() {
  return [
    { risk: 'Algorithm change reduces organic reach', likelihood: 'medium', impact: 'high', mitigation: 'Diversify across platforms and focus on community building.' },
    { risk: 'Inconsistent posting schedule', likelihood: 'high', impact: 'medium', mitigation: 'Batch-create content weekly and use scheduling tools.' },
    { risk: 'Audience fatigue from repetitive content', likelihood: 'medium', impact: 'medium', mitigation: 'Rotate content formats and topics regularly.' },
    { risk: 'Low engagement despite high reach', likelihood: 'low', impact: 'high', mitigation: 'Add strong CTAs and interactive elements to posts.' },
  ];
}

function calcSuccessProbability(analyticsData) {
  let score = 50; // baseline
  const rate = analyticsData?.summary?.avgEngagementRate ?? 0;
  if (rate >= 3) score += 20;
  else if (rate >= 1) score += 10;
  const growth = analyticsData?.summary?.netGrowth ?? 0;
  if (growth > 0) score += 15;
  return Math.min(95, score);
}

const StrategyService = {
  async initiateGeneration(userId, { planType = '7day', platform } = {}) {
    const title = buildTitle(planType);
    const strategy = await StrategyRepository.create(userId, {
      planType,
      title,
      platforms: platform ? [platform] : [],
      status: 'generating',
    });

    logger.info('StrategyService: generation initiated', {
      userId: String(userId),
      strategyId: String(strategy._id),
      planType,
    });

    return strategy;
  },

  async generate(userId, strategyId) {
    try {
      const strategy = await StrategyRepository.findById(strategyId, userId);
      const platforms = strategy.platforms?.length ? strategy.platforms : ['instagram'];

      const [analyticsResult, trendsResult, competitorsResult] = await Promise.allSettled([
        AnalyticsService.getOverview(userId),
        TrendService.getTrends({ limit: 20 }),
        CompetitorService.listCompetitors(userId),
      ]);

      const analyticsData  = analyticsResult.status === 'fulfilled'  ? analyticsResult.value  : null;
      const trendData      = trendsResult.status === 'fulfilled'     ? trendsResult.value      : [];
      const competitorData = competitorsResult.status === 'fulfilled' ? competitorsResult.value : [];

      const trendNames = trendData.filter((t) => t.status === 'rising').slice(0, 10).map((t) => t.name);

      const dayPlan           = buildDayPlan(strategy.planType, platforms, trendNames);
      const growthExperiments = buildGrowthExperiments(trendNames);
      const actionChecklist   = buildChecklist(strategy.planType);
      const riskAnalysis      = buildRiskAnalysis();
      const successProbability = calcSuccessProbability(analyticsData);

      const weeklyMilestones = strategy.planType === '90day'
        ? ['Week 1-2: Foundation & Audit', 'Week 3-4: Content Ramp-Up', 'Week 5-8: Engagement Growth', 'Week 9-12: Scale & Optimize']
        : strategy.planType === '30day'
          ? ['Week 1: Setup & Baseline', 'Week 2: Consistent Posting', 'Week 3: Engagement Push', 'Week 4: Review & Iterate']
          : ['Day 1-2: Plan', 'Day 3-5: Execute', 'Day 6-7: Review'];

      const overview = `This ${strategy.planType} strategy is tailored to grow your audience consistently across ` +
        `${platforms.join(', ')}. Focus on ${trendNames[0] ? `trending topics like "${trendNames[0]}"` : 'niche-relevant content'}, ` +
        `community engagement, and data-driven iteration.`;

      const updated = await StrategyRepository.updateStatus(strategyId, 'ready', {
        overview,
        dayPlan,
        weeklyMilestones,
        growthExperiments,
        actionChecklist,
        riskAnalysis,
        successProbability,
        primaryGoal: 'Sustainable follower growth and engagement',
        targetMetrics: {
          followers: '+500',
          engagementRate: '>3%',
          postsPerWeek: 5,
          competitorsTracked: competitorData.length,
        },
        generatedAt: new Date(),
      });

      await CacheService.del(CACHE_NS, `latest:${userId}`);

      eventBus.emit(EVENT_TYPES.STRATEGY_GENERATED, {
        userId: String(userId),
        strategyId: String(strategyId),
        planType: strategy.planType,
      });

      logger.info('StrategyService: generation complete', {
        userId: String(userId),
        strategyId: String(strategyId),
        successProbability,
      });

      return updated;
    } catch (err) {
      await StrategyRepository.updateStatus(strategyId, 'failed', { failReason: err.message });
      eventBus.emit(EVENT_TYPES.STRATEGY_FAILED, { userId: String(userId), strategyId: String(strategyId) });
      logger.error('StrategyService: generation failed', { strategyId: String(strategyId), error: err.message });
      throw err;
    }
  },

  async getAll(userId, opts) {
    return StrategyRepository.findAllByUser(userId, opts);
  },

  async getLatest(userId, planType = null) {
    return CacheService.getOrSet(
      CACHE_NS,
      `latest:${userId}${planType ? `:${planType}` : ''}`,
      () => StrategyRepository.findLatest(userId, planType),
      CACHE_TTL
    );
  },
};

export default StrategyService;
