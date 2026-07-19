/**
 * BaseOAuthProvider — abstract base class for all OAuth provider integrations.
 *
 * Every provider (YouTube, Instagram, LinkedIn, TikTok, X) must extend this
 * class and implement all abstract methods. The OAuthProviderFactory and
 * OAuthService depend only on this interface — adding a new provider requires
 * no changes to business logic.
 *
 * Lifecycle:
 *   1. User initiates connection → getAuthorizationUrl()
 *   2. Provider redirects back → handleCallback(code) → tokens + profile
 *   3. connect() saves the account via ConnectedAccountRepository
 *   4. Background job calls refreshToken() before expiry
 *   5. User disconnects → disconnect()
 */

export class BaseOAuthProvider {
  /**
   * @param {string} platform     One of the PLATFORMS enum values
   * @param {object} config       Provider-specific config (clientId, clientSecret, redirectUri, scopes)
   */
  constructor(platform, config) {
    if (new.target === BaseOAuthProvider) {
      throw new Error('BaseOAuthProvider is abstract — extend it for each provider');
    }
    this.platform = platform;
    this.config = config;
  }

  // ─── Abstract interface ────────────────────────────────────────────────────
  // Every subclass MUST implement these methods.

  /**
   * Build the OAuth authorization URL that the user is redirected to.
   * @param {string} state  CSRF protection state parameter
   * @returns {string}      Full authorization URL
   */
  // eslint-disable-next-line no-unused-vars
  getAuthorizationUrl(state) {
    throw new Error(`${this.platform}.getAuthorizationUrl() not implemented`);
  }

  /**
   * Exchange the authorization code for access + refresh tokens.
   * @param {string} code         Authorization code from the provider callback
   * @returns {Promise<object>}   { accessToken, refreshToken, expiresAt, scopes, rawProfile }
   */
  // eslint-disable-next-line no-unused-vars
  async handleCallback(code) {
    throw new Error(`${this.platform}.handleCallback() not implemented`);
  }

  /**
   * Connect a user to this platform.
   * Persists the connected account (with encrypted tokens) via repository.
   *
   * @param {string} userId
   * @param {string} code         Authorization code from provider callback
   * @returns {Promise<object>}   Public view of the saved ConnectedAccount
   */
  // eslint-disable-next-line no-unused-vars
  async connect(userId, code) {
    throw new Error(`${this.platform}.connect() not implemented`);
  }

  /**
   * Disconnect a user from this platform.
   * Should revoke tokens at the provider level if supported, then soft-delete
   * the ConnectedAccount document.
   *
   * @param {string} userId
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async disconnect(userId) {
    throw new Error(`${this.platform}.disconnect() not implemented`);
  }

  /**
   * Refresh the access token using the stored refresh token.
   * Updates the ConnectedAccount with the new token + expiry.
   *
   * @param {string} userId
   * @returns {Promise<object>}   Updated ConnectedAccount document
   */
  // eslint-disable-next-line no-unused-vars
  async refreshToken(userId) {
    throw new Error(`${this.platform}.refreshToken() not implemented`);
  }

  /**
   * Check whether the stored credentials for a user are still valid.
   * Makes a lightweight API call (e.g. /me) to confirm the token works.
   *
   * @param {string} userId
   * @returns {Promise<boolean>}
   */
  // eslint-disable-next-line no-unused-vars
  async validateConnection(userId) {
    throw new Error(`${this.platform}.validateConnection() not implemented`);
  }

  /**
   * Fetch the user's current public profile from the provider.
   * Used to refresh username / avatar / follower count.
   *
   * @param {string} userId
   * @returns {Promise<object>}   Normalized profile: { platformUserId, username, displayName, avatarUrl, followerCount }
   */
  // eslint-disable-next-line no-unused-vars
  async getProfile(userId) {
    throw new Error(`${this.platform}.getProfile() not implemented`);
  }

  // ─── Shared helpers ────────────────────────────────────────────────────────

  /**
   * Helper: assert the provider is configured (has clientId + clientSecret).
   * Call at the top of any method that makes real network requests.
   */
  assertConfigured() {
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error(
        `${this.platform} OAuth provider is not configured. ` +
        `Set ${this.platform.toUpperCase()}_CLIENT_ID and ${this.platform.toUpperCase()}_CLIENT_SECRET.`
      );
    }
  }

  /**
   * Helper: compute an expiry Date from "expires_in" seconds (common in OAuth responses).
   * @param {number} expiresInSeconds
   * @returns {Date}
   */
  expiresInToDate(expiresInSeconds) {
    return new Date(Date.now() + expiresInSeconds * 1000);
  }
}

export default BaseOAuthProvider;
