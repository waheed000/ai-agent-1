/**
 * AgentExecutionRepository
 * Wraps the existing AiExecution model for AI agent memory storage.
 * Every prompt+response is persisted here for audit, billing, and debugging.
 */

import AiExecution from '../../models/AiExecution.js';
import { DatabaseError } from '../../utils/errors.js';

// Map internal agent names → AiExecution.agentType enum
const AGENT_TYPE_MAP = {
  analytics: 'growth_analyst',
  content: 'content_strategist',
  trend: 'trend_analyzer',
  competitor: 'competitor_decoder',
  growthCoach: 'growth_coach',
  reportGenerator: 'report_generator',
  contentIdeas: 'content_idea_generator',
  contentAnalyzer: 'content_analyzer',
};

class AgentExecutionRepository {
  /**
   * Record the start of an AI execution.
   * @returns {Promise<AiExecution>}
   */
  async createPending(userId, { agentName, model, inputSummary, refModel, refId } = {}) {
    try {
      const agentType = AGENT_TYPE_MAP[agentName] || 'growth_analyst';
      return await AiExecution.create({
        user: userId,
        agentType,
        model,
        status: 'pending',
        inputSummary: inputSummary ? String(inputSummary).slice(0, 500) : null,
        refModel: refModel || null,
        refId: refId || null,
      });
    } catch (err) {
      throw new DatabaseError(`AgentExecutionRepository.createPending failed: ${err.message}`);
    }
  }

  /**
   * Mark an execution as completed with token usage and output.
   */
  async markCompleted(executionId, {
    promptTokens, completionTokens, totalTokens,
    estimatedCostUsd, latencyMs, outputSummary,
  } = {}) {
    try {
      return await AiExecution.findByIdAndUpdate(
        executionId,
        {
          $set: {
            status: 'completed',
            promptTokens: promptTokens || 0,
            completionTokens: completionTokens || 0,
            totalTokens: totalTokens || 0,
            estimatedCostUsd: estimatedCostUsd || 0,
            latencyMs: latencyMs || 0,
            outputSummary: outputSummary ? String(outputSummary).slice(0, 500) : null,
          },
        },
        { new: true, lean: true }
      );
    } catch (err) {
      throw new DatabaseError(`AgentExecutionRepository.markCompleted failed: ${err.message}`);
    }
  }

  /**
   * Mark an execution as failed.
   */
  async markFailed(executionId, errorMessage) {
    try {
      return await AiExecution.findByIdAndUpdate(
        executionId,
        { $set: { status: 'failed', errorMessage: String(errorMessage).slice(0, 500) } },
        { new: true, lean: true }
      );
    } catch (err) {
      throw new DatabaseError(`AgentExecutionRepository.markFailed failed: ${err.message}`);
    }
  }

  /**
   * Retrieve recent AI executions for a user.
   */
  async findRecent(userId, { agentType, limit = 20 } = {}) {
    try {
      const filter = {
        user: userId,
        ...(agentType && { agentType }),
      };
      return await AiExecution.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    } catch (err) {
      throw new DatabaseError(`AgentExecutionRepository.findRecent failed: ${err.message}`);
    }
  }

  /**
   * Aggregate total token usage and cost for a user.
   */
  async aggregateUsage(userId) {
    try {
      const [result] = await AiExecution.aggregate([
        { $match: { user: userId, status: 'completed' } },
        {
          $group: {
            _id: null,
            totalTokens: { $sum: '$totalTokens' },
            totalCostUsd: { $sum: '$estimatedCostUsd' },
            executionCount: { $sum: 1 },
          },
        },
      ]);
      return result || { totalTokens: 0, totalCostUsd: 0, executionCount: 0 };
    } catch (err) {
      throw new DatabaseError(`AgentExecutionRepository.aggregateUsage failed: ${err.message}`);
    }
  }
}

export default new AgentExecutionRepository();
