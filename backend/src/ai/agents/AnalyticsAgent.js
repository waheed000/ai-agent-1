/**
 * AnalyticsAgent
 * Interprets pre-calculated analytics metrics using an LLM.
 * NEVER calculates metrics — receives Analytics Engine output only.
 *
 * Output: { explanation, strengths, weaknesses, recommendations }
 */

import PromptBuilder from '../PromptBuilder.js';
import { parseAgentJSON as _parseJSON } from '../agentUtils.js';
import logger from '../../utils/logger.js';

export class AnalyticsAgent {
  get agentName() { return 'analytics'; }

  /**
   * @param {object} provider   - AIProvider instance
   * @param {object} context    - built by ContextBuilder.buildAnalyticsContext()
   * @param {object} [creatorMeta]  - { handle, platform, startDate, endDate }
   * @returns {Promise<object>}
   */
  async run(provider, context, creatorMeta = {}) {
    const { handle = 'Creator', platform = 'all', startDate = '', endDate = '' } = creatorMeta;

    if (!context) {
      logger.warn('AnalyticsAgent: no context provided');
      return this._fallback('No analytics data available for this period.');
    }

    const { userPrompt, systemPrompt } = PromptBuilder.build('analytics', {
      CREATOR_HANDLE: handle,
      PLATFORM: platform,
      START_DATE: startDate,
      END_DATE: endDate,
      ENGAGEMENT_SUMMARY: PromptBuilder.toReadableList(context.engagement?.summary || {}),
      GROWTH_SUMMARY: PromptBuilder.toReadableList(context.growth?.summary || {}),
      TOP_CONTENT: PromptBuilder.toReadableList(context.contentPerformance?.topContent || []),
      CONSISTENCY_SCORE: context.contentPerformance?.summary?.consistencyScore ?? 'N/A',
    });

    try {
      const response = await provider.generate(userPrompt, {
        systemPrompt,
        maxTokens: 1024,
        temperature: 0.5,
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
      logger.error('AnalyticsAgent.run failed', { error: err.message });
      throw err;
    }
  }

  _fallback(message) {
    return {
      explanation: message,
      strengths: [],
      weaknesses: [],
      recommendations: [],
    };
  }
}
