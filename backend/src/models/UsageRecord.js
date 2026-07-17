/**
 * UsageRecord model
 * Tracks per-user, per-workspace usage across all feature categories.
 * Historical — never deleted.
 */
import mongoose from 'mongoose';
import { defaultSchemaOptions } from './utils/schemaUtils.js';

const { Schema } = mongoose;

export const USAGE_CATEGORIES = [
  'ai_request',
  'report',
  'notification',
  'planner',
  'competitor',
  'analytics',
  'queue_job',
];

const usageRecordSchema = new Schema(
  {
    user:      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', default: null },
    category:  { type: String, enum: USAGE_CATEGORIES, required: true, index: true },
    action:    { type: String, required: true },
    count:     { type: Number, default: 1, min: 1 },
    metadata:  { type: Schema.Types.Mixed, default: {} },
    recordedAt:{ type: Date, default: Date.now, index: true },
  },
  defaultSchemaOptions
);

usageRecordSchema.index({ user: 1, category: 1, recordedAt: -1 });
usageRecordSchema.index({ workspace: 1, category: 1, recordedAt: -1 });

const UsageRecord = mongoose.model('UsageRecord', usageRecordSchema);
export default UsageRecord;
