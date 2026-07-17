/**
 * ContentPlan model
 * Represents a single planned content item in a creator's content calendar.
 * Supports recurring content, series, and campaigns.
 */
import mongoose from 'mongoose';
import {
  defaultSchemaOptions,
  softDeletePlugin,
  PLATFORMS,
  CONTENT_FORMATS,
} from './utils/schemaUtils.js';

const { Schema } = mongoose;

export const PUBLISHING_STATUSES = ['draft', 'review', 'approved', 'scheduled', 'published', 'archived'];
export const CONTENT_PRIORITIES = ['high', 'medium', 'low'];
export const CONTENT_GOALS = ['brand_awareness', 'engagement', 'lead_generation', 'conversion', 'retention', 'education', 'entertainment'];

const contentPlanSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, maxlength: 300 },
  description: { type: String, maxlength: 2000 },
  platform: { type: String, enum: { values: PLATFORMS, message: 'Invalid platform: {VALUE}' }, required: true },
  contentType: { type: String, enum: { values: CONTENT_FORMATS, message: 'Invalid format: {VALUE}' } },
  suggestedTime: { type: Date, index: true },

  estimatedReach: { type: Number, default: 0 },
  estimatedEngagement: { type: Number, default: 0 },
  priority: { type: String, enum: CONTENT_PRIORITIES, default: 'medium' },
  goal: { type: String, enum: CONTENT_GOALS, default: 'engagement' },

  hashtags: { type: [String], default: [] },
  keywords: { type: [String], default: [] },
  aiCaption: { type: String, maxlength: 5000 },

  status: {
    type: String,
    enum: { values: PUBLISHING_STATUSES, message: 'Invalid status: {VALUE}' },
    default: 'draft',
    index: true,
  },

  // Recurring / series / campaign support
  isRecurring: { type: Boolean, default: false },
  recurringPattern: {
    frequency: { type: String, enum: ['daily', 'weekly', 'biweekly', 'monthly'] },
    daysOfWeek: [Number],       // 0=Sun, 1=Mon, ...
    endDate: Date,
  },
  seriesId: { type: Schema.Types.ObjectId, ref: 'ContentSeries', default: null },
  seriesPosition: Number,
  campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', default: null },
  campaignName: String,

  // Workflow / approval
  dependencies: [{ type: Schema.Types.ObjectId, ref: 'ContentPlan' }],
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: Date,
  rejectionReason: String,

  // Actual publish result
  publishedAt: Date,
  platformPostId: String,
  publishError: String,

  notes: { type: String, maxlength: 1000 },
}, defaultSchemaOptions);

contentPlanSchema.index({ user: 1, suggestedTime: 1 });
contentPlanSchema.index({ user: 1, status: 1 });
contentPlanSchema.index({ user: 1, platform: 1, suggestedTime: 1 });
contentPlanSchema.index({ campaignId: 1 });
contentPlanSchema.index({ seriesId: 1 });

contentPlanSchema.plugin(softDeletePlugin);

const ContentPlan = mongoose.model('ContentPlan', contentPlanSchema);
export default ContentPlan;
