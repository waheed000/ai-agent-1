import mongoose from 'mongoose';
import { defaultSchemaOptions } from './utils/schemaUtils.js';

const { Schema } = mongoose;

/**
 * Audit log for every AI operation.
 * Records input, output, cost, and latency for billing, debugging, and abuse prevention.
 */
const aiExecutionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    agentType: {
      type: String,
      enum: {
        values: [
          'growth_analyst',
          'content_strategist',
          'growth_coach',
          'trend_analyzer',
          'competitor_decoder',
          'report_generator',
          'content_idea_generator',
          'content_analyzer',
        ],
        message: 'Invalid agent type: {VALUE}',
      },
      required: true,
      index: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    promptTokens: { type: Number, default: 0, min: 0 },
    completionTokens: { type: Number, default: 0, min: 0 },
    totalTokens: { type: Number, default: 0, min: 0 },
    estimatedCostUsd: { type: Number, default: 0, min: 0 },
    latencyMs: { type: Number, default: 0, min: 0 },

    // Serialized input/output — intentionally loose to support any AI use case
    inputSummary: { type: String, maxlength: 500 },
    outputSummary: { type: String, maxlength: 500 },

    // Optional link to the entity this execution produced or enriched
    refModel: {
      type: String,
      enum: ['GrowthReport', 'WeeklyPlan', 'ContentIdea', 'TrendData', null],
      default: null,
    },
    refId: { type: Schema.Types.ObjectId, default: null },

    status: {
      type: String,
      enum: { values: ['pending', 'completed', 'failed'], message: 'Invalid status: {VALUE}' },
      default: 'pending',
      index: true,
    },
    errorMessage: { type: String, default: null },
  },
  defaultSchemaOptions
);

aiExecutionSchema.index({ user: 1, createdAt: -1 });
aiExecutionSchema.index({ user: 1, agentType: 1 });
aiExecutionSchema.index({ status: 1 });

const AiExecution = mongoose.model('AiExecution', aiExecutionSchema);
export default AiExecution;
