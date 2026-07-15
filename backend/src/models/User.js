import mongoose from 'mongoose';
import { defaultSchemaOptions, softDeletePlugin, SUBSCRIPTION_PLANS } from './utils/schemaUtils.js';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never returned in queries by default
    },
    avatar: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: { values: ['user', 'admin', 'superadmin'], message: 'Invalid role: {VALUE}' },
      default: 'user',
    },
    subscriptionPlan: {
      type: String,
      enum: { values: SUBSCRIPTION_PLANS, message: 'Invalid plan: {VALUE}' },
      default: 'free',
    },
    subscriptionExpiresAt: {
      type: Date,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetToken: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
    status: {
      type: String,
      enum: { values: ['active', 'suspended', 'pending_verification'], message: 'Invalid status: {VALUE}' },
      default: 'pending_verification',
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    lastLoginIp: {
      type: String,
      default: null,
      select: false,
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
  },
  defaultSchemaOptions
);

// Indexes (email unique index is already declared on the field itself)
userSchema.index({ status: 1 });
userSchema.index({ subscriptionPlan: 1 });
userSchema.index({ createdAt: -1 });

// Soft delete
userSchema.plugin(softDeletePlugin);

// Virtual: full profile URL
userSchema.virtual('profileUrl').get(function () {
  return `/users/${this._id}`;
});

const User = mongoose.model('User', userSchema);
export default User;
