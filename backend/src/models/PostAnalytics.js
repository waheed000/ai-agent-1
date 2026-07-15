import mongoose from 'mongoose';
import { defaultSchemaOptions, engagementSchema } from './utils/schemaUtils.js';

const { Schema } = mongoose;

/**
 * Time-series analytics snapshot for a single post.
 * One document is stored per post per snapshot date (daily granularity).
 */
const postAnalyticsSchema = new Schema(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    snapshotDate: {
      type: Date,
      required: true,
    },
    engagement: engagementSchema,

    // Delta since last snapshot
    delta: {
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      saves: { type: Number, default: 0 },
      views: { type: Number, default: 0 },
    },

    engagementRate: { type: Number, default: 0 },
    watchTimeSeconds: { type: Number, default: 0 }, // video only
    averageViewDuration: { type: Number, default: 0 }, // video only
    clickThroughRate: { type: Number, default: 0 },
  },
  defaultSchemaOptions
);

postAnalyticsSchema.index({ post: 1, snapshotDate: -1 }, { unique: true });
postAnalyticsSchema.index({ user: 1, snapshotDate: -1 });

const PostAnalytics = mongoose.model('PostAnalytics', postAnalyticsSchema);
export default PostAnalytics;
