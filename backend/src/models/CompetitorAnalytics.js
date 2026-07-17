/**
 * CompetitorAnalytics — daily snapshot of a competitor's key metrics.
 * Snapshots are NEVER overwritten; a new document is created each time.
 * This enables trend analysis and comparison history over time.
 */

import mongoose from 'mongoose';
import { defaultSchemaOptions } from './utils/schemaUtils.js';

const { Schema } = mongoose;

const competitorAnalyticsSchema = new Schema(
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
    snapshotDate: {
      type: Date,
      required: true,
      index: true,
    },

    // ─── Profile metrics at snapshot time ───────────────────────────────────
    followerCount: { type: Number, default: 0, min: 0 },
    followingCount: { type: Number, default: 0, min: 0 },
    postCount: { type: Number, default: 0, min: 0 },

    // ─── Engagement metrics (rolling window) ───────────────────────────────
    avgEngagementRate: { type: Number, default: 0, min: 0 },
    avgLikes: { type: Number, default: 0, min: 0 },
    avgComments: { type: Number, default: 0, min: 0 },
    avgShares: { type: Number, default: 0, min: 0 },
    avgViews: { type: Number, default: 0, min: 0 },

    // ─── Posting behaviour ─────────────────────────────────────────────────
    postsLastWeek: { type: Number, default: 0, min: 0 },
    postsLastMonth: { type: Number, default: 0, min: 0 },
    postFrequencyPerWeek: { type: Number, default: 0, min: 0 },

    // ─── Top hashtags (from recent posts) ──────────────────────────────────
    topHashtags: { type: [String], default: [] },

    // ─── Content format mix ────────────────────────────────────────────────
    formatMix: {
      type: Map,
      of: Number,   // format → count
      default: {},
    },

    // ─── Comparison scores (vs the tracking user) ──────────────────────────
    scores: {
      engagementComparison: { type: Number, default: 0 }, // -100..+100; positive = competitor leads
      growthComparison: { type: Number, default: 0 },
      consistencyComparison: { type: Number, default: 0 },
      contentFrequency: { type: Number, default: 0 },
      overallThreat: { type: Number, default: 0, min: 0, max: 100 },
    },

    // ─── Content gap analysis ──────────────────────────────────────────────
    topicGaps: { type: [String], default: [] },     // topics competitor covers that the user doesn't
    strengthAreas: { type: [String], default: [] }, // areas where competitor is stronger
    opportunityAreas: { type: [String], default: [] }, // missed opportunities for the user
  },
  defaultSchemaOptions
);

// Prevent duplicate snapshots for the same competitor on the same day
competitorAnalyticsSchema.index(
  { competitor: 1, snapshotDate: 1 },
  { unique: true }
);
competitorAnalyticsSchema.index({ trackedBy: 1, snapshotDate: -1 });

const CompetitorAnalytics = mongoose.model('CompetitorAnalytics', competitorAnalyticsSchema);
export default CompetitorAnalytics;
