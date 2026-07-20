/**
 * MemoryService
 * Wraps AI agent execution in memory recording.
 *
 * Every time an agent runs, MemoryService:
 *  1. Creates a 'pending' AiExecution record (via AgentExecutionRepository)
 *  2. Runs the agent
 *  3. Marks the record 'completed' or 'failed' with full token + cost metadata
 *
 * This is the single layer responsible for all AI memory storage.
 * Agents never interact with AiExecution directly.
 */

import AgentExecutionRepository from '../modules/jobs/AgentExecutionRepository.js';
import { AgentRegistry } from '../ai/AgentRegistry.js';
import CacheService from '../infrastructure/cache/index.js';
import MetricsService from '../infrastructure/metrics/index.js';
import logger from '../utils/logger.js';

const CACHE_TTL_AI = 86_400; // 24 hours for AI response caching

class MemoryService {
  /**
   * Run a named agent with full memory recording and optional caching.
   *
   * @param {string} userId
   * @param {string} agentName
   * @param {object} provider     - AIProvider instance
   * @param {object} context      - agent-specific context object
   * @param {object} creatorMeta  - { handle, platform, niche, ... }
   * @param {boolean} [useCache=false]  whether to attempt cache-aside
   * @returns {Promise<object>}  agent output
   */
  async runWithMemory(userId, agentName, provider, context, creatorMeta = {}, useCache = false) {
    const agent = AgentRegistry.get(agentName);

    // Cache-aside (AI responses are expensive — reuse within TTL)
    if (useCache) {
      const cacheKey = _cacheKey(userId, agentName, creatorMeta);
      const cached = await CacheService.get('ai', cacheKey);
      if (cached) {
        logger.debug('MemoryService: cache hit', { agentName, userId });
        return cached;
      }
    }

    // Build a short input summary for the audit log
    const inputSummary = `Agent: ${agentName} | Platform: ${creatorMeta.platform || 'all'} | Niche: ${creatorMeta.niche || 'N/A'}`;

    // Create the pending execution record
    let execution = null;
    try {
      execution = await AgentExecutionRepository.createPending(userId, {
        agentName,
        model: provider.modelName,
        inputSummary,
      });
    } catch (err) {
      logger.warn('MemoryService: failed to create execution record', { error: err.message });
    }

    const startMs = Date.now();

    try {
      const output = await agent.run(provider, context, creatorMeta);

      const latencyMs = Date.now() - startMs;
      const meta = output?._meta || {};
      const outputSummary = _summariseOutput(agentName, output);

      // Persist completion
      if (execution) {
        await AgentExecutionRepository.markCompleted(execution._id, {
          promptTokens: meta.promptTokens || meta.totalTokens || 0,
          completionTokens: meta.completionTokens || 0,
          totalTokens: meta.totalTokens || 0,
          estimatedCostUsd: meta.costUsd || 0,
          latencyMs: meta.latencyMs || latencyMs,
          outputSummary,
        });
      }

      // Cache the result
      if (useCache) {
        const cacheKey = _cacheKey(userId, agentName, creatorMeta);
        await CacheService.set('ai', cacheKey, output, CACHE_TTL_AI);
      }

      MetricsService.recordAiCall({
        agent:      agentName,
        provider:   provider.modelName ?? provider.constructor?.name ?? 'unknown',
        durationMs: latencyMs,
        error:      false,
      });

      logger.info('MemoryService: agent run complete', {
        agentName,
        userId,
        latencyMs,
        totalTokens: meta.totalTokens,
        costUsd: meta.costUsd,
      });

      return output;
    } catch (err) {
      MetricsService.recordAiCall({
        agent:      agentName,
        provider:   provider.modelName ?? provider.constructor?.name ?? 'unknown',
        durationMs: Date.now() - startMs,
        error:      true,
      });
      if (execution) {
        await AgentExecutionRepository.markFailed(execution._id, err.message);
      }
      logger.error('MemoryService: agent run failed', { agentName, userId, error: err.message });
      throw err;
    }
  }

  /**
   * Retrieve recent AI execution history for a user.
   */
  async getHistory(userId, { agentType, limit = 20 } = {}) {
    return AgentExecutionRepository.findRecent(userId, { agentType, limit });
  }

  /**
   * Aggregate total AI usage for a user.
   */
  async getUsage(userId) {
    return AgentExecutionRepository.aggregateUsage(userId);
  }

  /**
   * Invalidate cached AI results for a user.
   */
  async invalidateCache(userId) {
    await CacheService.delPattern('ai', userId);
  }
}

function _cacheKey(userId, agentName, meta) {
  const parts = [userId, agentName, meta.platform || 'all', meta.niche || 'none'];
  return parts.join(':');
}

function _summariseOutput(agentName, output) {
  if (!output) return null;
  try {
    const keys = Object.keys(output).filter((k) => k !== '_meta');
    return `${agentName}: ${keys.join(', ')} (${keys.length} sections)`;
  } catch {
    return agentName;
  }
}

export default new MemoryService();
