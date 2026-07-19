/**
 * BasePlatformService — abstract base class for all social media platform integrations.
 *
 * Defines the full provider interface covering both OAuth token management and
 * data-fetching operations. Every platform (YouTube, Instagram, LinkedIn, TikTok, X)
 * must extend this class and implement all abstract methods.
 *
 * PlatformFactory resolves a platform name → concrete instance.
 * PlatformManager calls this interface without knowing which platform it is using.
 *
 * Normalized return shapes are documented on each method so all providers
 * return consistent data regardless of platform-specific API quirks.
 */

export class BasePlatformService {
  /**
   * @param {string} platform   e.g. 'youtube', 'instagram'
   * @param {object} config     { clientId, clientSecret, redirectUri, scopes[] }
   */
  constructor(platform, config) {
    if (new.target === BasePlatformService) {
      throw new Error('BasePlatformService is abstract — extend it for each platform');
    }
    this.platform = platform;
    this.config = config;
  }

  // ─── OAuth ────────────────────────────────────────────────────────────────

  /**
   * Build the OAuth authorization URL to redirect the user to.
   * @param {string} state   CSRF state token
   * @returns {string}       Full authorization URL
   */
  // eslint-disable-next-line no-unused-vars
  getAuthorizationUrl(state) {
    throw new Error(`${this.platform}.getAuthorizationUrl() not implemented`);
  }

  /**
   * Exchange the authorization code for tokens and save the connected account.
   * @param {string} userId
   * @param {string} code    Authorization code from provider callback
   * @returns {Promise<object>}  Saved ConnectedAccount (public view, no tokens)
   */
  // eslint-disable-next-line no-unused-vars
  async connect(userId, code) {
    throw new Error(`${this.platform}.connect() not implemented`);
  }

  /**
   * Revoke tokens at the provider level and soft-delete the ConnectedAccount.
   * @param {string} userId
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async disconnect(userId) {
    throw new Error(`${this.platform}.disconnect() not implemented`);
  }

  /**
   * Use the stored refresh token to obtain a new access token.
   * Must update the ConnectedAccount with the new token + expiry.
   * @param {string} userId
   * @returns {Promise<{ accessToken: string, expiresAt: Date }>}
   */
  // eslint-disable-next-line no-unused-vars
  async refreshAccessToken(userId) {
    throw new Error(`${this.platform}.refreshAccessToken() not implemented`);
  }

  /**
   * Verify the stored credentials are still valid.
   * Makes a lightweight authenticated API call.
   * @param {string} userId
   * @returns {Promise<boolean>}
   */
  // eslint-disable-next-line no-unused-vars
  async validateConnection(userId) {
    throw new Error(`${this.platform}.validateConnection() not implemented`);
  }

  // ─── Data fetching ────────────────────────────────────────────────────────

  /**
   * Fetch the user's public channel/page profile.
   * @param {string} userId
   * @returns {Promise<{
   *   platformUserId: string,
   *   username: string,
   *   displayName: string,
   *   avatarUrl: string,
   *   profileUrl: string,
   *   followerCount: number,
   *   followingCount: number,
   *   postCount: number,
   * }>}
   */
  // eslint-disable-next-line no-unused-vars
  async fetchProfile(userId) {
    throw new Error(`${this.platform}.fetchProfile() not implemented`);
  }

  /**
   * Fetch recent posts/videos/content items.
   * @param {string} userId
   * @param {object} [options]  { maxResults, pageToken, since }
   * @returns {Promise<Array<{
   *   platformPostId: string,
   *   format: string,
   *   title: string,
   *   caption: string,
   *   thumbnailUrl: string,
   *   postUrl: string,
   *   publishedAt: Date,
   *   durationSeconds: number,
   *   hashtags: string[],
   *   engagement: object,
   * }>>}
   */
  // eslint-disable-next-line no-unused-vars
  async fetchPosts(userId, options = {}) {
    throw new Error(`${this.platform}.fetchPosts() not implemented`);
  }

  /**
   * Fetch per-post analytics for a set of post IDs.
   * @param {string} userId
   * @param {string[]} platformPostIds
   * @returns {Promise<Array<{
   *   platformPostId: string,
   *   snapshotDate: Date,
   *   engagement: object,
   *   watchTimeSeconds: number,
   *   averageViewDuration: number,
   *   clickThroughRate: number,
   * }>>}
   */
  // eslint-disable-next-line no-unused-vars
  async fetchAnalytics(userId, platformPostIds) {
    throw new Error(`${this.platform}.fetchAnalytics() not implemented`);
  }

  /**
   * Fetch audience demographic data.
   * @param {string} userId
   * @returns {Promise<{
   *   snapshotDate: Date,
   *   totalFollowers: number,
   *   demographics: {
   *     ageGroups: Array<{ label, value, percentage }>,
   *     genders: Array<{ label, value, percentage }>,
   *     countries: Array<{ label, value, percentage }>,
   *   },
   *   topPostingHours: number[],
   *   topPostingDays: number[],
   * }>}
   */
  // eslint-disable-next-line no-unused-vars
  async fetchAudience(userId) {
    throw new Error(`${this.platform}.fetchAudience() not implemented`);
  }

  /**
   * Fetch top-level comments for a post.
   * @param {string} userId
   * @param {string} platformPostId
   * @param {object} [options]  { maxResults, pageToken }
   * @returns {Promise<Array<{ commentId, text, authorName, likeCount, publishedAt }>>}
   */
  // eslint-disable-next-line no-unused-vars
  async fetchComments(userId, platformPostId, options = {}) {
    throw new Error(`${this.platform}.fetchComments() not implemented`);
  }

  /**
   * Fetch follower count history (current snapshot).
   * @param {string} userId
   * @returns {Promise<{ date: Date, followers: number, following: number }>}
   */
  // eslint-disable-next-line no-unused-vars
  async fetchFollowers(userId) {
    throw new Error(`${this.platform}.fetchFollowers() not implemented`);
  }

  /**
   * Fetch channel-level aggregate metrics (views, watch time, etc.).
   * @param {string} userId
   * @param {object} [options]  { startDate, endDate }
   * @returns {Promise<object>}  Platform-specific metrics map
   */
  // eslint-disable-next-line no-unused-vars
  async fetchMetrics(userId, options = {}) {
    throw new Error(`${this.platform}.fetchMetrics() not implemented`);
  }

  // ─── Shared helpers ───────────────────────────────────────────────────────

  /** Assert the provider has credentials configured. */
  assertConfigured() {
    if (!this.config?.clientId || !this.config?.clientSecret) {
      throw new Error(
        `${this.platform} is not configured. ` +
        `Set ${this.platform.toUpperCase()}_CLIENT_ID and ${this.platform.toUpperCase()}_CLIENT_SECRET.`
      );
    }
  }

  /** Convert expires_in (seconds) to a Date. */
  expiresInToDate(seconds) {
    return new Date(Date.now() + seconds * 1000);
  }

  /** Classify an HTTP status code into a platform error type. */
  classifyHttpError(status) {
    if (status === 401 || status === 403) return 'AUTH_ERROR';
    if (status === 429) return 'RATE_LIMIT';
    if (status >= 500) return 'SERVER_ERROR';
    return 'CLIENT_ERROR';
  }
}

export default BasePlatformService;
