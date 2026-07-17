/**
 * FeatureFlag model
 * Global feature flags; workspace/user overrides are stored inline on Workspace.featureFlags.
 */
import mongoose from 'mongoose';
import { defaultSchemaOptions } from './utils/schemaUtils.js';

const { Schema } = mongoose;

export const FEATURE_KEYS = ['ai', 'reports', 'planner', 'notifications', 'competitors', 'trends', 'analytics'];

const featureFlagSchema = new Schema(
  {
    key:         { type: String, required: true, unique: true, enum: FEATURE_KEYS },
    name:        { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 500, default: '' },
    enabled:     { type: Boolean, default: true, index: true },
  },
  defaultSchemaOptions
);

// key unique index is defined on the field — no explicit schema.index needed

const FeatureFlag = mongoose.model('FeatureFlag', featureFlagSchema);
export default FeatureFlag;
