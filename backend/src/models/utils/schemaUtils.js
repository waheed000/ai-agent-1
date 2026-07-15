/**
 * Reusable Mongoose schema utilities and shared field definitions.
 * Import these into individual model files to keep schemas DRY.
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

// ─── Shared field definitions ─────────────────────────────────────────────────

/** Standard soft-delete fields added to every schema. */
export const softDeleteFields = {
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
};

/** Reusable platform enum — used across multiple models. */
export const PLATFORMS = ['instagram', 'youtube', 'tiktok', 'twitter', 'linkedin', 'facebook', 'pinterest', 'other'];

/** Reusable subscription plan enum. */
export const SUBSCRIPTION_PLANS = ['free', 'creator', 'pro', 'agency'];

/** Reusable content format enum. */
export const CONTENT_FORMATS = ['short_video', 'long_video', 'image', 'carousel', 'story', 'reel', 'podcast', 'article', 'thread', 'other'];

// ─── Reusable sub-schemas ─────────────────────────────────────────────────────

/** Engagement metrics sub-schema (reused in Post, CompetitorPost, etc.). */
export const engagementSchema = new Schema(
  {
    likes: { type: Number, default: 0, min: 0 },
    comments: { type: Number, default: 0, min: 0 },
    shares: { type: Number, default: 0, min: 0 },
    saves: { type: Number, default: 0, min: 0 },
    views: { type: Number, default: 0, min: 0 },
    reach: { type: Number, default: 0, min: 0 },
    impressions: { type: Number, default: 0, min: 0 },
    clicks: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

/** Date-range sub-schema. */
export const dateRangeSchema = new Schema(
  {
    from: { type: Date, required: true },
    to: { type: Date, required: true },
  },
  { _id: false }
);

// ─── Schema plugin: soft delete ───────────────────────────────────────────────

/**
 * Apply this plugin to any schema to get softDelete() and restore() methods
 * and automatic scoping of default queries to non-deleted documents.
 */
export function softDeletePlugin(schema) {
  schema.add(softDeleteFields);

  schema.methods.softDelete = async function () {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return this.save();
  };

  schema.methods.restore = async function () {
    this.isDeleted = false;
    this.deletedAt = null;
    return this.save();
  };

  // Add a named scope helper for filtering
  schema.statics.notDeleted = function () {
    return this.where({ isDeleted: false });
  };
}

// ─── Schema options preset ────────────────────────────────────────────────────

/** Standard schema options applied to all models. */
export const defaultSchemaOptions = {
  timestamps: true,       // adds createdAt / updatedAt
  versionKey: false,      // remove __v
  toJSON: {
    virtuals: true,
    transform(_doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      return ret;
    },
  },
  toObject: { virtuals: true },
};
