/**
 * Workspace model
 * A workspace groups users, accounts, reports, analytics, and settings.
 * Supports soft delete only.
 */
import mongoose from 'mongoose';
import { defaultSchemaOptions, softDeletePlugin } from './utils/schemaUtils.js';

const { Schema } = mongoose;

const WORKSPACE_ROLES = ['owner', 'admin', 'editor', 'viewer'];

const memberSchema = new Schema(
  {
    user:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role:     { type: String, enum: WORKSPACE_ROLES, default: 'viewer' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const workspaceSchema = new Schema(
  {
    name:  { type: String, required: true, trim: true, maxlength: 100 },
    slug:  { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 60 },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    members: { type: [memberSchema], default: [] },

    // Embedded per-workspace feature flags (key → boolean)
    featureFlags: { type: Schema.Types.Mixed, default: {} },

    // General metadata
    description: { type: String, maxlength: 500 },
    avatarUrl:   { type: String },
    plan:        { type: String, enum: ['free', 'creator', 'pro', 'agency'], default: 'free' },
  },
  defaultSchemaOptions
);

workspaceSchema.index({ owner: 1, isDeleted: 1 });
workspaceSchema.index({ 'members.user': 1, isDeleted: 1 });
// slug unique index is defined on the field — no explicit schema.index needed

workspaceSchema.plugin(softDeletePlugin);

const Workspace = mongoose.model('Workspace', workspaceSchema);
export default Workspace;
