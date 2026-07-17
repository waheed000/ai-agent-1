/**
 * Draft model
 * Content drafts created by the creator (or AI).
 * Linked to a ContentPlan item but can also exist independently.
 */
import mongoose from 'mongoose';
import { defaultSchemaOptions, softDeletePlugin, PLATFORMS, CONTENT_FORMATS } from './utils/schemaUtils.js';

const { Schema } = mongoose;

export const DRAFT_STATUSES = ['draft', 'review', 'approved', 'scheduled', 'published', 'archived'];

const draftSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  contentPlan: { type: Schema.Types.ObjectId, ref: 'ContentPlan', default: null },
  platform: { type: String, enum: { values: PLATFORMS, message: 'Invalid platform: {VALUE}' } },
  contentType: { type: String, enum: { values: CONTENT_FORMATS, message: 'Invalid format: {VALUE}' } },

  title: { type: String, required: true, trim: true, maxlength: 300 },
  caption: { type: String, maxlength: 5000 },
  body: { type: String, maxlength: 20000 },    // for long-form content
  hashtags: { type: [String], default: [] },
  keywords: { type: [String], default: [] },
  mediaUrls: { type: [String], default: [] },
  thumbnailUrl: String,

  status: {
    type: String,
    enum: { values: DRAFT_STATUSES, message: 'Invalid status: {VALUE}' },
    default: 'draft',
    index: true,
  },

  versionNumber: { type: Number, default: 1 },
  previousVersion: { type: Schema.Types.ObjectId, ref: 'Draft', default: null },

  aiGenerated: { type: Boolean, default: false },
  aiNotes: String,

  reviewNotes: String,
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: Date,

  scheduledAt: Date,
  publishedAt: Date,
  platformPostId: String,
  publishError: String,
}, defaultSchemaOptions);

draftSchema.index({ user: 1, createdAt: -1 });
draftSchema.index({ user: 1, status: 1 });
draftSchema.index({ contentPlan: 1 });

draftSchema.plugin(softDeletePlugin);

const Draft = mongoose.model('Draft', draftSchema);
export default Draft;
