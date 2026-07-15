import mongoose from 'mongoose';
import { defaultSchemaOptions, PLATFORMS } from './utils/schemaUtils.js';

const { Schema } = mongoose;

const trendDataSchema = new Schema(
  {
    // null = global trend; set to a user ObjectId for personalised trends
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    platform: {
      type: String,
      enum: { values: [...PLATFORMS, 'all'], message: 'Invalid platform: {VALUE}' },
      default: 'all',
    },
    category: {
      type: String,
      enum: {
        values: ['topic', 'hashtag', 'audio', 'format', 'keyword', 'challenge', 'other'],
        message: 'Invalid category: {VALUE}',
      },
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Trend name is required'],
      trim: true,
    },
    description: { type: String, maxlength: 1000 },
    trendScore: { type: Number, min: 0, max: 100, default: 0 },
    growthRate: { type: Number, default: 0 },      // % increase in usage/volume
    volume: { type: Number, default: 0, min: 0 },  // post/usage count
    peakDate: Date,
    detectedAt: { type: Date, default: Date.now },
    expiresAt: Date,                               // estimated trend lifespan

    relatedTags: { type: [String], default: [] },
    aiContentIdea: { type: String, maxlength: 500 },

    status: {
      type: String,
      enum: { values: ['rising', 'peak', 'declining', 'expired'], message: 'Invalid status: {VALUE}' },
      default: 'rising',
      index: true,
    },
  },
  defaultSchemaOptions
);

trendDataSchema.index({ platform: 1, category: 1, status: 1 });
trendDataSchema.index({ trendScore: -1 });
trendDataSchema.index({ detectedAt: -1 });

const TrendData = mongoose.model('TrendData', trendDataSchema);
export default TrendData;
