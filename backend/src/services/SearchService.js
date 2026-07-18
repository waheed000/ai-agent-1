/**
 * SearchService
 * Full-text search across Reports, Planner, Competitors, Posts, Ideas, Notifications, Trends.
 * Returns grouped results keyed by resource type.
 */
import mongoose from 'mongoose';
import logger from '../utils/logger.js';

/** Safe dynamic model import — silently returns null if model is not registered. */
function model(name) {
  try { return mongoose.model(name); } catch { return null; }
}

function buildRegex(query) {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i');
}

async function safeFind(Model, filter, projection, limit, skip = 0) {
  if (!Model) return [];
  try {
    return await Model.find(filter, projection).skip(skip).limit(limit).lean();
  } catch {
    return [];
  }
}

const SearchService = {
  /**
   * Search across all indexed resources for a user.
   * @param {string|ObjectId} userId
   * @param {string} query — search term
   * @param {number} limit — per-group result limit (default 10)
   * @returns {{ reports, planner, competitors, posts, ideas, notifications, trends }}
   */
  async search(userId, query, limit = 10, skip = 0) {
    const rx = buildRegex(query);
    const userOId = new mongoose.Types.ObjectId(String(userId));
    const userFilter = { user: userOId, isDeleted: false };

    const [reports, planner, competitors, posts, ideas, notifications, trends] = await Promise.all([
      // Reports
      safeFind(
        model('Report'),
        { ...userFilter, $or: [{ title: rx }, { executiveSummary: rx }] },
        { title: 1, type: 1, status: 1, generatedAt: 1 },
        limit, skip
      ),

      // Planner items (ContentPlan)
      safeFind(
        model('ContentPlan'),
        { ...userFilter, $or: [{ title: rx }, { caption: rx }] },
        { title: 1, platform: 1, status: 1, suggestedTime: 1 },
        limit, skip
      ),

      // Competitors
      safeFind(
        model('Competitor'),
        { ...userFilter, $or: [{ name: rx }, { handle: rx }, { notes: rx }] },
        { name: 1, handle: 1, platform: 1 },
        limit, skip
      ),

      // Posts
      safeFind(
        model('Post'),
        { ...userFilter, $or: [{ title: rx }, { caption: rx }, { hashtags: rx }] },
        { title: 1, caption: 1, platform: 1, publishedAt: 1 },
        limit, skip
      ),

      // Content Ideas
      safeFind(
        model('ContentIdea'),
        { ...userFilter, $or: [{ title: rx }, { description: rx }] },
        { title: 1, description: 1, platform: 1, status: 1 },
        limit, skip
      ),

      // Notifications — user-scoped (no isDeleted field on Notification)
      safeFind(
        model('Notification'),
        { user: userOId, $or: [{ title: rx }, { message: rx }] },
        { title: 1, message: 1, type: 1, read: 1, createdAt: 1 },
        limit, skip
      ),

      // Trends — platform-wide data; no per-user filter by design
      safeFind(
        model('TrendData'),
        { $or: [{ name: rx }, { description: rx }, { hashtags: rx }] },
        { name: 1, category: 1, status: 1, trendScore: 1 },
        limit, skip
      ),
    ]);

    const totalCount =
      reports.length + planner.length + competitors.length +
      posts.length + ideas.length + notifications.length + trends.length;

    logger.debug('SearchService: query complete', {
      userId: String(userId),
      query,
      totalCount,
    });

    return {
      query,
      totalCount,
      results: {
        reports:       { count: reports.length,       items: reports },
        planner:       { count: planner.length,       items: planner },
        competitors:   { count: competitors.length,   items: competitors },
        posts:         { count: posts.length,         items: posts },
        ideas:         { count: ideas.length,         items: ideas },
        notifications: { count: notifications.length, items: notifications },
        trends:        { count: trends.length,        items: trends },
      },
    };
  },
};

export default SearchService;
