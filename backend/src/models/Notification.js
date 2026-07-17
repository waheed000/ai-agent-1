import mongoose from 'mongoose';
import { defaultSchemaOptions } from './utils/schemaUtils.js';

const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: [
          'growth_drop',
          'growth_milestone',
          'trend_alert',
          'competitor_alert',
          'competitor_update',
          'weekly_plan_ready',
          'weekly_report_ready',
          'monthly_report_ready',
          'report_ready',
          'sync_error',
          'failed_sync',
          'expired_token',
          'ai_insight',
          'ai_recommendation',
          'publishing_reminder',
          'subscription',
          'system',
        ],
        message: 'Invalid notification type: {VALUE}',
      },
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      maxlength: 200,
    },
    body: {
      type: String,
      maxlength: 1000,
    },
    actionUrl: String,
    isRead: { type: Boolean, default: false, index: true },
    readAt: Date,

    // Optional reference to the source entity
    refModel: {
      type: String,
      enum: ['GrowthReport', 'TrendData', 'Competitor', 'WeeklyPlan', 'Post', null],
      default: null,
    },
    refId: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    expiresAt: { type: Date, default: null },
  },
  defaultSchemaOptions
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
