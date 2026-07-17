/**
 * Report model
 * Stores the full generated report (weekly/monthly/quarterly/yearly).
 * Reports are immutable once created — never overwrite, always append.
 */
import mongoose from 'mongoose';
import { defaultSchemaOptions, softDeletePlugin, PLATFORMS } from './utils/schemaUtils.js';

const { Schema } = mongoose;

const kpiSchema = new Schema({
  metric: String,
  current: Schema.Types.Mixed,
  target: Schema.Types.Mixed,
  unit: String,
  status: { type: String, enum: ['on_track', 'at_risk', 'off_track'], default: 'on_track' },
}, { _id: false });

const reportSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: { values: ['weekly', 'monthly', 'quarterly', 'yearly', 'custom'], message: 'Invalid type: {VALUE}' },
    required: true,
  },
  period: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  platforms: { type: [String], enum: PLATFORMS, default: [] },
  title: { type: String, required: true, maxlength: 200 },

  // ── Sections ──────────────────────────────────────────────────
  executiveSummary: { type: String, maxlength: 5000 },

  growthMetrics: {
    followersGained: { type: Number, default: 0 },
    followersLost: { type: Number, default: 0 },
    netGrowth: { type: Number, default: 0 },
    growthRate: { type: Number, default: 0 },
    totalReach: { type: Number, default: 0 },
    totalImpressions: { type: Number, default: 0 },
    byPlatform: { type: Schema.Types.Mixed, default: {} },
  },

  engagementMetrics: {
    avgEngagementRate: { type: Number, default: 0 },
    totalEngagements: { type: Number, default: 0 },
    totalLikes: { type: Number, default: 0 },
    totalComments: { type: Number, default: 0 },
    totalShares: { type: Number, default: 0 },
    byPlatform: { type: Schema.Types.Mixed, default: {} },
  },

  contentPerformance: {
    postsPublished: { type: Number, default: 0 },
    topPerformingFormat: String,
    topPerformingPlatform: String,
    topPosts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
    avgPostsPerWeek: { type: Number, default: 0 },
    consistencyScore: { type: Number, min: 0, max: 100 },
  },

  competitorComparison: {
    summary: String,
    competitorCount: { type: Number, default: 0 },
    relativeGrowthRate: String,  // e.g. "+2% above average"
    contentGaps: [String],
    advantages: [String],
  },

  trendSummary: {
    summary: String,
    risingTrends: [String],
    relevantHashtags: [String],
    missedOpportunities: [String],
  },

  aiInsights: {
    narrative: { type: String, maxlength: 10000 },
    strengths: [String],
    weaknesses: [String],
    recommendations: [String],
    opportunities: [String],
  },

  kpis: { type: [kpiSchema], default: [] },
  priorityScore: { type: Number, min: 0, max: 100, default: 0 },
  nextWeekGoals: [String],

  status: {
    type: String,
    enum: { values: ['generating', 'ready', 'failed'], message: 'Invalid status: {VALUE}' },
    default: 'generating',
    index: true,
  },
  generatedAt: Date,
  failReason: String,
}, defaultSchemaOptions);

reportSchema.index({ user: 1, createdAt: -1 });
reportSchema.index({ user: 1, type: 1, createdAt: -1 });

reportSchema.plugin(softDeletePlugin);

const Report = mongoose.model('Report', reportSchema);
export default Report;
