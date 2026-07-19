/**
 * Phase 5 Integration Tests
 *
 * Covers:
 *  - BasePlatformService / PlatformFactory interface
 *  - MockPlatformService (verifies the full sync pipeline with a controllable provider)
 *  - Connect / disconnect via mock
 *  - Profile sync, posts sync, analytics sync, audience sync
 *  - Expired-token recovery (refreshAccessToken is called on 401)
 *  - Invalid-token handling (validation failure propagated as 401)
 *  - Retry behaviour (transient errors retried, auth errors not retried)
 *  - GET /api/v1/platforms/:platform/status
 *  - POST /api/v1/platforms/:platform/sync
 *  - Platform param validation (400 on unknown platform)
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';

import { connectDatabase, disconnectDatabase } from '../infrastructure/database/index.js';
import app from '../app.js';

import { BasePlatformService } from '../modules/platforms/providers/BasePlatformService.js';
import PlatformFactory from '../modules/platforms/providers/PlatformFactory.js';
import PlatformManager from '../modules/platforms/providers/PlatformManager.js';
import ConnectedAccount from '../models/ConnectedAccount.js';
import Post from '../models/Post.js';
import PostAnalytics from '../models/PostAnalytics.js';
import AudienceAnalytics from '../models/AudienceAnalytics.js';
import FollowersHistory from '../models/FollowersHistory.js';
import { withRetry, retryOnNetworkOrRateLimit } from '../utils/retry.js';

const request = supertest(app);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function registerUser() {
  const res = await request.post('/api/v1/auth/register').send({
    name: 'Test User',
    email: `test_p5_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
    password: 'P@ssword123!',
  });
  assert.equal(res.status, 201);
  return {
    user: res.body.data.user,
    accessToken: res.body.data.accessToken,
  };
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Seed a ConnectedAccount bypassing Mongoose enum validation.
 * Required for tests that use custom/mock platform names not in the PLATFORMS enum.
 */
async function seedAccount(data) {
  const doc = new ConnectedAccount(data);
  await doc.save({ validateBeforeSave: false });
  return doc.toObject();
}

// ─── MockPlatformService ──────────────────────────────────────────────────────

/**
 * Controllable mock that extends BasePlatformService.
 * Call opts.onFetchPosts = () => throw new Error() to simulate failures.
 */
class MockPlatformService extends BasePlatformService {
  constructor(platform, config, opts = {}) {
    super(platform, config);
    this.opts = opts;
  }

  getAuthorizationUrl(state) { return `https://mock.example.com/auth?state=${state}`; }

  async connect(userId, code) {
    return { id: 'mock-account', platform: this.platform, platformUserId: 'mock-uid-123' };
  }

  async disconnect(userId) { /* no-op */ }

  async refreshAccessToken(userId) {
    if (this.opts.refreshFails) throw Object.assign(new Error('refresh failed'), { code: 'AUTH_ERROR', statusCode: 401 });
    return { accessToken: 'new-mock-token', expiresAt: new Date(Date.now() + 3600_000) };
  }

  async validateConnection(userId) {
    if (this.opts.validationFails) return false;
    if (this.opts.validationThrows) throw Object.assign(new Error('token expired'), { code: 'AUTH_ERROR', statusCode: 401 });
    return true;
  }

  async fetchProfile(userId) {
    return {
      platformUserId: 'mock-channel-001',
      username: 'mock_creator',
      displayName: 'Mock Creator',
      avatarUrl: 'https://example.com/avatar.jpg',
      profileUrl: 'https://example.com/channel/mock',
      followerCount: 5000,
      followingCount: 0,
      postCount: 42,
    };
  }

  async fetchPosts(userId, options = {}) {
    if (this.opts.postsFail) throw Object.assign(new Error('posts API error'), { code: 'NETWORK_ERROR' });
    return [
      {
        platformPostId: 'mock-video-001',
        format: 'long_video',
        title: 'Test Video 1',
        caption: 'Test description',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        postUrl: 'https://example.com/watch?v=mock-video-001',
        publishedAt: new Date('2024-01-15'),
        durationSeconds: 600,
        hashtags: ['#test'],
        engagement: { views: 1000, likes: 50, comments: 10, shares: 5, saves: 3 },
      },
      {
        platformPostId: 'mock-video-002',
        format: 'short_video',
        title: 'Test Short',
        caption: 'Short video',
        thumbnailUrl: null,
        postUrl: 'https://example.com/watch?v=mock-video-002',
        publishedAt: new Date('2024-01-20'),
        durationSeconds: 45,
        hashtags: [],
        engagement: { views: 5000, likes: 200, comments: 30, shares: 20, saves: 10 },
      },
    ];
  }

