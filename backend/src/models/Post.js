import mongoose from 'mongoose';
import {
  defaultSchemaOptions,
  softDeletePlugin,
  engagementSchema,
  PLATFORMS,
  CONTENT_FORMATS,
} from './utils/schemaUtils.js';

const { Schema } = mongoose;

const postSchema = new Schema(
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
    platformPostId: {
      type: String,
      required: true,
    },
    format: {
      type: String,
      enum: { values: CONTENT_FORMATS, message: 'Invalid format: {VALUE}' },
      default: 'other',
    },
    title: {
      type: String,
      trim: true,
      maxlength: [500, 'Title cannot exceed 500 characters'],
    },
    caption: {
      type: String,
      maxlength: [5000, 'Caption cannot exceed 5000 characters'],
    },
    hashtags: { type: [String], default: [] },
    mentions: { type: [String], default: [] },
    mediaUrls: { type: [String], default: [] },
    thumbnailUrl: String,
    postUrl: String,
    publishedAt: { type: Date, index: true },
    durationSeconds: { type: Number, min: 0 }, // for video content

    engagement: engagementSchema,

    engagementRate: {
      type: Number,
      min: 0,
      default: 0,
    },

    status: {
      type: String,
      enum: { values: ['published', 'archived', 'deleted_on_platform'], message: 'Invalid status: {VALUE}' },
      default: 'published',
    },

    lastFetchedAt: { type: Date, default: null },
  },
  defaultSchemaOptions
);

postSchema.index({ user: 1, publishedAt: -1 });
postSchema.index({ user: 1, platform: 1 });
postSchema.index({ platformPostId: 1, platform: 1 }, { unique: true });
postSchema.index({ engagementRate: -1 });

postSchema.plugin(softDeletePlugin);

const Post = mongoose.model('Post', postSchema);
export default Post;
