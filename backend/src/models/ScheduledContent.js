import mongoose from 'mongoose';
import { defaultSchemaOptions, softDeletePlugin, PLATFORMS, CONTENT_FORMATS } from './utils/schemaUtils.js';

const { Schema } = mongoose;

const scheduledContentSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    contentIdea: {
      type: Schema.Types.ObjectId,
      ref: 'ContentIdea',
      default: null,
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
    format: {
      type: String,
      enum: { values: CONTENT_FORMATS, message: 'Invalid format: {VALUE}' },
    },
    title: { type: String, trim: true, maxlength: 500 },
    caption: { type: String, maxlength: 5000 },
    hashtags: { type: [String], default: [] },
    mediaUrls: { type: [String], default: [] },

    scheduledAt: {
      type: Date,
      required: [true, 'Scheduled date and time is required'],
      index: true,
    },
    publishedAt: { type: Date, default: null },
    platformPostId: { type: String, default: null },
    publishError: { type: String, default: null },
    retryCount: { type: Number, default: 0, min: 0 },

    status: {
      type: String,
      enum: {
        values: ['draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled'],
        message: 'Invalid status: {VALUE}',
      },
      default: 'draft',
      index: true,
    },
  },
  defaultSchemaOptions
);

scheduledContentSchema.index({ user: 1, scheduledAt: 1 });
scheduledContentSchema.index({ user: 1, status: 1 });
scheduledContentSchema.index({ status: 1, scheduledAt: 1 }); // for the publisher job

scheduledContentSchema.plugin(softDeletePlugin);

const ScheduledContent = mongoose.model('ScheduledContent', scheduledContentSchema);
export default ScheduledContent;
