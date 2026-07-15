import mongoose from 'mongoose';
import { defaultSchemaOptions, softDeletePlugin, PLATFORMS, CONTENT_FORMATS } from './utils/schemaUtils.js';

const { Schema } = mongoose;

const contentIdeaSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Content idea title is required'],
      trim: true,
      maxlength: [300, 'Title cannot exceed 300 characters'],
    },
    hook: {
      type: String,
      maxlength: [500, 'Hook cannot exceed 500 characters'],
    },
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    platform: {
      type: String,
      enum: { values: PLATFORMS, message: 'Invalid platform: {VALUE}' },
    },
    format: {
      type: String,
      enum: { values: CONTENT_FORMATS, message: 'Invalid format: {VALUE}' },
    },
    suggestedHashtags: { type: [String], default: [] },
    estimatedImpact: {
      type: String,
      enum: { values: ['low', 'medium', 'high', 'viral'], message: 'Invalid impact level: {VALUE}' },
      default: 'medium',
    },
    difficulty: {
      type: String,
      enum: { values: ['easy', 'medium', 'hard'], message: 'Invalid difficulty: {VALUE}' },
      default: 'medium',
    },
    aiGenerated: { type: Boolean, default: false },
    aiScore: { type: Number, min: 0, max: 100 },
    relatedTrend: { type: Schema.Types.ObjectId, ref: 'TrendData', default: null },

    status: {
      type: String,
      enum: { values: ['idea', 'in_progress', 'scheduled', 'published', 'archived'], message: 'Invalid status: {VALUE}' },
      default: 'idea',
      index: true,
    },
    savedAt: Date,
  },
  defaultSchemaOptions
);

contentIdeaSchema.index({ user: 1, status: 1 });
contentIdeaSchema.index({ user: 1, platform: 1 });
contentIdeaSchema.index({ user: 1, estimatedImpact: 1 });
contentIdeaSchema.index({ aiScore: -1 });

contentIdeaSchema.plugin(softDeletePlugin);

const ContentIdea = mongoose.model('ContentIdea', contentIdeaSchema);
export default ContentIdea;
