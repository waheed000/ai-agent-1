import mongoose from 'mongoose';
import { defaultSchemaOptions, PLATFORMS } from './utils/schemaUtils.js';

const { Schema } = mongoose;

const distributionItemSchema = new Schema(
  { label: String, value: Number, percentage: Number },
  { _id: false }
);

/**
 * Audience demographic snapshot per platform per day.
 */
const audienceAnalyticsSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    connectedAccount: {
      type: Schema.Types.ObjectId,
      ref: 'ConnectedAccount',
      required: true,
    },
    platform: {
      type: String,
      enum: { values: PLATFORMS, message: 'Invalid platform: {VALUE}' },
      required: true,
    },
    snapshotDate: {
      type: Date,
      required: true,
    },
    totalFollowers: { type: Number, default: 0, min: 0 },
    totalFollowing: { type: Number, default: 0, min: 0 },

    demographics: {
      ageGroups: { type: [distributionItemSchema], default: [] },
      genders: { type: [distributionItemSchema], default: [] },
      countries: { type: [distributionItemSchema], default: [] },
      cities: { type: [distributionItemSchema], default: [] },
      languages: { type: [distributionItemSchema], default: [] },
    },

    topPostingHours: { type: [Number], default: [] },   // 0-23
    topPostingDays: { type: [Number], default: [] },    // 0-6 (Sun-Sat)

    audienceGrowthRate: { type: Number, default: 0 },  // % over period
  },
  defaultSchemaOptions
);

audienceAnalyticsSchema.index({ user: 1, platform: 1, snapshotDate: -1 }, { unique: true });

const AudienceAnalytics = mongoose.model('AudienceAnalytics', audienceAnalyticsSchema);
export default AudienceAnalytics;
