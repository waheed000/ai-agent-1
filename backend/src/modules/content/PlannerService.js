/**
 * PlannerService
 * Generates AI-powered content calendars and manages content planning.
 * Uses analytics, trends, competitor data, and growth strategy as inputs.
 */
import PlannerRepository from './PlannerRepository.js';
import DraftRepository from './DraftRepository.js';
import AnalyticsService from '../analytics/AnalyticsService.js';
import TrendService from '../trends/TrendService.js';
import StrategyService from '../strategy/StrategyService.js';
import CacheService from '../../infrastructure/cache/index.js';
import eventBus from '../../events/eventBus.js';
import { EVENT_TYPES } from '../../events/eventTypes.js';
import logger from '../../utils/logger.js';

const CACHE_NS = 'planner';
const CACHE_TTL = 60 * 10; // 10 min

const PLATFORMS = ['instagram', 'youtube', 'tiktok', 'twitter', 'facebook', 'linkedin'];

const CONTENT_IDEAS_BY_FORMAT = {
  reel:        ['Behind-the-scenes reel', 'Quick tip reel', 'Trend-inspired reel', 'Day-in-the-life reel'],
  short_video: ['60-second tutorial', 'Reaction video', 'Before & after', 'Product showcase'],
  image:       ['Quote card', 'Infographic', 'Lifestyle photo', 'Brand photo'],
  carousel:    ['Step-by-step guide', 'List post', 'Story carousel', 'Case study carousel'],
  story:       ['Poll story', 'Q&A story', 'Behind-the-scenes story', 'Announcement story'],
  thread:      ['Thought leadership thread', 'Industry insight', 'Personal story', 'Hot take'],
  article:     ['In-depth guide', 'Opinion piece', 'Case study', 'Tutorial article'],
};

const GOALS = ['engagement', 'brand_awareness', 'lead_generation', 'education', 'entertainment'];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildContentItem(userId, platform, day, trendNames, bestHours) {
  const formats = Object.keys(CONTENT_IDEAS_BY_FORMAT);
  const format = randomItem(formats);
  const ideas = CONTENT_IDEAS_BY_FORMAT[format];
  const title = randomItem(ideas);
  const trendTag = trendNames[day % trendNames.length];

  const suggestedDate = new Date();
  suggestedDate.setDate(suggestedDate.getDate() + day);
  const hour = bestHours?.[day % (bestHours?.length || 1)] ?? 18;
  suggestedDate.setHours(hour, 0, 0, 0);

  return {
    user: userId,
    title,
    description: `${title} — leverage ${trendTag ? `trending topic: ${trendTag}` : 'your niche expertise'} to drive engagement.`,
    platform,
    contentType: format,
    suggestedTime: suggestedDate,
    estimatedReach: Math.floor(1000 + Math.random() * 9000),
    estimatedEngagement: Math.floor(50 + Math.random() * 450),
    priority: day < 3 ? 'high' : day < 7 ? 'medium' : 'low',
    goal: GOALS[day % GOALS.length],
    hashtags: trendTag ? [trendTag, '#content', '#creator'] : ['#content', '#creator'],
    keywords: [format, 'creator', platform],
    aiCaption: `✨ ${title}\n\n${trendTag ? `Trending: ${trendTag}\n\n` : ''}Drop a 🔥 if this resonates!\n\n#content #creator #${platform}`,
    status: 'draft',
  };
}

const PlannerService = {
  /**
   * Generate a content calendar for `days` days.
   * Stores each item as a ContentPlan document.
   */
  async generate(userId, { days = 7, platforms, campaignName } = {}) {
    const targetPlatforms = platforms?.length ? platforms : ['instagram'];

    const [trendsResult, analyticsResult, strategyResult] = await Promise.allSettled([
      TrendService.getTrends({ limit: 20 }),
      AnalyticsService.getBestPostingTime(userId).catch(() => null),
      StrategyService.getLatest(userId, '7day').catch(() => null),
    ]);

    const trends    = trendsResult.status === 'fulfilled'   ? trendsResult.value   : [];
    const bestTime  = analyticsResult.status === 'fulfilled' ? analyticsResult.value : null;
    const strategy  = strategyResult.status === 'fulfilled'  ? strategyResult.value  : null;

    const trendNames = trends
      .filter((t) => t.status === 'rising' || t.category === 'hashtag')
      .slice(0, 15)
      .map((t) => t.name);

    const bestHours = bestTime?.instagram?.topHours || [9, 12, 18];

    const items = [];
    for (let day = 0; day < days; day++) {
      const platform = targetPlatforms[day % targetPlatforms.length];
      items.push(buildContentItem(userId, platform, day, trendNames, bestHours));
    }

    const created = await PlannerRepository.bulkCreate(userId, items);

    await CacheService.del(CACHE_NS, `calendar:${userId}`);

    eventBus.emit(EVENT_TYPES.PLANNER_GENERATED, {
      userId:  String(userId),
      count:   created.length,
      days,
      strategy: strategy?._id ? String(strategy._id) : null,
    });

    logger.info('PlannerService: planner generated', {
      userId: String(userId),
      count: created.length,
      days,
      platforms: targetPlatforms,
    });

    return {
      generated: created.length,
      days,
      platforms: targetPlatforms,
      campaignName: campaignName || null,
      items: created,
    };
  },

  async getAll(userId, opts) {
    return PlannerRepository.findAllByUser(userId, opts);
  },

  async update(userId, planId, data) {
    const allowed = ['title', 'description', 'suggestedTime', 'status', 'priority', 'goal',
      'hashtags', 'keywords', 'aiCaption', 'platform', 'contentType', 'notes',
      'estimatedReach', 'estimatedEngagement', 'campaignName', 'isRecurring'];
    const clean = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
    return PlannerRepository.update(planId, userId, clean);
  },

  async delete(userId, planId) {
    return PlannerRepository.softDelete(planId, userId);
  },

  // ── Drafts ────────────────────────────────────────────────────────────────

  async createDraft(userId, data) {
    const draft = await DraftRepository.create(userId, data);

    eventBus.emit(EVENT_TYPES.DRAFT_CREATED, {
      userId:  String(userId),
      draftId: String(draft._id),
    });

    return draft;
  },

  async updateDraft(userId, draftId, data) {
    const allowed = ['title', 'caption', 'body', 'hashtags', 'keywords', 'mediaUrls',
      'status', 'reviewNotes', 'scheduledAt', 'platform', 'contentType'];
    const clean = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));

    const draft = await DraftRepository.update(draftId, userId, clean);

    if (clean.status) {
      eventBus.emit(EVENT_TYPES.DRAFT_UPDATED, {
        userId, draftId: String(draftId), status: clean.status,
      });
    }

    return draft;
  },

  async deleteDraft(userId, draftId) {
    return DraftRepository.softDelete(draftId, userId);
  },
};

export default PlannerService;
