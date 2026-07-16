import mongoose from 'mongoose';
import { defaultSchemaOptions, softDeletePlugin, PLATFORMS } from './utils/schemaUtils.js';

const { Schema } = mongoose;

const creatorProfileSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // unique implies an index; no separate index: true needed
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [100, 'Display name cannot exceed 100 characters'],
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    niche: {
      type: String,
      trim: true,
      maxlength: [100, 'Niche cannot exceed 100 characters'],
    },
    primaryPlatform: {
      type: String,
      enum: { values: PLATFORMS, message: 'Invalid platform: {VALUE}' },
    },
    location: {
      country: String,
      city: String,
      timezone: { type: String, default: 'UTC' },
    },
    website: {
      type: String,
      match: [/^https?:\/\/.+/, 'Website must be a valid URL'],
    },
    contentLanguage: {
      type: String,
      default: 'en',
    },
    targetAudienceAge: {
      min: { type: Number, min: 13, max: 100 },
      max: { type: Number, min: 13, max: 100 },
    },
    contentGoals: {
      type: [String],
      default: [],
    },
    growthScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    experienceLevel: {
      type: String,
      enum: {
        values: ['beginner', 'intermediate', 'advanced', 'professional'],
        message: 'Invalid experience level: {VALUE}',
      },
      default: null,
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
  },
  defaultSchemaOptions
);

// user unique index already created by unique: true on the field
creatorProfileSchema.index({ primaryPlatform: 1 });
creatorProfileSchema.index({ growthScore: -1 });

creatorProfileSchema.plugin(softDeletePlugin);

const CreatorProfile = mongoose.model('CreatorProfile', creatorProfileSchema);
export default CreatorProfile;
