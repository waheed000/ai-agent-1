/**
 * ContentAgent
 * Generates content ideas, caption hooks, series concepts, and posting improvements.
 * Input: recent posts, analytics, audience data.
 *
 * Output: { contentIdeas, captionIdeas, seriesIdeas, postingImprovements }
 */

import PromptBuilder from '../PromptBuilder.js';
import { parseAgentJSON as _parseJSON } from '../agentUtils.js';
import logger from '../../utils/logger.js';

export class ContentAgent {
  get agentName() { return 'content'; }

  /**
   * @param {object} provider
   * @param {object} context   - built by ContextBuilder.buildContentContext()
   * @param {object} [creatorMeta]  - { handle, platform, niche }
   * @returns {Promise<object>}
   */
  async run(provider, context, creatorMeta = {}) {
    const { handle = 'Creator', platform = 'all', niche = 'general content' } = creatorMeta;

    if (!context) {
      logger.warn('ContentAgent: no context provided');
      return this._fallback();
    }

    const engagementRate = context.topPosts?.[0]?.engagementRate ?? 'N/A';

    const { userPrompt, systemPrompt } = PromptBuilder.build('content', {
      CREATOR_HANDLE: handle,
      PLATFORM: platform,
      NICHE: niche,
      TOP_POSTS: PromptBuilder.truncateToTokens(
        PromptBuilder.toReadableList(context.topPosts || []), 400
      ),
      AUDIENCE_DEMO: PromptBuilder.toReadableList(context.audience?.demographics || {}),
      AVG_ENGAGEMENT_RATE: typeof engagementRate === 'number'
        ? engagementRate.toFixed(2)
        : engagementRate,
      BEST_HOURS: (context.bestTime?.bestHours || []).map((h) => `${h.hour}:00`).join(', ') || 'N/A',
      BEST_DAYS: (context.bestTime?.bestDays || []).map((d) => d.dayName).join(', ') || 'N/A',
    });

    try {
      const response = await provider.generate(userPrompt, {
        systemPrompt,
        maxTokens: 1500,
        temperature: 0.8,
      });

      const parsed = _parseJSON(response.text);

      return {
        ...parsed,
        _meta: {
          provider: response.provider,
          model: response.model,
          totalTokens: response.totalTokens,
          costUsd: response.costUsd,
          latencyMs: response.latencyMs,
        },
      };
    } catch (err) {
      logger.error('ContentAgent.run failed', { error: err.message });
      throw err;
    }
  }

  _fallback() {
    return {
      contentIdeas: [],
      captionIdeas: [],
      seriesIdeas: [],
      postingImprovements: ['Post consistently', 'Engage with comments', 'Use trending hashtags'],
    };
  }
}
