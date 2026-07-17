/**
 * TrendAgent
 * Maps trending data to a creator's niche and formats it into actionable insights.
 * Input: Trend Engine output + creator niche.
 *
 * Output: { relevantTopics, trendingHashtags, trendingFormats, trendAlert }
 */

import PromptBuilder from '../PromptBuilder.js';
import { parseAgentJSON as _parseJSON } from '../agentUtils.js';
import logger from '../../utils/logger.js';

export class TrendAgent {
  get agentName() { return 'trend'; }

  /**
   * @param {object} provider
   * @param {object} context   - built by ContextBuilder.buildTrendContext()
   * @param {object} [creatorMeta]  - { platform, niche }
   * @returns {Promise<object>}
   */
  async run(provider, context, creatorMeta = {}) {
    const { platform = 'all', niche = 'general content' } = creatorMeta;

    if (!context || (!context.topics?.length && !context.hashtags?.length)) {
      logger.warn('TrendAgent: no trend data available');
      return this._fallback();
    }

    const trendData = {
      topics: context.topics?.slice(0, 10) || [],
      hashtags: context.hashtags?.slice(0, 20) || [],
      formats: context.formats?.slice(0, 5) || [],
      highVelocity: context.highVelocity?.slice(0, 3) || [],
    };

    const { userPrompt, systemPrompt } = PromptBuilder.build('trend', {
      NICHE: niche,
      PLATFORM: platform,
      TREND_DATA: PromptBuilder.truncateToTokens(
        PromptBuilder.toReadableList(trendData), 600
      ),
    });

    try {
      const response = await provider.generate(userPrompt, {
        systemPrompt,
        maxTokens: 1200,
        temperature: 0.6,
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
      logger.error('TrendAgent.run failed', { error: err.message });
      throw err;
    }
  }

  _fallback() {
    return {
      relevantTopics: [],
      trendingHashtags: [],
      trendingFormats: [],
      trendAlert: 'No trend data available. Refresh trends to get current insights.',
    };
  }
}
