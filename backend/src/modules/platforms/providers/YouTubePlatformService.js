/**
 * YouTubePlatformService
 *
 * Full implementation of BasePlatformService for YouTube / Google.
 *
 * APIs used:
 *   OAuth2         — https://accounts.google.com/o/oauth2/v2/auth
 *   Token refresh  — https://oauth2.googleapis.com/token
 *   Channels       — https://www.googleapis.com/youtube/v3/channels
 *   Videos         — https://www.googleapis.com/youtube/v3/videos
 *   Search         — https://www.googleapis.com/youtube/v3/search
 *   CommentThreads — https://www.googleapis.com/youtube/v3/commentThreads
 *   YT Analytics   — https://youtubeanalytics.googleapis.com/v2/reports
 *
 * Scopes required:
 *   https://www.googleapis.com/auth/youtube.readonly
 *   https://www.googleapis.com/auth/yt-analytics.readonly
 */

import { BasePlatformService } from './BasePlatformService.js';
import ConnectedAccountRepository from '../../integrations/ConnectedAccountRepository.js';
import { decrypt } from '../../../utils/encryption.js';
import { withRetry, retryOnNetworkOrRateLimit } from '../../../utils/retry.js';
import { AppError } from '../../../utils/errors.js';
import logger from '../../../utils/logger.js';

const YT_AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const YT_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YT_ANALYTICS_BASE = 'https://youtubeanalytics.googleapis.com/v2';

const DEFAULT_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
  'openid',
  'email',
  'profile',
];

export class YouTubePlatformService extends BasePlatformService {
  constructor(platform, config) {
    super(platform, config);
  }

  // ─── OAuth ──────────────────────────────────────────────────────────────