  async fetchAnalytics(userId, platformPostIds) {
    if (this.opts.analyticsFail) throw new Error('analytics API unavailable');
    return platformPostIds.map((id) => ({
      platformPostId: id,
      snapshotDate: new Date(),
      engagement: { views: 1000, likes: 50, comments: 10, shares: 5 },
      watchTimeSeconds: 30000,
      averageViewDuration: 300,
      clickThroughRate: 0.05,
    }));
  }

  async fetchAudience(userId) {
    return {
      snapshotDate: new Date(),
      totalFollowers: 5000,
      demographics: {
        ageGroups: [{ label: '18-24', value: 40, percentage: 40 }],
        genders: [{ label: 'male', value: 60, percentage: 60 }, { label: 'female', value: 40, percentage: 40 }],
        countries: [{ label: 'US', value: 3000, percentage: 60 }],
        cities: [],
        languages: [],
      },
      topPostingHours: [18, 19, 20],
      topPostingDays: [1, 5, 6],
      audienceGrowthRate: 2.5,
    };
  }

  async fetchFollowers(userId) {
    return { date: new Date(), followers: 5000, following: 0 };
  }

  async fetchComments(userId, platformPostId, options = {}) {
    return [
      { commentId: 'c1', text: 'Great video!', authorName: 'User1', likeCount: 5, publishedAt: new Date() },
    ];
  }

