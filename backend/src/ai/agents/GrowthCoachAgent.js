/**
 * GrowthCoachAgent
 * Master agent that synthesises outputs from all other agents into a unified growth plan.
 * Runs after AnalyticsAgent, ContentAgent, TrendAgent, and CompetitorAgent have all executed.
 *
 * Output: { weeklyPlan, monthlyStrategy, actionItems, kpis, priorityTasks }
 */

import PromptBuilder from '../PromptBuilder.js';
import { parseAgentJSON as _parseJSON } from '../agentUtils.js';
import logger from '../../utils/logger.js';

export class GrowthCoachAgent {
  get agentName() { return 'growthCoach'; }

  /**
   * @param {object} provider
   * @param {object} agentOutputs  - { analytics, content, trend, competitor }
   * @param {object} creatorMeta   - { handle, platform, niche, performanceSummary }
   * @returns {Promise<object>}
   */
  async run(provider, agentOutputs = {}, creatorMeta = {}) {
    const {
      handle = 'Creator',
      platform = 'all',
      niche = 'general content',
      performanceSummary = {},
    } = creatorMeta;

    const { analytics = null, content = null, trend = null, competitor = null } = agentOutputs;

    const { userPrompt, systemPrompt } = PromptBuilder.build('growthCoach', {
      CREATOR_HANDLE: handle,
      PLATFORM: platform,
      NICHE: niche,
      ANALYTICS_INSIGHTS: analytics
        ? PromptBuilder.truncateToTokens(PromptBuilder.toReadableList(analytics), 300)
        : 'No analytics insights available.',
      CONTENT_INSIGHTS: content
        ? PromptBuilder.truncateToTokens(PromptBuilder.toReadableList(content), 300)
        : 'No content insights available.',
      TREND_INSIGHTS: trend
        ? PromptBuilder.truncateToTokens(PromptBuilder.toReadableList(trend), 300)
        : 'No trend insights available.',
      COMPETITOR_INSIGHTS: competitor
        ? PromptBuilder.truncateToTokens(PromptBuilder.toReadableList(competitor), 300)
        : 'No competitor data available.',
      PERFORMANCE_SUMMARY: PromptBuilder.toReadableList(performanceSummary),
    });

    try {
      const response = await provider.generate(userPrompt, {
        systemPrompt,
        maxTokens: 2000,
        temperature: 0.65,
      });

      const parsed = _parseJSON(response.text);

      return {
        ...parsed,
        generatedAt: new Date().toISOString(),
        _meta: {
          provider: response.provider,
          model: response.model,
          totalTokens: response.totalTokens,
          costUsd: response.costUsd,
          latencyMs: response.latencyMs,
        },
      };
    } catch (err) {
      logger.error('GrowthCoachAgent.run failed', { error: err.message });
      throw err;
    }
  }
}