  getAuthorizationUrl(state) {
    this.assertConfigured();
    const scopes = (this.config.scopes || DEFAULT_SCOPES).join(' ');
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: scopes,
      state,
      access_type: 'offline',   // request refresh token
      prompt: 'consent',        // always show consent to guarantee refresh token
    });
    return `${YT_AUTH_BASE}?${params}`;
  }

  async connect(userId, code) {
    this.assertConfigured();

    // Exchange code for tokens
    const tokenRes = await this._postForm(YT_TOKEN_URL, {
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
      grant_type: 'authorization_code',
    });

    const accessToken = tokenRes.access_token;
    const refreshToken = tokenRes.refresh_token;
    const expiresAt = this.expiresInToDate(tokenRes.expires_in || 3600);
    const scopes = (tokenRes.scope || '').split(' ').filter(Boolean);

    // Fetch channel profile
    const profile = await this._fetchChannelProfile(accessToken);

    // Persist connected account (repository encrypts tokens)
    const account = await ConnectedAccountRepository.upsert(userId, 'youtube', {
      platformUserId: profile.platformUserId,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      profileUrl: profile.profileUrl,
      accessToken,
      refreshToken,
      tokenExpiresAt: expiresAt,
      scopes,
      followerCount: profile.followerCount,
      followingCount: profile.followingCount,
      postCount: profile.postCount,
      status: 'active',
    });

    logger.info('YouTube account connected', { userId });
    return account;
  }

  async disconnect(userId) {
    const account = await ConnectedAccountRepository.findByUserAndPlatformWithTokens(userId, 'youtube');
    if (!account) return;

    // Best-effort token revocation at Google
    if (account.accessToken) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(account.accessToken)}`, {
          method: 'POST',
        });
      } catch (err) {
        logger.warn('YouTube token revocation failed', { userId, error: err.message });
      }
    }
  }

  async refreshAccessToken(userId) {
    this.assertConfigured();
    const account = await ConnectedAccountRepository.findByUserAndPlatformWithTokens(userId, 'youtube');
    if (!account?.refreshToken) {
      throw new AppError('No refresh token stored for YouTube', 401, 'AUTH_ERROR');
    }

    const tokenRes = await this._postForm(YT_TOKEN_URL, {
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: account.refreshToken,
      grant_type: 'refresh_token',
    });

    const accessToken = tokenRes.access_token;
    const expiresAt = this.expiresInToDate(tokenRes.expires_in || 3600);

    await ConnectedAccountRepository.updateByUserAndPlatform(userId, 'youtube', {
      accessToken,
      tokenExpiresAt: expiresAt,
      status: 'active',
    });

    logger.info('YouTube access token refreshed', { userId });
    return { accessToken, expiresAt };
  }

  async validateConnection(userId) {
    try {
      const token = await this._getAccessToken(userId);
      const res = await this._get(`${YT_API_BASE}/channels`, { part: 'id', mine: 'true' }, token);
      return !!(res?.items?.length);
    } catch {
      return false;
    }
  }

  // ─── Data fetching ───────────────────────────────────────────────────────

  async fetchProfile(userId) {
    const token = await this._getAccessToken(userId);
    return this._fetchChannelProfile(token);
  }

  async fetchPosts(userId, options = {}) {
    const token = await this._getAccessToken(userId);
    const { maxResults = 50, pageToken } = options;

    // Step 1: search for the channel's own videos
    const searchParams = {
      part: 'id,snippet',
      forMine: 'true',
      type: 'video',
      maxResults: String(Math.min(maxResults, 50)),
      order: 'date',
    };
    if (pageToken) searchParams.pageToken = pageToken;

    const searchRes = await withRetry(
      () => this._get(`${YT_API_BASE}/search`, searchParams, token),
      { maxAttempts: 3, shouldRetry: retryOnNetworkOrRateLimit }
    );

    const videoIds = (searchRes.items || []).map((i) => i.id?.videoId).filter(Boolean);
    if (videoIds.length === 0) return [];

    // Step 2: fetch full video details (statistics + contentDetails)
    const videoRes = await withRetry(
      () => this._get(`${YT_API_BASE}/videos`, {
        part: 'snippet,statistics,contentDetails',
        id: videoIds.join(','),
        maxResults: '50',
      }, token),
      { maxAttempts: 3, shouldRetry: retryOnNetworkOrRateLimit }
    );

    return (videoRes.items || []).map((v) => this._normalizeVideo(v));
  }

  async fetchAnalytics(userId, platformPostIds) {
    const token = await this._getAccessToken(userId);
    if (!platformPostIds?.length) return [];

    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const startDate = thirtyDaysAgo.toISOString().slice(0, 10);
    const endDate = today.toISOString().slice(0, 10);

    // YouTube Analytics API: per-video metrics
    const analyticsRes = await withRetry(
      () => this._get(`${YT_ANALYTICS_BASE}/reports`, {
        ids: 'channel==MINE',
        startDate,
        endDate,
        metrics: 'views,likes,comments,shares,estimatedMinutesWatched,averageViewDuration,annotationClickThroughRate',
        dimensions: 'video',
        filters: `video==${platformPostIds.join(',')}`,
      }, token),
      { maxAttempts: 3, shouldRetry: retryOnNetworkOrRateLimit }
    );

    const colHeaders = (analyticsRes.columnHeaders || []).map((h) => h.name);
    const snapshotDate = new Date();

    return (analyticsRes.rows || []).map((row) => {
      const data = Object.fromEntries(colHeaders.map((col, i) => [col, row[i]]));
      return {
        platformPostId: data.video,
        snapshotDate,
        engagement: {
          views: data.views || 0,
          likes: data.likes || 0,
          comments: data.comments || 0,
          shares: data.shares || 0,
        },
        watchTimeSeconds: Math.round((data.estimatedMinutesWatched || 0) * 60),
        averageViewDuration: data.averageViewDuration || 0,
        clickThroughRate: data.annotationClickThroughRate || 0,
      };
    });
  }

  async fetchAudience(userId) {
    const token = await this._getAccessToken(userId);
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const startDate = thirtyDaysAgo.toISOString().slice(0, 10);
    const endDate = today.toISOString().slice(0, 10);

    // Fetch subscriber count from channels API
    const channelRes = await withRetry(
      () => this._get(`${YT_API_BASE}/channels`, { part: 'statistics', mine: 'true' }, token),
      { maxAttempts: 3, shouldRetry: retryOnNetworkOrRateLimit }
    );
    const stats = channelRes?.items?.[0]?.statistics || {};

    // Fetch age + gender demographics from Analytics API
    const [ageRes, genderRes, countryRes] = await Promise.allSettled([
      withRetry(() => this._get(`${YT_ANALYTICS_BASE}/reports`, {
        ids: 'channel==MINE', startDate, endDate,
        metrics: 'viewerPercentage', dimensions: 'ageGroup,gender',
      }, token), { maxAttempts: 2 }),

      withRetry(() => this._get(`${YT_ANALYTICS_BASE}/reports`, {
        ids: 'channel==MINE', startDate, endDate,
        metrics: 'viewerPercentage', dimensions: 'gender',
      }, token), { maxAttempts: 2 }),

      withRetry(() => this._get(`${YT_ANALYTICS_BASE}/reports`, {
        ids: 'channel==MINE', startDate, endDate,
        metrics: 'views', dimensions: 'country',
        sort: '-views', maxResults: '10',
      }, token), { maxAttempts: 2 }),
    ]);

    const totalFollowers = parseInt(stats.subscriberCount || 0, 10);

    return {
      snapshotDate: new Date(),
      totalFollowers,
      demographics: {
        ageGroups: this._parseDistribution(ageRes.value, 0, 2),
        genders: this._parseDistribution(genderRes.value, 0, 1),
        countries: this._parseDistribution(countryRes.value, 0, 1),
        cities: [],
        languages: [],
      },
      topPostingHours: [],
      topPostingDays: [],
      audienceGrowthRate: 0,
    };
  }

  async fetchComments(userId, platformPostId, options = {}) {
    const token = await this._getAccessToken(userId);
    const { maxResults = 20, pageToken } = options;

    const params = {
      part: 'snippet',
      videoId: platformPostId,
      maxResults: String(Math.min(maxResults, 100)),
      order: 'relevance',
    };
    if (pageToken) params.pageToken = pageToken;

    const res = await withRetry(
      () => this._get(`${YT_API_BASE}/commentThreads`, params, token),
      { maxAttempts: 3, shouldRetry: retryOnNetworkOrRateLimit }
    );

    return (res.items || []).map((item) => {
      const top = item.snippet?.topLevelComment?.snippet || {};
      return {
        commentId: item.id,
        text: top.textDisplay || '',
        authorName: top.authorDisplayName || '',
        likeCount: top.likeCount || 0,
        publishedAt: top.publishedAt ? new Date(top.publishedAt) : null,
      };
    });
  }

  async fetchFollowers(userId) {
    const token = await this._getAccessToken(userId);
    const res = await withRetry(
      () => this._get(`${YT_API_BASE}/channels`, { part: 'statistics', mine: 'true' }, token),
      { maxAttempts: 3, shouldRetry: retryOnNetworkOrRateLimit }
    );
    const stats = res?.items?.[0]?.statistics || {};
    return {
      date: new Date(),
      followers: parseInt(stats.subscriberCount || 0, 10),
      following: 0, // YouTube doesn't have a "following" concept
    };
  }

  async fetchMetrics(userId, options = {}) {
    const token = await this._getAccessToken(userId);
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const startDate = (options.startDate || thirtyDaysAgo).toISOString().slice(0, 10);
    const endDate = (options.endDate || today).toISOString().slice(0, 10);

    const res = await withRetry(
      () => this._get(`${YT_ANALYTICS_BASE}/reports`, {
        ids: 'channel==MINE',
        startDate,
        endDate,
        metrics: 'views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost,likes,comments,shares',
      }, token),
      { maxAttempts: 3, shouldRetry: retryOnNetworkOrRateLimit }
    );

    const headers = (res.columnHeaders || []).map((h) => h.name);
    const row = res.rows?.[0] || [];
    return Object.fromEntries(headers.map((h, i) => [h, row[i] ?? 0]));
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  /** Get the decrypted access token for a user, refreshing if close to expiry. */
  async _getAccessToken(userId) {
    const account = await ConnectedAccountRepository.findByUserAndPlatformWithTokens(userId, 'youtube');
    if (!account) {
      throw new AppError('YouTube account not connected', 404, 'NOT_FOUND');
    }

    // Refresh if within 5 minutes of expiry
    const expiresAt = account.tokenExpiresAt ? new Date(account.tokenExpiresAt) : null;
    const fiveMinutes = 5 * 60 * 1000;
    if (!expiresAt || Date.now() + fiveMinutes >= expiresAt.getTime()) {
      const refreshed = await this.refreshAccessToken(userId);
      return refreshed.accessToken;
    }

    return account.accessToken;
  }

  /** Fetch channel info and normalize to profile shape. */
  async _fetchChannelProfile(accessToken) {
    const res = await withRetry(
      () => this._get(`${YT_API_BASE}/channels`, {
        part: 'snippet,statistics,brandingSettings',
        mine: 'true',
      }, accessToken),
      { maxAttempts: 3, shouldRetry: retryOnNetworkOrRateLimit }
    );

    const channel = res?.items?.[0];
    if (!channel) throw new AppError('No YouTube channel found for this account', 404, 'NOT_FOUND');

    const { snippet = {}, statistics = {} } = channel;
    return {
      platformUserId: channel.id,
      username: snippet.customUrl || channel.id,
      displayName: snippet.title || '',
      avatarUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || null,
      profileUrl: `https://www.youtube.com/channel/${channel.id}`,
      followerCount: parseInt(statistics.subscriberCount || 0, 10),
      followingCount: 0,
      postCount: parseInt(statistics.videoCount || 0, 10),
    };
  }

  /** Normalize a YouTube video item to the standard Post shape. */
  _normalizeVideo(item) {
    const { snippet = {}, statistics = {}, contentDetails = {} } = item;
    const durationSeconds = this._parseDuration(contentDetails.duration);
    const format = durationSeconds > 0 && durationSeconds <= 60 ? 'short_video' : 'long_video';

    return {
      platformPostId: item.id,
      format,
      title: snippet.title || '',
      caption: snippet.description || '',
      thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || null,
      postUrl: `https://www.youtube.com/watch?v=${item.id}`,
      publishedAt: snippet.publishedAt ? new Date(snippet.publishedAt) : null,
      durationSeconds,
      hashtags: (snippet.tags || []).map((t) => `#${t}`),
      engagement: {
        views: parseInt(statistics.viewCount || 0, 10),
        likes: parseInt(statistics.likeCount || 0, 10),
        comments: parseInt(statistics.commentCount || 0, 10),
        shares: 0,
        saves: parseInt(statistics.favoriteCount || 0, 10),
      },
    };
  }

  /** Parse ISO 8601 duration (PT1H2M3S) to seconds. */
  _parseDuration(iso) {
    if (!iso) return 0;
    const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!m) return 0;
    return (parseInt(m[1] || 0) * 3600) + (parseInt(m[2] || 0) * 60) + parseInt(m[3] || 0);
  }

  /** Parse an Analytics API response into distribution items. */
  _parseDistribution(res, labelIdx, valueIdx) {
    if (!res?.rows?.length) return [];
    const total = res.rows.reduce((sum, r) => sum + (r[valueIdx] || 0), 0);
    return res.rows.map((r) => ({
      label: String(r[labelIdx]),
      value: r[valueIdx] || 0,
      percentage: total > 0 ? Math.round((r[valueIdx] / total) * 10000) / 100 : 0,
    }));
  }

  /** Make an authenticated GET request to a Google API. */
  async _get(url, params, accessToken) {
    const qs = new URLSearchParams(params).toString();
    const fullUrl = `${url}?${qs}`;

    const res = await fetch(fullUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const errType = this.classifyHttpError(res.status);
      const err = new AppError(
        body?.error?.message || `YouTube API error ${res.status}`,
        res.status,
        errType
      );
      err.code = errType;
      throw err;
    }

    return res.json();
  }

  /** POST form-encoded data to a Google endpoint (token exchange / revoke). */
  async _postForm(url, params) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new AppError(
        body?.error_description || `Google token endpoint error ${res.status}`,
        res.status,
        this.classifyHttpError(res.status)
      );
    }

    return res.json();
  }
}

export default YouTubePlatformService;
