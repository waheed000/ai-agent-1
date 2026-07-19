/**
 * OAuthProviderFactory
 *
 * Resolves a platform name to a concrete BaseOAuthProvider instance.
 * Providers are registered here; OAuthService calls getProvider(platform)
 * without needing to know about individual provider classes.
 *
 * Adding a new provider:
 *   1. Create src/services/oauth/providers/YourProvider.js extending BaseOAuthProvider
 *   2. Import it here and register it in PROVIDER_MAP
 *   Done — no other file needs to change.
 */

import config from '../../../config/index.js';

// Provider map — populated as real integrations are added in future phases.
// Each entry: platform name → { Class, config }
//
// Example (uncomment when implementing):
// import YouTubeProvider from './providers/YouTubeProvider.js';
// 'youtube': { Class: YouTubeProvider, config: config.oauth.youtube },

const PROVIDER_MAP = {
  // Placeholder entries — replaced with real classes in Phase 5+
  youtube:   { Class: null, providerConfig: config.oauth.youtube },
  instagram: { Class: null, providerConfig: config.oauth.instagram },
  linkedin:  { Class: null, providerConfig: config.oauth.linkedin },
  tiktok:    { Class: null, providerConfig: config.oauth.tiktok },
  x:         { Class: null, providerConfig: config.oauth.x },
};

class OAuthProviderFactory {
  /**
   * Get an instantiated provider for the given platform.
   *
   * @param {string} platform  e.g. 'youtube', 'instagram'
   * @returns {BaseOAuthProvider}
   * @throws {Error} if the platform is unknown or not yet implemented
   */
  getProvider(platform) {
    const entry = PROVIDER_MAP[platform];
    if (!entry) {
      throw new Error(`Unknown OAuth platform: "${platform}". Supported: ${Object.keys(PROVIDER_MAP).join(', ')}`);
    }
    if (!entry.Class) {
      throw new Error(
        `OAuth provider "${platform}" is registered but not yet implemented. ` +
        `This will be available in a future phase.`
      );
    }
    return new entry.Class(platform, entry.providerConfig);
  }

  /**
   * List all registered platform names.
   * @returns {string[]}
   */
  getSupportedPlatforms() {
    return Object.keys(PROVIDER_MAP);
  }

  /**
   * Check whether a platform has a concrete implementation.
   * @param {string} platform
   * @returns {boolean}
   */
  isImplemented(platform) {
    return !!(PROVIDER_MAP[platform]?.Class);
  }

  /**
   * Register a new provider at runtime (useful for testing).
   * @param {string} platform
   * @param {typeof BaseOAuthProvider} ProviderClass
   * @param {object} providerConfig
   */
  register(platform, ProviderClass, providerConfig = {}) {
    PROVIDER_MAP[platform] = { Class: ProviderClass, providerConfig };
  }
}

export default new OAuthProviderFactory();