  async fetchMetrics(userId, options = {}) {
    return { views: 100000, estimatedMinutesWatched: 50000, subscribersGained: 200 };
  }
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

before(async () => {
  await connectDatabase();
  // Register mock as the 'mock' platform
  PlatformFactory.register('mock', MockPlatformService, {});
});

after(async () => {
  await disconnectDatabase();
});

// ─── BasePlatformService / PlatformFactory ────────────────────────────────────

describe('BasePlatformService', () => {
  it('cannot be instantiated directly', () => {
    assert.throws(() => new BasePlatformService('test', {}), /abstract/);
  });

  it('concrete subclass satisfies the interface', () => {
    const svc = new MockPlatformService('mock', {});
    assert.equal(typeof svc.connect, 'function');
    assert.equal(typeof svc.disconnect, 'function');
    assert.equal(typeof svc.refreshAccessToken, 'function');
    assert.equal(typeof svc.validateConnection, 'function');
    assert.equal(typeof svc.fetchProfile, 'function');
    assert.equal(typeof svc.fetchPosts, 'function');
    assert.equal(typeof svc.fetchAnalytics, 'function');
    assert.equal(typeof svc.fetchAudience, 'function');
    assert.equal(typeof svc.fetchComments, 'function');
    assert.equal(typeof svc.fetchFollowers, 'function');
    assert.equal(typeof svc.fetchMetrics, 'function');
  });

  it('assertConfigured() throws when clientId/clientSecret are absent', () => {
    const svc = new MockPlatformService('mock', { clientId: '', clientSecret: '' });
    assert.throws(() => svc.assertConfigured(), /not configured/);
  });

  it('assertConfigured() passes when both credentials are present', () => {
    const svc = new MockPlatformService('mock', { clientId: 'id', clientSecret: 'secret' });
    assert.doesNotThrow(() => svc.assertConfigured());
  });

  it('expiresInToDate() returns a future Date', () => {
    const svc = new MockPlatformService('mock', {});
    const d = svc.expiresInToDate(3600);
    assert.ok(d > new Date());
  });
});

describe('PlatformFactory', () => {
  it('lists youtube as an implemented platform', () => {
    assert.equal(PlatformFactory.isImplemented('youtube'), true);
  });

  it('lists instagram as not yet implemented', () => {
    assert.equal(PlatformFactory.isImplemented('instagram'), false);
  });

  it('throws for unknown platform', () => {
    assert.throws(() => PlatformFactory.getService('myspace'), /Unknown platform/);
  });

  it('throws for stub platform (instagram)', () => {
    assert.throws(() => PlatformFactory.getService('instagram'), /not yet implemented/);
  });

  it('returns a service instance for the mock platform', () => {
    const svc = PlatformFactory.getService('mock');
    assert.ok(svc instanceof BasePlatformService);
  });
});

// ─── Retry utility ────────────────────────────────────────────────────────────

describe('withRetry', () => {
  it('returns the result on first success', async () => {
    const result = await withRetry(async () => 42);
    assert.equal(result, 42);
  });

  it('retries and succeeds on the second attempt', async () => {
    let attempt = 0;
    const result = await withRetry(async () => {
      attempt++;
      if (attempt < 2) throw Object.assign(new Error('transient'), { code: 'NETWORK_ERROR' });
      return 'ok';
    }, { maxAttempts: 3, baseDelayMs: 10, shouldRetry: retryOnNetworkOrRateLimit });
    assert.equal(result, 'ok');
    assert.equal(attempt, 2);
  });

  it('throws after exhausting all attempts', async () => {
    let calls = 0;
    await assert.rejects(
      withRetry(async () => { calls++; throw new Error('always fails'); }, { maxAttempts: 3, baseDelayMs: 10 }),
      /always fails/
    );
    assert.equal(calls, 3);
  });

  it('does not retry when shouldRetry returns false', async () => {
    let calls = 0;
    await assert.rejects(
      withRetry(async () => {
        calls++;
        throw Object.assign(new Error('auth error'), { code: 'AUTH_ERROR' });
      }, {
        maxAttempts: 3,
        baseDelayMs: 10,
        shouldRetry: retryOnNetworkOrRateLimit,
      }),
      /auth error/
    );
    assert.equal(calls, 1);
  });

  it('retries on RATE_LIMIT error', async () => {
    let calls = 0;
    await assert.rejects(
      withRetry(async () => {
        calls++;
        throw Object.assign(new Error('rate limited'), { code: 'RATE_LIMIT' });
      }, { maxAttempts: 3, baseDelayMs: 10, shouldRetry: retryOnNetworkOrRateLimit }),
      /rate limited/
    );
    assert.equal(calls, 3);
  });
});

// ─── Sync pipeline via PlatformManager (uses MockPlatformService) ─────────────

describe('PlatformManager.sync — full pipeline', () => {
  it('runs the complete sync and persists data to all collections', async () => {
    const { user } = await registerUser();
    const userId = user.id;

    // Seed a connected account for the mock platform (bypass enum validation)
    await seedAccount({ user: userId, platform: 'mock', platformUserId: 'mock-existing', status: 'active' });

    const result = await PlatformManager.sync(userId, 'mock');

    assert.equal(result.platform, 'mock');
    assert.equal(result.status, 'success');
    assert.ok(result.durationMs >= 0);
    assert.ok(result.lastSyncedAt instanceof Date);
    assert.equal(result.errors.length, 0);
    assert.ok(result.records.posts >= 2);
    assert.ok(result.records.analytics >= 2);
    assert.equal(result.records.audience, 1);
    assert.equal(result.records.followers, 1);

    // Verify posts in DB
    const posts = await Post.find({ user: userId, platform: 'mock' }).lean();
    assert.equal(posts.length, 2);
    assert.ok(posts.some((p) => p.platformPostId === 'mock-video-001'));
    assert.ok(posts.some((p) => p.platformPostId === 'mock-video-002'));

    // Verify audience analytics
    const audience = await AudienceAnalytics.findOne({ user: userId, platform: 'mock' }).lean();
    assert.ok(audience);
    assert.equal(audience.totalFollowers, 5000);

    // Verify followers history
    const followers = await FollowersHistory.findOne({ user: userId, platform: 'mock' }).lean();
    assert.ok(followers);
    assert.equal(followers.followers, 5000);

    // Verify connected account was stamped
    const account = await ConnectedAccount.findOne({ user: userId, platform: 'mock' }).lean();
    assert.ok(account.lastSyncedAt);
    assert.equal(account.followerCount, 5000);
    assert.equal(account.username, 'mock_creator');
  });

  it('idempotent — second sync upserts, does not duplicate records', async () => {
    const { user } = await registerUser();
    const userId = user.id;

    await seedAccount({ user: userId, platform: 'mock', platformUserId: 'mock-uid', status: 'active' });

    await PlatformManager.sync(userId, 'mock');
    await PlatformManager.sync(userId, 'mock');

    const posts = await Post.find({ user: userId, platform: 'mock' }).lean();
    assert.equal(posts.length, 2, 'Idempotent — no duplicate posts');

    const followers = await FollowersHistory.find({ user: userId, platform: 'mock' }).lean();
    assert.equal(followers.length, 1, 'Idempotent — no duplicate follower snapshots');
  });

  it('partial failure — posts step fails but rest succeeds', async () => {
    const { user } = await registerUser();
    const userId = user.id;

    PlatformFactory.register('mock_posts_fail', class extends MockPlatformService {
      constructor(p, c) { super(p, c, { postsFail: true }); }
    }, {});

    await seedAccount({ user: userId, platform: 'mock_posts_fail', platformUserId: 'id', status: 'active' });

    const result = await PlatformManager.sync(userId, 'mock_posts_fail');
    assert.equal(result.status, 'partial');
    assert.ok(result.errors.some((e) => e.includes('posts')));
    assert.equal(result.records.audience, 1, 'Audience still synced after posts failure');
    assert.equal(result.records.followers, 1, 'Followers still synced after posts failure');
  });

  it('throws when no connected account exists', async () => {
    const { user } = await registerUser();
    await assert.rejects(
      PlatformManager.sync(user.id, 'mock'),
      /not found/i
    );
  });
});

// ─── Platform API endpoints ───────────────────────────────────────────────────

describe('GET /platforms/:platform/status', () => {
  it('returns status for a connected account', async () => {
    const { user, accessToken } = await registerUser();

    await seedAccount({ user: user.id, platform: 'mock', platformUserId: 'status-test', status: 'active', followerCount: 1234 });

    const res = await request
      .get('/api/v1/platforms/mock/status')
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
    assert.equal(res.body.data.platform, 'mock');
    assert.equal(res.body.data.connected, true);
    assert.equal(res.body.data.status, 'active');
    assert.equal(res.body.data.followerCount, 1234);
  });

  it('returns 404 when platform not connected', async () => {
    const { accessToken } = await registerUser();
    const res = await request
      .get('/api/v1/platforms/mock/status')
      .set(authHeader(accessToken));
    assert.equal(res.status, 404);
  });

  it('returns 400 for an unknown platform', async () => {
    const { accessToken } = await registerUser();
    const res = await request
      .get('/api/v1/platforms/myspace/status')
      .set(authHeader(accessToken));
    assert.equal(res.status, 400);
  });

  it('returns 401 without a token', async () => {
    const res = await request.get('/api/v1/platforms/mock/status');
    assert.equal(res.status, 401);
  });
});

describe('POST /platforms/:platform/sync', () => {
  it('syncs and returns result', async () => {
    const { user, accessToken } = await registerUser();

    await seedAccount({ user: user.id, platform: 'mock', platformUserId: 'sync-test', status: 'active' });

    const res = await request
      .post('/api/v1/platforms/mock/sync')
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
    assert.equal(res.body.data.platform, 'mock');
    assert.ok(['success', 'partial'].includes(res.body.data.status));
    assert.ok(typeof res.body.data.durationMs === 'number');
    assert.ok(typeof res.body.data.records === 'object');
    assert.ok(Array.isArray(res.body.data.errors));
  });

  it('returns 404 when no connected account', async () => {
    const { accessToken } = await registerUser();
    const res = await request
      .post('/api/v1/platforms/mock/sync')
      .set(authHeader(accessToken));
    assert.equal(res.status, 404);
  });

  it('returns 400 for an unknown platform', async () => {
    const { accessToken } = await registerUser();
    const res = await request
      .post('/api/v1/platforms/myspace/sync')
      .set(authHeader(accessToken));
    assert.equal(res.status, 400);
  });

  it('returns 401 without a token', async () => {
    const res = await request.post('/api/v1/platforms/mock/sync');
    assert.equal(res.status, 401);
  });
});

// ─── Token expiry / invalid token handling ────────────────────────────────────

describe('Expired and invalid token handling', () => {
  it('propagates auth error as 401 when token is invalid and refresh fails', async () => {
    const { user, accessToken } = await registerUser();

    PlatformFactory.register('mock_auth_fail', class extends MockPlatformService {
      constructor(p, c) { super(p, c, { validationThrows: true, refreshFails: true }); }
    }, {});

    await seedAccount({ user: user.id, platform: 'mock_auth_fail', platformUserId: 'fail-user', status: 'active' });

    const res = await request
      .post('/api/v1/platforms/mock_auth_fail/sync')
      .set(authHeader(accessToken));

    assert.equal(res.status, 401);
  });

  it('recovers when validateConnection fails but refreshAccessToken succeeds', async () => {
    const { user, accessToken } = await registerUser();
    let refreshCalled = false;
    let validateCallCount = 0;

    PlatformFactory.register('mock_refresh_ok', class extends MockPlatformService {
      constructor(p, c) { super(p, c); }
      async validateConnection() {
        validateCallCount++;
        if (validateCallCount === 1) return false; // first check fails
        return true;                                // after refresh succeeds
      }
      async refreshAccessToken(userId) {
        refreshCalled = true;
        return { accessToken: 'refreshed-token', expiresAt: new Date(Date.now() + 3600_000) };
      }
    }, {});

    await seedAccount({ user: user.id, platform: 'mock_refresh_ok', platformUserId: 'refresh-user', status: 'active' });

    const result = await PlatformManager.sync(user.id, 'mock_refresh_ok');
    assert.ok(refreshCalled, 'refreshAccessToken was called');
    assert.ok(['success', 'partial'].includes(result.status));
  });
});
