import mongoose from 'mongoose';
import { defaultSchemaOptions, softDeletePlugin, PLATFORMS, CONTENT_FORMATS } from './utils/schemaUtils.js';

const { Schema } = mongoose;

const planItemSchema = new Schema(
  {
    dayOfWeek: { type: Number, min: 0, max: 6, required: true }, // 0=Sun … 6=Sat
    scheduledTime: String,  // "HH:MM" in user's timezone
    platform: { type: String, enum: PLATFORMS },
    format: { type: String, enum: CONTENT_FORMATS },
    topic: String,
    hook: String,
    notes: String,
    contentIdea: { type: Schema.Types.ObjectId, ref: 'ContentIdea', default: null },
    completed: { type: Boolean, default: false },
    completedAt: Date,
  },
  { _id: true }
);

const weeklyPlanSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    weekStartDate: {
      type: Date,
      required: true,
    },
    weekEndDate: {
      type: Date,
      required: true,
    },
    items: { type: [planItemSchema], default: [] },
    aiGenerated: { type: Boolean, default: false },
    aiRationale: { type: String, maxlength: 2000 },
    status: {
      type: String,
      enum: { values: ['draft', 'active', 'completed', 'archived'], message: 'Invalid status: {VALUE}' },
      default: 'draft',
    },
    completionRate: { type: Number, min: 0, max: 100, default: 0 },
  },
  defaultSchemaOptions
);

weeklyPlanSchema.index({ user: 1, weekStartDate: -1 }, { unique: true });
weeklyPlanSchema.index({ user: 1, status: 1 });

weeklyPlanSchema.plugin(softDeletePlugin);

const WeeklyPlan = mongoose.model('WeeklyPlan', weeklyPlanSchema);
export default WeeklyPlan;
