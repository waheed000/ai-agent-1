/**
 * TrendCollector
 * Collects and normalises raw trend data before it is stored.
 *
 * In production this would call external APIs (e.g. RapidAPI, SocialBlade,
 * Google Trends). In the current implementation it produces deterministic
 * seed data based on the platform so the pipeline is fully functional
 * without external API keys. Replace _collectFromPlatform() with real API
 * calls when credentials are available.
 */

import TrendRepository from '../../repositories/TrendRepository.js';
import { PLATFORMS } from '../../models/utils/schemaUtils.js';
import logger from '../../utils/logger.js';

// Seed hashtags per platform — representative of real trend patterns
const SEED_HASHTAGS = {
  instagram: ['reels', 'explore', 'viral', 'aesthetic', 'creator', 'trending', 'ootd', 'fyp', 'lifestyle', 'inspiration'],
  tiktok: ['fyp', 'foryou', 'viral', 'trending', 'tiktoktrend', 'duet', 'comedy', 'storytime', 'dayinmylife', 'pov'],
  youtube: ['shorts', 'tutorial', 'vlog', 'howto', 'review', 'subscribe', 'youtubeshorts', 'gaming', 'tech', 'react'],
  twitter: ['trending', 'viral', 'thread', 'news', 'twitterx', 'meme', 'tech', 'ai', 'crypto', 'sports'],
  linkedin: ['career', 'leadership', 'innovation', 'networking', 'business', 'productivity', 'ai', 'startup', 'growth', 'hiring'],
  facebook: ['reels', 'community', 'live', 'groups', 'marketplace', 'viral', 'local', 'events', 'nostalgia', 'inspiration'],
  pinterest: ['aesthetic', 'diy', 'recipe', 'home', 'fashion', 'wedding', 'travel', 'fitness', 'art', 'garden'],
  other: ['viral', 'trending', 'creator', 'content', 'social', 'growth', 'brand', 'marketing', 'tips', 'strategy'],
};

const SEED_TOPICS = [
  'AI tools for creators', 'Short-form video strategy', 'Authentic storytelling',
  'Community building', 'Behind-the-scenes content', 'Creator economy trends',
  'UGC (user-generated content)', 'Personal branding', 'Niche audiences',
  'Cross-platform repurposing',
];

const SEED_FORMATS = ['short_video', 'reel', 'carousel', 'thread', 'story', 'long_video', 'podcast', 'article'];
const SEED_KEYWORDS = ['authentic', 'relatable', 'educational', 'entertaining', 'inspirational', 'controversial', 'nostalgic', 'trending'];
const SEED_CHALLENGES = ['30-day content challenge', 'Day in my life series', 'Reaction challenge', 'Collab series', 'Q&A week'];

class TrendCollector {
  /**
   * Collect and store trend data for a platform (or all platforms).
   *
   * @param {string} [platform='all']
   * @param {string} [category]  optional — refresh only one category
   * @returns {Promise<{stored: number, platform: string}>}
   */
  async collect(platform = 'all', category = null) {
    logger.info('TrendCollector: starting collection', { platform, category });

    const platforms = platform === 'all' ? PLATFORMS : [platform];
    let totalStored = 0;

    for (const plat of platforms) {
      try {
        const trends = await this._collectFromPlatform(plat, category);
        if (trends.length > 0) {
          const result = await TrendRepository.bulkUpsert(trends);
          totalStored += result.upsertedCount + result.modifiedCount;
        }
      } catch (err) {
        logger.error('TrendCollector: failed for platform', { platform: plat, error: err.message });
      }
    }

    // Mark expired trends
    const expiredCount = await TrendRepository.markExpired();
    if (expiredCount > 0) {
      logger.info('TrendCollector: marked expired trends', { count: expiredCount });
    }

    logger.info('TrendCollector: collection complete', { totalStored, platform });
    return { stored: totalStored, platform };
  }

  /**
   * Generate normalised trend objects for a single platform.
   * Replace this with real API calls in production.
   *
   * @param {string} platform
   * @param {string|null} category
   * @returns {Promise<Array>}
   */
  async _collectFromPlatform(platform, category) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 86_400_000); // 7-day lifespan default
    const trends = [];

    const include = (cat) => !category || category === cat;

    if (include('hashtag')) {
      const tags = SEED_HASHTAGS[platform] || SEED_HASHTAGS.other;
      for (let i = 0; i < tags.length; i++) {
        trends.push({
          platform,
          category: 'hashtag',
          name: `#${tags[i]}`,
          trendScore: Math.round(90 - i * 5 + Math.random() * 5),
          growthRate: Math.round(10 + Math.random() * 30),
          volume: Math.round(100_000 + Math.random() * 900_000),
          status: i < 3 ? 'peak' : 'rising',
          relatedTags: tags.filter((t) => t !== tags[i]).slice(0, 3),
          expiresAt,
        });
      }
    }

    if (include('topic')) {
      for (let i = 0; i < SEED_TOPICS.length; i++) {
        trends.push({
          platform,
          category: 'topic',
          name: SEED_TOPICS[i],
          trendScore: Math.round(85 - i * 4 + Math.random() * 5),
          growthRate: Math.round(5 + Math.random() * 25),
          volume: Math.round(10_000 + Math.random() * 90_000),
          status: i < 2 ? 'peak' : 'rising',
          expiresAt,
        });
      }
    }

    if (include('format')) {
      for (let i = 0; i < SEED_FORMATS.length; i++) {
        trends.push({
          platform,
          category: 'format',
          name: SEED_FORMATS[i],
          trendScore: Math.round(80 - i * 7 + Math.random() * 5),
          growthRate: Math.round(5 + Math.random() * 20),
          volume: 0,
          status: i < 2 ? 'peak' : 'rising',
          expiresAt,
        });
      }
    }

    if (include('keyword')) {
      for (let i = 0; i < SEED_KEYWORDS.length; i++) {
        trends.push({
          platform,
          category: 'keyword',
          name: SEED_KEYWORDS[i],
          trendScore: Math.round(75 - i * 5 + Math.random() * 5),
          growthRate: Math.round(5 + Math.random() * 15),
          volume: Math.round(5_000 + Math.random() * 50_000),
          status: 'rising',
          expiresAt,
        });
      }
    }

    if (include('challenge')) {
      for (let i = 0; i < SEED_CHALLENGES.length; i++) {
        trends.push({
          platform,
          category: 'challenge',
          name: SEED_CHALLENGES[i],
          trendScore: Math.round(70 - i * 8 + Math.random() * 5),
          growthRate: Math.round(15 + Math.random() * 25),
          volume: Math.round(1_000 + Math.random() * 20_000),
          status: 'rising',
          expiresAt,
        });
      }
    }

    return trends;
  }
}

export default new TrendCollector();
