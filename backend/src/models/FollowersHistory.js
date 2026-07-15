import mongoose from 'mongoose';
import { defaultSchemaOptions, PLATFORMS } from './utils/schemaUtils.js';

const { Schema } = mongoose;

/**
 * Daily follower count snapshot per platform.
 * Designed for time-series charting — one document per user per platform per day.
 */
const followersHistorySchema = new Schema(
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
    date: {
      type: Date,
      required: true,
    },
    followers: { type: Number, required: true, min: 0 },
    following: { type: Number, default: 0, min: 0 },
    delta: { type: Number, default: 0 },          // followers gained/lost since previous snapshot
    deltaPercentage: { type: Number, default: 0 },
  },
  defaultSchemaOptions
);

followersHistorySchema.index({ user: 1, platform: 1, date: -1 }, { unique: true });
followersHistorySchema.index({ user: 1, date: -1 });

const FollowersHistory = mongoose.model('FollowersHistory', followersHistorySchema);
export default FollowersHistory;
