/**
 * Settings model
 * One document per user per type (user / workspace / notification / ai).
 * Upserted on write — never duplicated.
 */
import mongoose from 'mongoose';
import { defaultSchemaOptions } from './utils/schemaUtils.js';

const { Schema } = mongoose;

export const SETTINGS_TYPES = ['user', 'workspace', 'notification', 'ai'];

const settingsSchema = new Schema(
  {
    user:      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', default: null },
    type:      { type: String, enum: SETTINGS_TYPES, required: true },

    // User settings
    timezone: { type: String, default: 'UTC' },
    language: { type: String, default: 'en' },
    theme:    { type: String, enum: ['light', 'dark', 'system'], default: 'system' },

    // Flexible blob for notification / AI settings
    data: { type: Schema.Types.Mixed, default: {} },
  },
  defaultSchemaOptions
);

settingsSchema.index({ user: 1, type: 1 }, { unique: true });

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
