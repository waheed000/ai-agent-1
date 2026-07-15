import mongoose from 'mongoose';
import { defaultSchemaOptions } from './utils/schemaUtils.js';

const { Schema } = mongoose;

/**
 * Persisted refresh token for stateful JWT rotation.
 * A TTL index automatically expires old tokens from MongoDB.
 */
const refreshTokenSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    // Hashed token stored for DB lookup (never store raw token in DB)
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    revokedAt: { type: Date, default: null },
    revokedReason: {
      type: String,
      enum: { values: ['logout', 'rotation', 'security', 'admin', null], message: 'Invalid revoked reason' },
      default: null,
    },
    userAgent: String,
    ipAddress: String,
    family: {
      type: String,
      default: null, // token family for refresh token rotation attack detection
    },
  },
  defaultSchemaOptions
);

// TTL index — MongoDB automatically deletes expired token documents
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ tokenHash: 1 }, { unique: true });
refreshTokenSchema.index({ user: 1, isRevoked: 1 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
export default RefreshToken;
