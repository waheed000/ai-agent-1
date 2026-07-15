import mongoose from 'mongoose';
import { defaultSchemaOptions, softDeletePlugin, dateRangeSchema, PLATFORMS } from './utils/schemaUtils.js';

const { Schema } = mongoose;

const growthReportSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Report title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    type: {
      type: String,
      enum: { values: ['weekly', 'monthly', 'quarterly', 'custom'], message: 'Invalid type: {VALUE}' },
      required: true,
    },
    period: dateRangeSchema,
    platforms: { type: [String], enum: PLATFORMS, default: [] },

    summary: { type: String, maxlength: 5000 },
    aiNarrative: { type: String, maxlength: 10000 },

    metrics: {
      totalFollowersGained: { type: Number, default: 0 },
      totalReach: { type: Number, default: 0 },
      totalImpressions: { type: Number, default: 0 },
      totalEngagement: { type: Number, default: 0 },
      avgEngagementRate: { type: Number, default: 0 },
      postsPublished: { type: Number, default: 0 },
      topPerformingPlatform: String,
    },

    recommendations: { type: [String], default: [] },
    topPosts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],

    status: {
      type: String,
      enum: { values: ['generating', 'ready', 'failed'], message: 'Invalid status: {VALUE}' },
      default: 'generating',
    },
    generatedAt: Date,
  },
  defaultSchemaOptions
);

growthReportSchema.index({ user: 1, createdAt: -1 });
growthReportSchema.index({ user: 1, type: 1 });
growthReportSchema.index({ status: 1 });

growthReportSchema.plugin(softDeletePlugin);

const GrowthReport = mongoose.model('GrowthReport', growthReportSchema);
export default GrowthReport;
