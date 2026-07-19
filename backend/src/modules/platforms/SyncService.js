/**
 * SyncService
 * Business logic entry point for platform synchronization.
 * Thin wrapper over PlatformManager — validates inputs and surfaces
 * domain errors cleanly to the controller layer.
 */

import PlatformManager from './providers/PlatformManager.js';
import PlatformFactory from './providers/PlatformFactory.js';
import { AppError } from '../../utils/errors.js';

const SyncService = {
  /**
   * Trigger a full sync for a user's connected platform.
   *
   * @param {string} userId
   * @param {string} platform
   * @returns {Promise<SyncResult>}
   */
  async sync(userId, platform) {
    this._assertPlatformSupported(platform);
    return PlatformManager.sync(userId, platform);
  },

  /**
   * Get current sync status for a platform.
   *
   * @param {string} userId
   * @param {string} platform
   * @returns {Promise<object>}
   */
  async getStatus(userId, platform) {
    this._assertPlatformSupported(platform);
    return PlatformManager.getStatus(userId, platform);
  },

  /** Throw if the platform is not registered in PlatformFactory. */
  _assertPlatformSupported(platform) {
    const supported = PlatformFactory.getSupportedPlatforms();
    if (!supported.includes(platform)) {
      throw new AppError(
        `Unsupported platform: "${platform}". Supported: ${supported.join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }
  },
};

export default SyncService;
