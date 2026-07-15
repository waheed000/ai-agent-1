import mongoose from 'mongoose';
import { defaultSchemaOptions, softDeletePlugin, PLATFORMS } from './utils/schemaUtils.js';

const { Schema } = mongoose;

const connectedAccountSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: { values: PLATFORMS, message: 'Invalid platform: {VALUE}' },
      required: [true, 'Platform is required'],
    },
    platformUserId: {
      type: String,
      required: [true, 'Platform user ID is required'],
    },
    username: {
      type: String,
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    profileUrl: String,
    avatarUrl: String,

    // OAuth tokens — select: false keeps them off by default
    accessToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    tokenExpiresAt: { type: Date, select: false },
    scopes: { type: [String], default: [] },

    // Cached public metrics (refreshed on sync)
    followerCount: { type: Number, default: 0, min: 0 },
    followingCount: { type: Number, default: 0, min: 0 },
    postCount: { type: Number, default: 0, min: 0 },

    status: {
      type: String,
      enum: { values: ['active', 'expired', 'revoked', 'error'], message: 'Invalid status: {VALUE}' },
      default: 'active',
    },
    lastSyncedAt: { type: Date, default: null },
    syncError: { type: String, default: null },
  },
  defaultSchemaOptions
);

connectedAccountSchema.index({ user: 1, platform: 1 }, { unique: true });
connectedAccountSchema.index({ status: 1 });
connectedAccountSchema.index({ lastSyncedAt: 1 });

connectedAccountSchema.plugin(softDeletePlugin);

const ConnectedAccount = mongoose.model('ConnectedAccount', connectedAccountSchema);
export default ConnectedAccount;
