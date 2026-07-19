/**
 * PlatformFactory
 *
 * Singleton registry that maps platform names → BasePlatformService instances.
 * Adding a new provider:
 *   1. Create providers/YourPlatformService.js extending BasePlatformService
 *   2. Import it and register it below
 *   No other file needs to change.
 */

import config from '../../../config/index.js';
import YouTubePlatformService from './YouTubePlatformService.js';

// Provider registry: platform name → { Class, providerConfig }
const REGISTRY = {
  youtube: {
    Class: YouTubePlatformService,
    providerConfig: config.oauth.youtube,
  },
  // Stubs — Class will be set when providers are implemented in future phases
  instagram: { Class: null, providerConfig: config.oauth.instagram },
  linkedin:  { Class: null, providerConfig: config.oauth.linkedin },
  tiktok:    { Class: null, providerConfig: config.oauth.tiktok },
  x:         { Class: null, providerConfig: config.oauth.x },
};

class PlatformFactory {
  /**
   * Get an instantiated BasePlatformService for the given platform.
   * @param {string} platform  e.g. 'youtube'
   * @returns {BasePlatformService}
   * @throws if the platform is unknown or not yet implemented
   */
  getService(platform) {
    const entry = REGISTRY[platform];
    if (!entry) {
      const supported = Object.keys(REGISTRY).join(', ');
      throw new Error(`Unknown platform: "${platform}". Supported: ${supported}`);
    }
    if (!entry.Class) {
      throw new Error(
        `Platform "${platform}" is registered but not yet implemented. ` +
        `It will be available in a future phase.`
      );
    }
    return new entry.Class(platform, entry.providerConfig);
  }

  /** List all registered platform names. */
  getSupportedPlatforms() {
    return Object.keys(REGISTRY);
  }

  /** Check if a platform has a concrete implementation. */
  isImplemented(platform) {
    return !!(REGISTRY[platform]?.Class);
  }

  /**
   * Register (or replace) a platform service at runtime.
   * Useful for testing with mock providers.
   */
  register(platform, ServiceClass, providerConfig = {}) {
    REGISTRY[platform] = { Class: ServiceClass, providerConfig };
  }
}

export default new PlatformFactory();
