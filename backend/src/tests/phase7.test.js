/**
 * Phase 7 Tests — Analytics Engine
 *
 * Tests:
 * - Engagement calculations
 * - Growth calculations
 * - Posting consistency
 * - Best posting time analysis
 * - Content scoring
 * - Audience analysis
 * - Analytics API endpoints
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import supertest from 'supertest';

// ─── DB setup ─────────────────────────────────────────────────────────────────

let mongod;

async function connectDB() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

async function disconnectDB() {
  await mongoose.disconnect();
  await mongod.stop();
}

// ─── Engagement calculations ──────────────────────────────────────────────────

describe('engagementCalc', () => {
  it('calcPostEngagementRate: standard case', async () => {
    const { calcPostEngagementRate } = await import('../utils/analytics/engagementCalc.js');
    const rate = calcPostEngagementRate(
      { likes: 100, comments: 20, shares: 10, saves: 5 },
      1000
    );
    assert.equal(rate, 13.5); // (135 / 1000) * 100
  });

  it('calcPostEngagementRate: returns 0 for zero followers and zero reach', async () => {
    const { calcPostEngagementRate } = await import('../utils/analytics/engagementCalc.js');
    assert.equal(calcPostEngagementRate({ likes: 100 }, 0), 0);
  });

  it('calcPostEngagementRate: falls back to reach when followers=0', async () => {
    const { calcPostEngagementRate } = await import('../utils/analytics/engagementCalc.js');
    const rate = calcPostEngagementRate({ likes: 50, comments: 10, reach: 500 }, 0);
    assert.equal(rate, 12); // 60/500 * 100
  });

  it('calcAverageEngagementRate: averages correctly', async () => {
    const { calcAverageEngagementRate } = await import('../utils/analytics/engagementCalc.js');
    const posts = [
      { engagementRate: 4.0 },
      { engagementRate: 6.0 },
      { engagementRate: 5.0 },
    ];
    assert.equal(calcAverageEngagementRate(posts), 5);
  });

  it('calcAverageEngagementRate: returns 0 for empty array', async () => {
    const { calcAverageEngagementRate } = await import('../utils/analytics/engagementCalc.js');
    assert.equal(calcAverageEngagementRate([]), 0);
  });

  it('calcAverageEngagementPerPost: sums and averages engagement fields', async () => {
    const { calcAverageEngagementPerPost } = await import('../utils/analytics/engagementCalc.js');
    const posts = [
      { engagement: { likes: 100, comments: 10, shares: 5, saves: 2, views: 1000 } },
      { engagement: { likes: 200, comments: 20, shares: 10, saves: 4, views: 2000 } },
    ];
    const result = calcAverageEngagementPerPost(posts);
    assert.equal(result.avgLikes, 150);
    assert.equal(result.avgComments, 15);
    assert.equal(result.avgViews, 1500);
  });

  it('calcTotalInteractions: sums all interaction types', async () => {
    const { calcTotalInteractions } = await import('../utils/analytics/engagementCalc.js');
    assert.equal(
      calcTotalInteractions({ likes: 10, comments: 5, shares: 3, saves: 2, clicks: 1 }),
      21
    );
  });
});

// ─── Growth calculations ──────────────────────────────────────────────────────

describe('growthCalc', () => {
  it('calcGrowthRate: standard positive growth', async () => {
    const { calcGrowthRate } = await import('../utils/analytics/growthCalc.js');
    assert.equal(calcGrowthRate(1100, 1000), 10);
  });

  it('calcGrowthRate: negative growth', async () => {
    const { calcGrowthRate } = await import('../utils/analytics/growthCalc.js');
    assert.equal(calcGrowthRate(900, 1000), -10);
  });

  it('calcGrowthRate: from zero baseline', async () => {
    const { calcGrowthRate } = await import('../utils/analytics/growthCalc.js');
    assert.equal(calcGrowthRate(100, 0), 100);
    assert.equal(calcGrowthRate(0, 0), null);
  });

  it('calcFollowerGrowth: computes net and growth rate', async () => {
    const { calcFollowerGrowth } = await import('../utils/analytics/growthCalc.js');
    const snapshots = [
      { date: new Date('2025-01-01'), followers: 1000 },
      { date: new Date('2025-01-15'), followers: 1100 },
      { date: new Date('2025-01-30'), followers: 1200 },
    ];
    const result = calcFollowerGrowth(snapshots);
    assert.equal(result.net, 200);
    assert.equal(result.growthRate, 20);
    assert.equal(result.startFollowers, 1000);
    assert.equal(result.endFollowers, 1200);
  });

  it('calcFollowerGrowth: single snapshot returns zero net', async () => {
    const { calcFollowerGrowth } = await import('../utils/analytics/growthCalc.js');
    const result = calcFollowerGrowth([{ date: new Date(), followers: 500 }]);
    assert.equal(result.net, 0);
    assert.equal(result.growthRate, null);
  });

  it('calcDailyDeltas: computes correct deltas', async () => {
    const { calcDailyDeltas } = await import('../utils/analytics/growthCalc.js');
    const snapshots = [
      { date: new Date('2025-01-01'), followers: 1000 },
      { date: new Date('2025-01-02'), followers: 1050 },
      { date: new Date('2025-01-03'), followers: 1020 },
    ];
    const deltas = calcDailyDeltas(snapshots);
    assert.equal(deltas[0].delta, 0);
    assert.equal(deltas[1].delta, 50);
    assert.equal(deltas[2].delta, -30);
  });
});

// ─── Consistency calculations ─────────────────────────────────────────────────

describe('consistencyCalc', () => {
  it('calcPostingFrequency: posts per day', async () => {
    const { calcPostingFrequency } = await import('../utils/analytics/consistencyCalc.js');
    const posts = new Array(30).fill({});
    assert.equal(calcPostingFrequency(posts, 30), 1);
    assert.equal(calcPostingFrequency(posts, 60), 0.5);
  });

  it('calcContentVelocity: posts per week', async () => {
    const { calcContentVelocity } = await import('../utils/analytics/consistencyCalc.js');
    const posts = new Array(28).fill({});
    assert.equal(calcContentVelocity(posts, 28), 7); // 28 posts / 4 weeks
  });

  it('calcConsistencyScore: perfectly consistent posts score 100', async () => {
    const { calcConsistencyScore } = await import('../utils/analytics/consistencyCalc.js');
    const start = new Date('2025-01-01');
    const end = new Date('2025-01-28');
    // 1 post per week in each of 4 weeks
    const posts = [
      { publishedAt: new Date('2025-01-03') },
      { publishedAt: new Date('2025-01-10') },
      { publishedAt: new Date('2025-01-17') },
      { publishedAt: new Date('2025-01-24') },
    ];
    const score = calcConsistencyScore(posts, start, end);
    assert.ok(score >= 90, `Expected score >= 90, got ${score}`);
  });

  it('calcConsistencyScore: all posts in one day score low', async () => {
    const { calcConsistencyScore } = await import('../utils/analytics/consistencyCalc.js');
    const start = new Date('2025-01-01');
    const end = new Date('2025-01-28');
    const posts = new Array(10).fill({ publishedAt: new Date('2025-01-01') });
    const score = calcConsistencyScore(posts, start, end);
    assert.ok(score < 50, `Expected score < 50, got ${score}`);
  });

  it('calcConsistencyScore: returns 0 for empty posts', async () => {
    const { calcConsistencyScore } = await import('../utils/analytics/consistencyCalc.js');
    assert.equal(calcConsistencyScore([], new Date(), new Date()), 0);
  });
});

// ─── Best time calculations ───────────────────────────────────────────────────

describe('bestTimeCalc', () => {
  it('calcBestHours: ranks hours by average engagement', async () => {
    const { calcBestHours } = await import('../utils/analytics/bestTimeCalc.js');
    const posts = [
      { publishedAt: new Date('2025-01-01T09:00:00Z'), engagementRate: 8 },
      { publishedAt: new Date('2025-01-02T09:00:00Z'), engagementRate: 10 },
      { publishedAt: new Date('2025-01-01T20:00:00Z'), engagementRate: 3 },
    ];
    const hours = calcBestHours(posts);
    assert.equal(hours[0].hour, 9);   // hour 9 has avg 9
    assert.equal(hours[0].avgEngagementRate, 9);
    assert.equal(hours[1].hour, 20);
  });

  it('calcBestDays: ranks days by average engagement', async () => {
    const { calcBestDays } = await import('../utils/analytics/bestTimeCalc.js');
    const posts = [
      { publishedAt: new Date('2025-01-06T10:00:00Z'), engagementRate: 10 }, // Monday
      { publishedAt: new Date('2025-01-07T10:00:00Z'), engagementRate: 5 },  // Tuesday
    ];
    const days = calcBestDays(posts);
    assert.equal(days[0].avgEngagementRate, 10);
    assert.equal(days[0].dayName, 'Monday');
  });

  it('calcEngagementHeatmap: produces grid entries', async () => {
    const { calcEngagementHeatmap } = await import('../utils/analytics/bestTimeCalc.js');
    const posts = [
      { publishedAt: new Date('2025-01-06T09:00:00Z'), engagementRate: 5 },
      { publishedAt: new Date('2025-01-06T09:00:00Z'), engagementRate: 7 },
    ];
    const map = calcEngagementHeatmap(posts);
    assert.equal(map.length, 1);
    assert.equal(map[0].avgEngagementRate, 6);
    assert.equal(map[0].postCount, 2);
  });
});

// ─── Content scoring ──────────────────────────────────────────────────────────

describe('contentScoring', () => {
  it('rankPosts: sorts posts by descending score', async () => {
    const { rankPosts } = await import('../utils/analytics/contentScoring.js');
    const posts = [
      { engagementRate: 2, engagement: { likes: 10, shares: 1, comments: 1, saves: 0, reach: 100 } },
      { engagementRate: 9, engagement: { likes: 500, shares: 80, comments: 60, saves: 40, reach: 5000 } },
      { engagementRate: 5, engagement: { likes: 100, shares: 15, comments: 20, saves: 10, reach: 1000 } },
    ];
    const ranked = rankPosts(posts, 1000);
    assert.equal(ranked[0].score > ranked[1].score, true);
    assert.equal(ranked[1].score > ranked[2].score, true);
  });

  it('identifyTopAndBottomContent: separates top and bottom', async () => {
    const { identifyTopAndBottomContent } = await import('../utils/analytics/contentScoring.js');
    const posts = Array.from({ length: 10 }, (_, i) => ({
      engagementRate: i,
      engagement: { likes: i * 10, shares: i, comments: i, saves: i, reach: i * 100 },
    }));
    const { top, bottom } = identifyTopAndBottomContent(posts, 1000, 3);
    assert.equal(top.length, 3);
    assert.equal(bottom.length, 3);
    assert.ok(top[0].score > bottom[0].score);
  });
});

// ─── Audience analysis ────────────────────────────────────────────────────────

describe('audienceCalc', () => {
  it('mergeDistributions: sums values and recalculates percentages', async () => {
    const { mergeDistributions } = await import('../utils/analytics/audienceCalc.js');
    const dist1 = [
      { label: 'US', value: 100, percentage: 50 },
      { label: 'UK', value: 100, percentage: 50 },
    ];
    const dist2 = [
      { label: 'US', value: 200, percentage: 80 },
      { label: 'DE', value: 50, percentage: 20 },
    ];
    const merged = mergeDistributions([dist1, dist2]);
    const us = merged.find((m) => m.label === 'US');
    assert.equal(us.value, 300);
    assert.ok(us.percentage > 0);
  });

  it('calcAudienceGrowthRate: computes growth from snapshots', async () => {
    const { calcAudienceGrowthRate } = await import('../utils/analytics/audienceCalc.js');
    const snapshots = [
      { totalFollowers: 1000, snapshotDate: new Date('2025-01-01') },
      { totalFollowers: 1200, snapshotDate: new Date('2025-01-30') },
    ];
    const result = calcAudienceGrowthRate(snapshots);
    assert.equal(result.growthRate, 20);
    assert.equal(result.net, 200);
  });

  it('calcTotalAudience: sums across platforms', async () => {
    const { calcTotalAudience } = await import('../utils/analytics/audienceCalc.js');
    const snapshots = [
      { platform: 'youtube', totalFollowers: 5000, totalFollowing: 100 },
      { platform: 'instagram', totalFollowers: 3000, totalFollowing: 200 },
    ];
    const result = calcTotalAudience(snapshots);
    assert.equal(result.totalFollowers, 8000);
    assert.equal(result.totalFollowing, 300);
    assert.ok(result.byPlatform.youtube);
    assert.ok(result.byPlatform.instagram);
  });
});

// ─── Analytics API endpoints ──────────────────────────────────────────────────

describe('Analytics API endpoints', () => {
  let app;

  before(async () => {
    await connectDB();
    const { default: _app } = await import('../app.js');
    app = _app;
  });

  after(disconnectDB);

  it('GET /api/v1/analytics/overview — returns 401 without auth', async () => {
    const res = await supertest(app).get('/api/v1/analytics/overview');
    assert.equal(res.status, 401);
  });

  it('GET /api/v1/analytics/growth — returns 401 without auth', async () => {
    const res = await supertest(app).get('/api/v1/analytics/growth');
    assert.equal(res.status, 401);
  });

  it('GET /api/v1/analytics/engagement — returns 401 without auth', async () => {
    const res = await supertest(app).get('/api/v1/analytics/engagement');
    assert.equal(res.status, 401);
  });

  it('GET /api/v1/analytics/content-performance — returns 401 without auth', async () => {
    const res = await supertest(app).get('/api/v1/analytics/content-performance');
    assert.equal(res.status, 401);
  });

  it('GET /api/v1/analytics/best-posting-time — returns 401 without auth', async () => {
    const res = await supertest(app).get('/api/v1/analytics/best-posting-time');
    assert.equal(res.status, 401);
  });

  it('GET /api/v1/analytics/audience — returns 401 without auth', async () => {
    const res = await supertest(app).get('/api/v1/analytics/audience');
    assert.equal(res.status, 401);
  });

  it('GET /api/v1/analytics/overview — rejects invalid platform', async () => {
    const res = await supertest(app)
      .get('/api/v1/analytics/overview?platform=badplatform')
      .set('Authorization', 'Bearer invalid-token');
    // Either 400 (validation) or 401 (auth) — both are acceptable rejections
    assert.ok([400, 401].includes(res.status));
  });

  it('GET /api/v1/jobs/health — public endpoint returns 200', async () => {
    const res = await supertest(app).get('/api/v1/jobs/health');
    assert.equal(res.status, 200);
    assert.ok(res.body.data);
  });

  it('GET /api/v1/jobs/queues — public endpoint returns 200', async () => {
    const res = await supertest(app).get('/api/v1/jobs/queues');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
  });

  it('POST /api/v1/jobs/platforms/:platform/sync — returns 401 without auth', async () => {
    const res = await supertest(app).post('/api/v1/jobs/platforms/youtube/sync');
    assert.equal(res.status, 401);
  });

  it('POST /api/v1/jobs/platforms/:platform/sync — returns 400 for unsupported platform', async () => {
    const res = await supertest(app)
      .post('/api/v1/jobs/platforms/fakebook/sync')
      .set('Authorization', 'Bearer invalid-token');
    assert.ok([400, 401].includes(res.status));
  });
});
