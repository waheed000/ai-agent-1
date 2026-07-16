/**
 * UserService
 * Business logic for user profile management and account operations.
 * Depends on: UserRepository, CreatorProfileRepository, RefreshTokenRepository, PasswordService.
 */

import UserRepository from '../repositories/UserRepository.js';
import CreatorProfileRepository from '../repositories/CreatorProfileRepository.js';
import RefreshTokenRepository from '../repositories/RefreshTokenRepository.js';
import PasswordService from './PasswordService.js';
import logger from '../utils/logger.js';
import { AuthenticationError, NotFoundError } from '../utils/errors.js';

// Fields that must never be returned to the client
const SENSITIVE_USER_FIELDS = [
  'password', 'verificationToken', 'passwordResetToken',
  'passwordResetExpiresAt', 'lastLoginIp',
];

const sanitizeUser = (user) => {
  if (!user) return null;
  const out = { ...user };
  SENSITIVE_USER_FIELDS.forEach((f) => delete out[f]);
  return out;
};

// Fields on User that the profile-update endpoint is allowed to change
const UPDATABLE_USER_FIELDS = new Set(['name', 'avatar', 'timezone']);

// Fields on CreatorProfile that the profile-update endpoint is allowed to change
const UPDATABLE_PROFILE_FIELDS = new Set([
  'bio', 'niche', 'contentLanguage', 'contentGoals', 'experienceLevel',
  'location.country', 'location.city',
]);

const UserService = {
  /**
   * Return the authenticated user plus their CreatorProfile.
   */
  async getMe(userId) {
    const user = await UserRepository.findById(userId);
    if (!user) throw new NotFoundError('User');

    const profile = await CreatorProfileRepository.findByUserId(userId);
    return { user: sanitizeUser(user), profile };
  },

  /**
   * Update allowed user and/or profile fields.
   * userUpdates  — fields destined for the User document
   * profileUpdates — fields destined for the CreatorProfile document
   */
  async updateProfile(userId, { userUpdates = {}, profileUpdates = {} }) {
    // Filter to only allowed fields (belt-and-suspenders; validators already checked)
    const safeUserUpdates = {};
    for (const [k, v] of Object.entries(userUpdates)) {
      if (UPDATABLE_USER_FIELDS.has(k)) safeUserUpdates[k] = v;
    }

    const safeProfileUpdates = {};
    for (const [k, v] of Object.entries(profileUpdates)) {
      safeProfileUpdates[k] = v;
    }

    let updatedUser = null;
    if (Object.keys(safeUserUpdates).length > 0) {
      updatedUser = await UserRepository.updateById(userId, safeUserUpdates);
    } else {
      updatedUser = await UserRepository.findById(userId);
    }

    let updatedProfile = null;
    if (Object.keys(safeProfileUpdates).length > 0) {
      updatedProfile = await CreatorProfileRepository.updateByUserId(userId, safeProfileUpdates);
    } else {
      updatedProfile = await CreatorProfileRepository.findByUserId(userId);
    }

    logger.info('Profile updated', { userId });
    return { user: sanitizeUser(updatedUser), profile: updatedProfile };
  },

  /**
   * Change password.
   * Verifies the current password, hashes the new one, then revokes all
   * refresh tokens so every other device is forced to re-authenticate.
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await UserRepository.findById(userId, { includePassword: true });
    if (!user) throw new NotFoundError('User');

    const valid = await PasswordService.compare(currentPassword, user.password);
    if (!valid) throw new AuthenticationError('Current password is incorrect');

    // validate + hash (PasswordService.hash runs strength validation internally)
    const hashed = await PasswordService.hash(newPassword);
    await UserRepository.updateById(userId, { password: hashed });

    // Invalidate all sessions — force re-login on every device
    await RefreshTokenRepository.revokeAllByUser(userId, 'security');

    logger.info('Password changed — all sessions revoked', { userId });
  },

  /**
   * Soft-delete the account.
   * Marks the user as deleted and inactive, soft-deletes the CreatorProfile,
   * and revokes every refresh token.
   */
  async deleteAccount(userId) {
    await UserRepository.updateById(userId, {
      isDeleted: true,
      deletedAt: new Date(),
      status: 'suspended',
    });

    await CreatorProfileRepository.softDeleteByUserId(userId);
    await RefreshTokenRepository.revokeAllByUser(userId, 'security');

    logger.info('Account soft-deleted', { userId });
  },
};

export default UserService;
