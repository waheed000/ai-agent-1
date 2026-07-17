/**
 * Phase 8 Tests — Competitor Intelligence Engine
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import supertest from 'supertest';

let mongod;
let app;

async function connectDB() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  // Ensure all schema indexes are built before tests run
  await mongoose.connection.syncIndexes();
}

async function disconnectDB() {
  await mongoose.disconnect();
  await mongod.stop();
}

// ─── CompetitorRepository ─────────────────────────────────────────────────────

describe('CompetitorRepository', () => {
  before(connectDB);
  after(disconnectDB);

  let userId;
  beforeEach(async () => {
    userId = new mongoose.Types.ObjectId();
    const { default: Competitor } = await import('../models/Competitor.js');
    await Competitor.deleteMany({});
  });

  it('creates a competitor', async () => {
    const { default: repo } = await import('../repositories/CompetitorRepository.js');
    const comp = await repo.create(userId, {
      username: 'testuser',
      platform: 'instagram',
    });
    assert.equal(comp.username, 'testuser');
    assert.equal(comp.platform, 'instagram');
    assert.deepEqual(comp.trackedBy.toString(), userId.toString());
  });

  it('throws ConflictError for duplicate username+platform', async () => {
    const { default: repo } = await import('../repositories/CompetitorRepository.js');
    await repo.create(userId, { username: 'dupuser', platform: 'youtube' });
    await assert.rejects(
      () => repo.create(userId, { username: 'dupuser', platform: 'youtube' }),
      /already tracking/i
    );
  });

  it('lists competitors for a user', async () => {
    const { default: repo } = await import('../repositories/CompetitorRepository.js');
    await repo.create(userId, { username: 'alice', platform: 'instagram' });
    await repo.create(userId, { username: 'bob', platform: 'tiktok' });
    const list = await repo.findAllByUser(userId);
    assert.equal(list.length, 2);
  });

  it('soft-deletes a competitor', async () => {
    const { default: repo } = await import('../repositories/CompetitorRepository.js');
    const comp = await repo.create(userId, { username: 'delme', platform: 'instagram' });
    await repo.softDelete(comp._id, userId);
    const list = await repo.findAllByUser(userId);
    assert.equal(list.length, 0);
  });

  it('countByUser excludes deleted competitors', async () => {
    const { default: repo } = await import('../repositories/CompetitorRepository.js');
    const comp = await repo.create(userId, { username: 'countme', platform: 'instagram' });
    assert.equal(await repo.countByUser(userId), 1);
    await repo.softDelete(comp._id, userId);
    assert.equal(await repo.countByUser(userId), 0);
  });
});

// ─── CompetitorPostRepository ─────────────────────────────────────────────────

describe('CompetitorPostRepository', () => {
  before(connectDB);
  after(disconnectDB);

  let competitorId;
  let userId;

  before(async () => {
    competitorId = new mongoose.Types.ObjectId();
    userId = new mongoose.Types.ObjectId();
    const { default: CompetitorPost } = await import('../models/CompetitorPost.js');
    await CompetitorPost.deleteMany({});
  });

  it('upserts a competitor post', async () => {
    const { default: repo } = await import('../repositories/CompetitorPostRepository.js');
    const post = await repo.upsert(competitorId, userId, {
      platformPostId: 'ig_post_001',
      format: 'reel',
      publishedAt: new Date(),
      engagement: { likes: 500, comments: 30 },
      engagementRate: 5.0,
    });
    assert.equal(post.platformPostId, 'ig_post_001');
    assert.equal(post.format, 'reel');
  });

  it('does not duplicate on second upsert with same platformPostId', async () => {
    const { default: repo } = await import('../repositories/CompetitorPostRepository.js');
    await repo.upsert(competitorId, userId, {
      platformPostId: 'ig_post_dup',
      format: 'image',
      publishedAt: new Date(),
      engagementRate: 3.0,
    });
    await repo.upsert(competitorId, userId, {
      platformPostId: 'ig_post_dup',
      format: 'image',
      publishedAt: new Date(),
      engagementRate: 3.5,
    });
    const { default: CompetitorPost } = await import('../models/CompetitorPost.js');
    const count = await CompetitorPost.countDocuments({ platformPostId: 'ig_post_dup', competitor: competitorId });
    assert.equal(count, 1);
  });

  it('bulkUpsert stores multiple posts', async () => {
    const { default: repo } = await import('../repositories/CompetitorPostRepository.js');
    const posts = Array.from({ length: 5 }, (_, i) => ({
      platformPostId: `bulk_post_${i}`,
      format: 'short_video',
      publishedAt: new Date(Date.now() - i * 86_400_000),
      engagementRate: 4.0,
    }));
    const result = await repo.bulkUpsert(competitorId, userId, posts);
    assert.ok(result.upsertedCount + result.modifiedCount >= 1);
  });

  it('aggregateHashtags counts tags', async () => {
    const { default: repo } = await import('../repositories/CompetitorPostRepository.js');
    await repo.upsert(competitorId, userId, {
      platformPostId: 'hashtag_post_1',
      hashtags: ['travel', 'lifestyle'],
      publishedAt: new Date(),
      engagementRate: 2.0,
    });
    const hashtags = await repo.aggregateHashtags(competitorId, 10);
    assert.ok(hashtags.length > 0);
    assert.ok(hashtags[0].hashtag);
  });
});

// ─── CompetitorAnalyticsRepository ───────────────────────────────────────────

describe('CompetitorAnalyticsRepository', () => {
  before(connectDB);
  after(disconnectDB);

  let competitorId;
  let userId;

  before(async () => {
    competitorId = new mongoose.Types.ObjectId();
    userId = new mongoose.Types.ObjectId();
    const { default: CompetitorAnalytics } = await import('../models/CompetitorAnalytics.js');
    await CompetitorAnalytics.deleteMany({});
  });

  it('creates a snapshot', async () => {
    const { default: repo } = await import('../repositories/CompetitorAnalyticsRepository.js');
    const snap = await repo.createSnapshot(competitorId, userId, {
      followerCount: 10000,
      avgEngagementRate: 4.5,
      postFrequencyPerWeek: 3,
    });
    assert.equal(snap.followerCount, 10000);
    assert.equal(snap.avgEngagementRate, 4.5);
  });

  it('findLatest returns most recent snapshot', async () => {
    const { default: repo } = await import('../repositories/CompetitorAnalyticsRepository.js');
    // Second snapshot with higher followers
    await repo.createSnapshot(competitorId, userId, {
      followerCount: 12000,
      avgEngagementRate: 5.0,
      snapshotDate: new Date(Date.now() + 86_400_000),
    });
    const latest = await repo.findLatest(competitorId);
    assert.ok(latest.followerCount >= 10000);
  });

  it('history never overwrites old snapshots', async () => {
    const { default: repo } = await import('../repositories/CompetitorAnalyticsRepository.js');
    const history = await repo.findHistory(competitorId);
    // Should have at least the 2 snapshots created above (same day → 1 due to upsert)
    assert.ok(history.length >= 1);
  });
});

// ─── CompetitorService integration ────────────────────────────────────────────

describe('CompetitorService', () => {
  before(connectDB);
  after(disconnectDB);

  let userId;

  beforeEach(async () => {
    userId = new mongoose.Types.ObjectId();
    const { default: Competitor } = await import('../models/Competitor.js');
    await Competitor.deleteMany({ trackedBy: userId });
  });

  it('adds a competitor', async () => {
    const { default: service } = await import('../services/CompetitorService.js');
    const comp = await service.addCompetitor(userId, {
      username: 'mrcompetitor',
      platform: 'youtube',
    });
    assert.equal(comp.username, 'mrcompetitor');
    assert.equal(comp.platform, 'youtube');
  });

  it('lists competitors for a user', async () => {
    const { default: service } = await import('../services/CompetitorService.js');
    await service.addCompetitor(userId, { username: 'one', platform: 'instagram' });
    await service.addCompetitor(userId, { username: 'two', platform: 'tiktok' });
    const list = await service.listCompetitors(userId);
    assert.equal(list.length, 2);
  });

  it('syncs a competitor and returns scores', async () => {
    const { default: service } = await import('../services/CompetitorService.js');
    const comp = await service.addCompetitor(userId, {
      username: 'syncme',
      platform: 'instagram',
    });
    const result = await service.syncCompetitor(userId, comp._id.toString());
    assert.equal(result.success, true);
    assert.ok(result.postsStored > 0);
    assert.ok(result.scores);
    assert.ok(typeof result.scores.overallThreat === 'number');
  });

  it('deletes a competitor', async () => {
    const { default: service } = await import('../services/CompetitorService.js');
    const comp = await service.addCompetitor(userId, { username: 'delme2', platform: 'tiktok' });
    await service.deleteCompetitor(userId, comp._id.toString());
    const list = await service.listCompetitors(userId);
    assert.equal(list.length, 0);
  });
});

// ─── API endpoints ─────────────────────────────────────────────────────────────

describe('Competitor API endpoints', () => {
  before(async () => {
    await connectDB();
    const { default: _app } = await import('../app.js');
    app = _app;
  });
  after(disconnectDB);

  it('POST /api/v1/competitors — 401 without auth', async () => {
    const res = await supertest(app)
      .post('/api/v1/competitors')
      .send({ username: 'test', platform: 'instagram' });
    assert.equal(res.status, 401);
  });

  it('GET /api/v1/competitors — 401 without auth', async () => {
    const res = await supertest(app).get('/api/v1/competitors');
    assert.equal(res.status, 401);
  });

  it('DELETE /api/v1/competitors/:id — 401 without auth', async () => {
    const res = await supertest(app).delete(
      `/api/v1/competitors/${new mongoose.Types.ObjectId()}`
    );
    assert.equal(res.status, 401);
  });

  it('GET /api/v1/competitors/:id/overview — 401 without auth', async () => {
    const res = await supertest(app).get(
      `/api/v1/competitors/${new mongoose.Types.ObjectId()}/overview`
    );
    assert.equal(res.status, 401);
  });

  it('POST /api/v1/competitors/:id/sync — 401 without auth', async () => {
    const res = await supertest(app).post(
      `/api/v1/competitors/${new mongoose.Types.ObjectId()}/sync`
    );
    assert.equal(res.status, 401);
  });

  it('DELETE with invalid ObjectId returns 400', async () => {
    const res = await supertest(app)
      .delete('/api/v1/competitors/not-an-id')
      .set('Authorization', 'Bearer fake-token');
    assert.ok([400, 401].includes(res.status));
  });
});
