import mongoose from 'mongoose';
import { defaultSchemaOptions, softDeletePlugin, PLATFORMS } from './utils/schemaUtils.js';

const { Schema } = mongoose;

const competitorSchema = new Schema(
  {
    trackedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: { values: PLATFORMS, message: 'Invalid platform: {VALUE}' },
      required: true,
    },
    platformUserId: String,
    username: {
      type: String,
      required: [true, 'Competitor username is required'],
      trim: true,
    },
    displayName: String,
    profileUrl: String,
    avatarUrl: String,
    bio: String,
    niche: String,

    // Cached metrics (refreshed on sync)
    followerCount: { type: Number, default: 0, min: 0 },
    followingCount: { type: Number, default: 0, min: 0 },
    postCount: { type: Number, default: 0, min: 0 },
    avgEngagementRate: { type: Number, default: 0 },
    avgPostFrequency: { type: Number, default: 0 }, // posts per week

    status: {
      type: String,
      enum: { values: ['active', 'paused', 'not_found'], message: 'Invalid status: {VALUE}' },
      default: 'active',
    },
    lastSyncedAt: { type: Date, default: null },
    notes: { type: String, maxlength: 1000 },
  },
  defaultSchemaOptions
);

competitorSchema.index({ trackedBy: 1, platform: 1, username: 1 }, { unique: true });
competitorSchema.index({ trackedBy: 1, status: 1 });

competitorSchema.plugin(softDeletePlugin);

const Competitor = mongoose.model('Competitor', competitorSchema);
export default Competitor;
