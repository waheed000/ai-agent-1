/**
 * NotificationPreferences model
 * Per-user channel and type preferences for the notification engine.
 * One document per user (upserted).
 */
import mongoose from 'mongoose';
import { defaultSchemaOptions } from './utils/schemaUtils.js';

const { Schema } = mongoose;

const channelToggleSchema = new Schema({
  inApp:     { type: Boolean, default: true },
  email:     { type: Boolean, default: false },
  push:      { type: Boolean, default: false },
  websocket: { type: Boolean, default: false },
}, { _id: false });

const prefsSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  // Global master switch — disable all if false
  enabled: { type: Boolean, default: true },

  // Per-type channel preferences
  types: {
    growth_drop:           { type: channelToggleSchema, default: () => ({}) },
    growth_milestone:      { type: channelToggleSchema, default: () => ({}) },
    trend_alert:           { type: channelToggleSchema, default: () => ({}) },
    competitor_alert:      { type: channelToggleSchema, default: () => ({}) },
    weekly_report_ready:   { type: channelToggleSchema, default: () => ({}) },
    monthly_report_ready:  { type: channelToggleSchema, default: () => ({}) },
    ai_recommendation:     { type: channelToggleSchema, default: () => ({}) },
    publishing_reminder:   { type: channelToggleSchema, default: () => ({}) },
    failed_sync:           { type: channelToggleSchema, default: () => ({}) },
    expired_token:         { type: channelToggleSchema, default: () => ({}) },
    ai_insight:            { type: channelToggleSchema, default: () => ({}) },
    system:                { type: channelToggleSchema, default: () => ({}) },
  },

  // Quiet hours (UTC)
  quietHoursEnabled: { type: Boolean, default: false },
  quietHoursStart:   { type: Number, min: 0, max: 23, default: 22 },  // hour
  quietHoursEnd:     { type: Number, min: 0, max: 23, default: 8 },

  // Digest settings
  emailDigestEnabled:    { type: Boolean, default: false },
  emailDigestFrequency:  { type: String, enum: ['daily', 'weekly'], default: 'weekly' },
}, defaultSchemaOptions);

const NotificationPreferences = mongoose.model('NotificationPreferences', prefsSchema);
export default NotificationPreferences;
