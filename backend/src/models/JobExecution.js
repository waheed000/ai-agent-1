import mongoose from 'mongoose';
import { defaultSchemaOptions, PLATFORMS } from './utils/schemaUtils.js';

const { Schema } = mongoose;

/**
 * Records metadata for every background job execution.
 * Used for monitoring, debugging, and duplicate-job prevention.
 */
const jobExecutionSchema = new Schema(
  {
    jobId: {
      type: String,
      required: true,
      index: true,
    },
    queue: {
      type: String,
      enum: {
        values: ['socialSync', 'analytics', 'trend', 'report', 'notification'],
        message: 'Invalid queue: {VALUE}',
      },
      required: true,
      index: true,
    },
    jobName: {
      type: String,
      required: true,
      trim: true,
    },
    // Optional — not all jobs are user-specific (e.g. trend refresh)
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    platform: {
      type: String,
      enum: { values: [...PLATFORMS, null], message: 'Invalid platform: {VALUE}' },
      default: null,
    },

    status: {
      type: String,
      enum: {
        values: ['pending', 'running', 'completed', 'failed', 'retrying'],
        message: 'Invalid status: {VALUE}',
      },
      default: 'pending',
      index: true,
    },

    attemptNumber: { type: Number, default: 1, min: 1 },
    maxAttempts: { type: Number, default: 3, min: 1 },

    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    durationMs: { type: Number, default: null, min: 0 },

    // Records count updated by this job
    records: {
      type: Map,
      of: Number,
      default: {},
    },

    errorMessage: { type: String, default: null },
    errorCode: { type: String, default: null },

    // Loose bag for job-specific metadata
    meta: { type: Schema.Types.Mixed, default: null },
  },
  defaultSchemaOptions
);

jobExecutionSchema.index({ queue: 1, status: 1, createdAt: -1 });
jobExecutionSchema.index({ user: 1, platform: 1, queue: 1, createdAt: -1 });
// Fast lookup for duplicate prevention: active jobs per user+platform+queue
jobExecutionSchema.index(
  { user: 1, platform: 1, queue: 1, status: 1 },
  { partialFilterExpression: { status: { $in: ['pending', 'running'] } } }
);

const JobExecution = mongoose.model('JobExecution', jobExecutionSchema);
export default JobExecution;
