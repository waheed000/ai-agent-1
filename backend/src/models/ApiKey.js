/**
 * ApiKey model
 * Raw keys are NEVER stored — only the SHA-256 hash and an 8-char display prefix.
 */
import mongoose from 'mongoose';
import { defaultSchemaOptions, softDeletePlugin } from './utils/schemaUtils.js';

const { Schema } = mongoose;

const apiKeySchema = new Schema(
  {
    user:        { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    workspace:   { type: Schema.Types.ObjectId, ref: 'Workspace', default: null },
    description: { type: String, maxlength: 255, default: '' },

    // Display prefix shown to user (first 8 chars of raw key — safe to expose)
    prefix:  { type: String, required: true, length: 8 },
    // SHA-256 hash of the raw key — used for lookup
    keyHash: { type: String, required: true, unique: true },

    scopes:     { type: [String], default: [] },
    expiresAt:  { type: Date, default: null },
    lastUsedAt: { type: Date, default: null },
    revoked:    { type: Boolean, default: false, index: true },
    revokedAt:  { type: Date, default: null },
  },
  defaultSchemaOptions
);

apiKeySchema.index({ user: 1, revoked: 1 });
// keyHash unique index is defined on the field — no explicit schema.index needed
apiKeySchema.plugin(softDeletePlugin);

const ApiKey = mongoose.model('ApiKey', apiKeySchema);
export default ApiKey;
