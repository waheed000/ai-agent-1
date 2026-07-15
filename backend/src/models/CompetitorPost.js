import mongoose from 'mongoose';
import { defaultSchemaOptions, engagementSchema, CONTENT_FORMATS } from './utils/schemaUtils.js';

const { Schema } = mongoose;

const competitorPostSchema = new Schema(
  {
    competitor: {
      type: Schema.Types.ObjectId,
      ref: 'Competitor',
      required: true,
      index: true,
    },
    trackedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    platformPostId: {
      type: String,
      required: true,
    },
    format: {
      type: String,
      enum: { values: CONTENT_FORMATS, message: 'Invalid format: {VALUE}' },
      default: 'other',
    },
    caption: { type: String, maxlength: 5000 },
    hashtags: { type: [String], default: [] },
    postUrl: String,
    thumbnailUrl: String,
    publishedAt: { type: Date, index: true },
    engagement: engagementSchema,
    engagementRate: { type: Number, default: 0 },

    // AI-extracted insights
    aiTopics: { type: [String], default: [] },
    aiSentiment: {
      type: String,
      enum: { values: ['positive', 'negative', 'neutral', null], message: 'Invalid sentiment' },
      default: null,
    },
    isViral: { type: Boolean, default: false },
  },
  defaultSchemaOptions
);

competitorPostSchema.index({ competitor: 1, publishedAt: -1 });
competitorPostSchema.index({ platformPostId: 1, competitor: 1 }, { unique: true });
competitorPostSchema.index({ engagementRate: -1 });

const CompetitorPost = mongoose.model('CompetitorPost', competitorPostSchema);
export default CompetitorPost;
