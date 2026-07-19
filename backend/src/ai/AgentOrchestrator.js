/**
 * AgentOrchestrator
 * Coordinates multi-agent execution runs.
 *
 * Responsibilities:
 * - Select and initialise the AI provider (preference order: env-configured primary → fallback)
 * - Build context for each agent via ContextBuilder
 * - Run agents in the correct sequence (independent agents run in parallel)
 * - Record every execution in AiExecution (via MemoryService)
 * - Emit events on completion
 *
 * Sequence:
 * 1. AnalyticsAgent, ContentAgent, TrendAgent, CompetitorAgent — parallel
 * 2. GrowthCoachAgent — depends on outputs from step 1
 */

import { GeminiProvider } from '../providers/GeminiProvider.js';
import { OpenAIProvider } from '../providers/OpenAIProvider.js';
import { AgentRegistry } from './AgentRegistry.js';
import ContextBuilder from './ContextBuilder.js';
import MemoryService from './MemoryService.js';
import eventBus from '../events/eventBus.js';
import { EVENT_TYPES } from '../events/eventTypes.js';
import logger from '../utils/logger.js';

class AgentOrchestrator {
  constructor() {
    this._providers = [
      new GeminiProvider(),
      new OpenAIProvider(),
    ];
  }

  /**
   * Pick the first available provider.
   * @returns {import('../providers/AIProvider.js').AIProvider}
   */
  _selectProvider() {
    const available = this._providers.filter((p) => p.isAvailable());
    if (available.length === 0) {
      throw new Error(
        'No AI provider is configured. Set GEMINI_API_KEY or OPENAI_API_KEY.'
      );
    }
    return available[0];
  }

  /**
   * Run the full multi-agent pipeline for a user.
   *
   * @param {string} userId
   * @param {object} [opts]
   * @param {string} [opts.platform]
   * @param {string} [opts.startDate]
   * @param {string} [opts.endDate]
   * @param {object} [opts.creatorMeta]   - { handle, niche }
   * @param {string[]} [opts.agentsToRun] - subset of agents; omit to run all
   * @returns {Promise<object>}  { analytics?, content?, trend?, competitor?, growthCoach? }
   */
  async runFullPipeline(userId, opts = {}) {
    const {
      platform,
      startDate,
      endDate,
      creatorMeta = {},
      agentsToRun = ['analytics', 'content', 'trend', 'competitor', 'growthCoach'],
    } = opts;

    logger.info('AgentOrchestrator: starting pipeline', { userId, agentsToRun });

    const provider = this._selectProvider();
    const results = {};

    // ── Step 1: parallel agents ───────────────────────────────────────────
    const parallelAgents = ['analytics', 'content', 'trend', 'competitor'].filter(
      (a) => agentsToRun.includes(a)
    );

    await Promise.allSettled(
      parallelAgents.map(async (agentName) => {
        try {
          const context = await this._buildContext(agentName, userId, {
            platform, startDate, endDate,
          });

          const result = await MemoryService.runWithMemory(
            userId,
            agentName,
            provider,
            context,
            creatorMeta
          );

          results[agentName] = result;
        } catch (err) {
          logger.error(`AgentOrchestrator: agent "${agentName}" failed`, {
            error: err.message,
          });
          results[agentName] = null;
        }
      })
    );

    // ── Step 2: GrowthCoachAgent (depends on step 1 outputs) ─────────────
    if (agentsToRun.includes('growthCoach')) {
      try {
        const growthAgent = AgentRegistry.get('growthCoach');
        const performanceSummary = await this._buildPerformanceSummary(userId, { platform });

        const growthResult = await MemoryService.runWithMemory(
          userId,
          'growthCoach',
          provider,
          results,            // pass all previous outputs as context
          { ...creatorMeta, performanceSummary }
        );

        results.growthCoach = growthResult;

        eventBus.emit(EVENT_TYPES.GROWTH_PLAN_GENERATED, {
          userId,
          plan: growthResult,
        });
      } catch (err) {
        logger.error('AgentOrchestrator: GrowthCoachAgent failed', { error: err.message });
        results.growthCoach = null;
      }
    }

    eventBus.emit(EVENT_TYPES.AI_REPORT_GENERATED, { userId, results });

    logger.info('AgentOrchestrator: pipeline complete', {
      userId,
      agentsRun: Object.keys(results),
      successful: Object.values(results).filter(Boolean).length,
    });

    return results;
  }

  /**
   * Run a single named agent.
   *
   * @param {string} agentName
   * @param {string} userId
   * @param {object} [opts]
   * @returns {Promise<object>}
   */
  async runSingleAgent(agentName, userId, opts = {}) {
    if (!AgentRegistry.has(agentName)) {
      throw new Error(`Unknown agent: "${agentName}"`);
    }

    const provider = this._selectProvider();
    const { platform, startDate, endDate, creatorMeta = {} } = opts;
    const context = await this._buildContext(agentName, userId, { platform, startDate, endDate });

    return MemoryService.runWithMemory(userId, agentName, provider, context, creatorMeta);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  async _buildContext(agentName, userId, { platform, startDate, endDate }) {
    switch (agentName) {
      case 'analytics':
        return ContextBuilder.buildAnalyticsContext(userId, { platform, startDate, endDate });
      case 'content':
        return ContextBuilder.buildContentContext(userId, { platform, startDate, endDate });
      case 'trend':
        return ContextBuilder.buildTrendContext(platform);
      case 'competitor':
        return ContextBuilder.buildCompetitorContext(userId);
      case 'growthCoach':
        return ContextBuilder.buildGrowthCoachContext(userId, { platform, startDate, endDate });
      default:
        return null;
    }
  }

  async _buildPerformanceSummary(userId, { platform } = {}) {
    try {
      const overview = await (await import('../modules/analytics/AnalyticsService.js')).default
        .getOverview(userId, { platform });
      return {
        totalPosts: overview.engagement?.totalPosts || 0,
        avgEngagementRate: overview.engagement?.avgEngagementRate || 0,
        followerNet: overview.followers?.net || 0,
        followerGrowthRate: overview.followers?.growthRate || 0,
      };
    } catch {
      return {};
    }
  }
}

export default new AgentOrchestrator();
