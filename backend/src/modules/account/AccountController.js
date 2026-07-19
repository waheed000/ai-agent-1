/**
 * ProfileController
 * Handles user profile and account management endpoints.
 * Delegates all business logic to UserService.
 */

import UserService from './UserService.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { success } from '../../utils/response.js';

const ProfileController = {
  /**
   * GET /api/v1/auth/me
   * Return the authenticated user with their CreatorProfile.
   */
  getMe: asyncHandler(async (req, res) => {
    const data = await UserService.getMe(req.user._id);
    success(res, data, 'Profile retrieved successfully');
  }),

  /**
   * PATCH /api/v1/auth/profile
   * Update allowed profile fields across User and CreatorProfile.
   */
  updateProfile: asyncHandler(async (req, res) => {
    const {
      // User-level fields
      name, avatar, timezone,
      // CreatorProfile-level fields
      bio, niche, contentLanguage, contentGoals, experienceLevel, location,
    } = req.body;

    // Separate updates by destination model — only include keys present in the body
    const userUpdates = {};
    if (name !== undefined) userUpdates.name = name;
    if (avatar !== undefined) userUpdates.avatar = avatar;
    if (timezone !== undefined) userUpdates.timezone = timezone;

    const profileUpdates = {};
    if (bio !== undefined) profileUpdates.bio = bio;
    if (niche !== undefined) profileUpdates.niche = niche;
    if (contentLanguage !== undefined) profileUpdates.contentLanguage = contentLanguage;
    if (contentGoals !== undefined) profileUpdates.contentGoals = contentGoals;
    if (experienceLevel !== undefined) profileUpdates.experienceLevel = experienceLevel;
    if (location !== undefined) {
      if (location.country !== undefined) profileUpdates['location.country'] = location.country;
      if (location.city !== undefined) profileUpdates['location.city'] = location.city;
    }

    const data = await UserService.updateProfile(req.user._id, { userUpdates, profileUpdates });
    success(res, data, 'Profile updated successfully');
  }),

  /**
   * PATCH /api/v1/auth/change-password
   * Verify current password, set new password, revoke all sessions.
   */
  changePassword: asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    await UserService.changePassword(req.user._id, currentPassword, newPassword);
    success(res, null, 'Password changed successfully. Please log in again.');
  }),

  /**
   * DELETE /api/v1/auth/account
   * Soft-delete the account, revoke all tokens.
   */
  deleteAccount: asyncHandler(async (req, res) => {
    await UserService.deleteAccount(req.user._id);
    // Clear refresh token cookie
    res.clearCookie('refreshToken', { httpOnly: true });
    success(res, null, 'Account deleted successfully');
  }),
};

export default ProfileController;
