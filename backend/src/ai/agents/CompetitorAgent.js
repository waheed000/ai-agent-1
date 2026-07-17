/**
 * CompetitorAgent
 * Analyses competitor intelligence data and surfaces content gaps,
 * missed opportunities, and competitive advantages.
 * Input: Competitor Intelligence Engine output.
 *
 * Output: { contentGaps, missedOpportunities, competitiveAdvantages, recommendations }
 */

import PromptBuilder from '../PromptBuilder.js';
import { parseAgentJSON as _parseJSON } from '../agentUtils.js';
import logger from '../../utils/logger.js';

export class CompetitorAgent {
  get agentName() { return 'competitor'; }

  /**
   * @param {object} provider
   * @param {object} context   - built by ContextBuilder.buildCompetitorContext()
   * @param {object} creatorContext  - { myMetrics, handle, niche }
   * @returns {Promise<object>}
   */
  async run(provider, context, creatorContext = {}) {
    const {
      handle = 'Creator',
      niche = 'general content',
      myMetrics = {},
    } = creatorContext;

    if (!context || !context.competitorCount) {
      logger.warn('CompetitorAgent: no competitor data available');
      return this._fallback();
    }

    const { userPrompt, systemPrompt } = PromptBuilder.build('competitor', {
      CREATOR_HANDLE: handle,
      NICHE: niche,
      MY_ENGAGEMENT: (myMetrics.avgEngagementRate ?? 'N/A').toString(),
      MY_FOLLOWERS: (myMetrics.totalFollowers ?? 'N/A').toString(),
      MY_FREQUENCY: (myMetrics.postFrequency ?? 'N/A').toString(),
      COMPETITOR_DATA: PromptBuilder.truncateToTokens(
        PromptBuilder.toReadableList(context.competitors || []), 600
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
      logger.error('CompetitorAgent.run failed', { error: err.message });
      throw err;
    }
  }

  _fallback() {
    return {
      contentGaps: [],
      missedOpportunities: [],
      competitiveAdvantages: ['No competitor data to compare against'],
      recommendations: ['Add competitors to track using POST /api/v1/competitors'],
    };
  }
}
