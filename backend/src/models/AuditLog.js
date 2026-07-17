/**
 * AuditLog model
 * Immutable record of significant actions.
 * Never soft-deleted — audit trails are permanent.
 */
import mongoose from 'mongoose';
import { defaultSchemaOptions } from './utils/schemaUtils.js';

const { Schema } = mongoose;

export const AUDIT_ACTIONS = {
  // Auth
  LOGIN:    'auth.login',
  LOGOUT:   'auth.logout',
  // Workspace
  WORKSPACE_CREATED: 'workspace.created',
  WORKSPACE_UPDATED: 'workspace.updated',
  WORKSPACE_DELETED: 'workspace.deleted',
  // Members
  MEMBER_INVITED: 'member.invited',
  MEMBER_UPDATED: 'member.updated',
  MEMBER_REMOVED: 'member.removed',
  // API Keys
  API_KEY_CREATED: 'apikey.created',
  API_KEY_REVOKED: 'apikey.revoked',
  API_KEY_DELETED: 'apikey.deleted',
  // AI
  AI_EXECUTED: 'ai.executed',
  // Reports
  REPORT_GENERATED: 'report.generated',
  // Planner
  PLANNER_GENERATED: 'planner.generated',
  // Settings
  SETTINGS_UPDATED: 'settings.updated',
};

const auditLogSchema = new Schema(
  {
    user:      { type: Schema.Types.ObjectId, ref: 'User', default: null },
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', default: null },
    action:    { type: String, required: true, index: true },
    resource:  { type: String, default: null },
    resourceId:{ type: Schema.Types.Mixed, default: null },
    metadata:  { type: Schema.Types.Mixed, default: {} },
    ip:        { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  defaultSchemaOptions
);

auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ workspace: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
