/**
 * Strategy model
 * Stores generated growth strategies (7-day, 30-day, 90-day).
 * Immutable once created.
 */
import mongoose from 'mongoose';
import { defaultSchemaOptions, softDeletePlugin, PLATFORMS } from './utils/schemaUtils.js';

const { Schema } = mongoose;

const dayPlanSchema = new Schema({
  day: Number,             // 1-based day number
  date: Date,
  focus: String,
  actions: [String],
  contentSuggestion: String,
  platform: String,
  estimatedTime: String,   // e.g. "30 min"
}, { _id: false });

const experimentSchema = new Schema({
  name: String,
  hypothesis: String,
  method: String,
  duration: String,
  successMetric: String,
  expectedLift: String,
}, { _id: false });

const checklistItemSchema = new Schema({
  action: String,
  category: { type: String, enum: ['content', 'engagement', 'growth', 'analytics', 'optimization'] },
  priority: { type: String, enum: ['high', 'medium', 'low'] },
  dueDay: Number,
  completed: { type: Boolean, default: false },
}, { _id: false });

const riskSchema = new Schema({
  risk: String,
  likelihood: { type: String, enum: ['high', 'medium', 'low'] },
  impact: { type: String, enum: ['high', 'medium', 'low'] },
  mitigation: String,
}, { _id: false });

const strategySchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  planType: {
    type: String,
    enum: { values: ['7day', '30day', '90day'], message: 'Invalid plan type: {VALUE}' },
    required: true,
  },
  platforms: { type: [String], enum: PLATFORMS, default: [] },
  title: { type: String, required: true, maxlength: 200 },

  overview: { type: String, maxlength: 3000 },
  dayPlan: { type: [dayPlanSchema], default: [] },
  weeklyMilestones: [String],
  growthExperiments: { type: [experimentSchema], default: [] },
  actionChecklist: { type: [checklistItemSchema], default: [] },
  riskAnalysis: { type: [riskSchema], default: [] },
  successProbability: { type: Number, min: 0, max: 100, default: 50 },
  primaryGoal: String,
  targetMetrics: { type: Schema.Types.Mixed, default: {} },

  status: {
    type: String,
    enum: { values: ['generating', 'ready', 'failed'], message: 'Invalid status: {VALUE}' },
    default: 'generating',
    index: true,
  },
  generatedAt: Date,
  failReason: String,
}, defaultSchemaOptions);

strategySchema.index({ user: 1, createdAt: -1 });
strategySchema.index({ user: 1, planType: 1, createdAt: -1 });

strategySchema.plugin(softDeletePlugin);

const Strategy = mongoose.model('Strategy', strategySchema);
export default Strategy;
