/**
 * Phase 9 Tests — Trend Intelligence Engine
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
}

async function disconnectDB() {
  await mongoose.disconnect();
  await mongod.stop();
}

// ─── TrendRepository ──────────────────────────────────────────────────────────

describe('TrendRepository', () => {
  before(connectDB);
  after(disconnectDB);

  beforeEach(async () => {
    const { default: TrendData } = await import('../models/TrendData.js');
    await TrendData.deleteMany({});
  });

  it('upserts a trend', async () => {
    const { default: repo } = await import('../modules/trends/TrendRepository.js');
    const trend = await repo.upsert({
      category: 'hashtag',
      name: '#viral',
      trendScore: 90,
      growthRate: 25,
      volume: 500_000,
      platform: 'instagram',
    });
    assert.equal(trend.name, '#viral');
    assert.equal(trend.trendScore, 90);
  });

  it('does not duplicate same trend on same day', async () => {
    const { default: repo } = await import('../modules/trends/TrendRepository.js');
    await repo.upsert({ category: 'topic', name: 'AI tools', trendScore: 80, platform: 'all' });
    await repo.upsert({ category: 'topic', name: 'AI tools', trendScore: 85, platform: 'all' });

    const { default: TrendData } = await import('../models/TrendData.js');
    const count = await TrendData.countDocuments({ name: 'AI tools', category: 'topic' });
    assert.equal(count, 1);
  });

  it('bulkUpsert stores multiple trends', async () => {
    const { default: repo } = await import('../modules/trends/TrendRepository.js');
    const trends = ['#one', '#two', '#three'].map((name) => ({
      category: 'hashtag',
      name,
      trendScore: 70,
      platform: 'tiktok',
    }));
    const result = await repo.bulkUpsert(trends);
    assert.ok(result.upsertedCount + result.modifiedCount >= 1);
  });

  it('findHashtags returns only hashtag category', async () => {
    const { default: repo } = await import('../modules/trends/TrendRepository.js');
    await repo.upsert({ category: 'hashtag', name: '#test', trendScore: 60, platform: 'all' });
    await repo.upsert({ category: 'topic', name: 'Test Topic', trendScore: 70, platform: 'all' });
    const hashtags = await repo.findHashtags({ limit: 10 });
    assert.ok(hashtags.every((h) => h.category === 'hashtag'));
  });

  it('findTopics returns only topic category', async () => {
    const { default: repo } = await import('../modules/trends/TrendRepository.js');
    await repo.upsert({ category: 'topic', name: 'My Topic', trendScore: 75, platform: 'all' });
    const topics = await repo.findTopics({ limit: 10 });
    assert.ok(topics.every((t) => t.category === 'topic'));
  });

  it('markExpired updates expired trends', async () => {
    const { default: repo } = await import('../modules/trends/TrendRepository.js');
    await repo.upsert({
      category: 'hashtag',
      name: '#expiredone',
      trendScore: 10,
      platform: 'all',
      expiresAt: new Date(Date.now() - 1000), // already expired
      status: 'rising',
    });
    const count = await repo.markExpired();
    assert.ok(count >= 1);
  });

  it('findHighVelocity returns trends sorted by growthRate', async () => {
    const { default: repo } = await import('../modules/trends/TrendRepository.js');
    await repo.upsert({ category: 'keyword', name: 'fast', growthRate: 80, trendScore: 70, platform: 'all' });
    await repo.upsert({ category: 'keyword', name: 'slow', growthRate: 5, trendScore: 60, platform: 'all' });
    const velocity = await repo.findHighVelocity({ limit: 5 });
    assert.ok(velocity.length >= 1);
    if (velocity.length > 1) {
      assert.ok(velocity[0].growthRate >= velocity[1].growthRate);
    }
  });
});

// ─── TrendCollector ───────────────────────────────────────────────────────────

describe('TrendCollector', () => {
  before(connectDB);
  after(disconnectDB);

  beforeEach(async () => {
    const { default: TrendData } = await import('../models/TrendData.js');
    await TrendData.deleteMany({});
  });

  it('collects trends for a single platform', async () => {
    const { default: collector } = await import('../modules/trends/TrendCollector.js');
    const result = await collector.collect('instagram', null);
    assert.equal(result.platform, 'instagram');
    assert.ok(result.stored >= 0);
  });

  it('collects trends for all platforms', async () => {
    const { default: collector } = await import('../modules/trends/TrendCollector.js');
    const result = await collector.collect('all');
    assert.ok(result.stored > 0);
  });

  it('collects only hashtag category when specified', async () => {
    const { default: collector } = await import('../modules/trends/TrendCollector.js');
    await collector.collect('youtube', 'hashtag');
    const { default: TrendData } = await import('../models/TrendData.js');
    const nonHashtags = await TrendData.countDocuments({ category: { $ne: 'hashtag' } });
    assert.equal(nonHashtags, 0);
  });
});

// ─── TrendAnalyzer ────────────────────────────────────────────────────────────

describe('TrendAnalyzer', () => {
  it('calcVelocity: zero previous volume returns 100', async () => {
    const { default: analyzer } = await import('../modules/trends/TrendAnalyzer.js');
    assert.equal(analyzer.calcVelocity(1000, 0), 100);
  });

  it('calcVelocity: same volumes return 0', async () => {
    const { default: analyzer } = await import('../modules/trends/TrendAnalyzer.js');
    assert.equal(analyzer.calcVelocity(1000, 1000), 0);
  });

  it('calcTrendScore: returns 0-100', async () => {
    const { default: analyzer } = await import('../modules/trends/TrendAnalyzer.js');
    const score = analyzer.calcTrendScore({ volume: 500_000, growthRate: 50, velocity: 30, recencyDays: 2 });
    assert.ok(score >= 0 && score <= 100, `Score ${score} out of range`);
  });

  it('calcConfidence: increases with more data signals', async () => {
    const { default: analyzer } = await import('../modules/trends/TrendAnalyzer.js');
    const low = analyzer.calcConfidence({ volume: 0, growthRate: 0, relatedTags: [] });
    const high = analyzer.calcConfidence({ volume: 50_000, growthRate: 30, relatedTags: ['a', 'b', 'c', 'd'] });
    assert.ok(high > low);
  });

  it('estimateLifespan: hashtag lifespan shorter than format', async () => {
    const { default: analyzer } = await import('../modules/trends/TrendAnalyzer.js');
    const hashtag = analyzer.estimateLifespan('hashtag');
    const format = analyzer.estimateLifespan('format');
    assert.ok(hashtag < format);
  });

  it('classifyTrend: high growth + high score = viral', async () => {
    const { default: analyzer } = await import('../modules/trends/TrendAnalyzer.js');
    const cls = analyzer.classifyTrend({ category: 'hashtag', trendScore: 85, growthRate: 60 });
    assert.equal(cls, 'viral');
  });

  it('classifyTrend: format = evergreen', async () => {
    const { default: analyzer } = await import('../modules/trends/TrendAnalyzer.js');
    const cls = analyzer.classifyTrend({ category: 'format', trendScore: 70, growthRate: 10 });
    assert.equal(cls, 'evergreen');
  });

  it('summariseTrendLandscape: counts categories and statuses', async () => {
    const { default: analyzer } = await import('../modules/trends/TrendAnalyzer.js');
    const trends = [
      { category: 'hashtag', status: 'rising', trendScore: 80 },
      { category: 'hashtag', status: 'peak', trendScore: 90 },
      { category: 'topic', status: 'rising', trendScore: 70 },
    ];
    const summary = analyzer.summariseTrendLandscape(trends);
    assert.equal(summary.total, 3);
    assert.equal(summary.byCategory.hashtag, 2);
    assert.equal(summary.byStatus.rising, 2);
  });
});

// ─── TrendService ─────────────────────────────────────────────────────────────

describe('TrendService', () => {
  before(connectDB);
  after(disconnectDB);

  it('refreshTrends returns collected and enriched counts', async () => {
    const { default: TrendData } = await import('../models/TrendData.js');
    await TrendData.deleteMany({});
    const { default: service } = await import('../modules/trends/TrendService.js');
    const result = await service.refreshTrends({ platform: 'instagram' });
    assert.equal(result.success, true);
    assert.ok(result.collected >= 0);
    assert.ok(result.enriched >= 0);
  });

  it('getTrends returns stored trends after refresh', async () => {
    const { default: service } = await import('../modules/trends/TrendService.js');
    const trends = await service.getTrends({ limit: 10 });
    assert.ok(Array.isArray(trends));
  });

  it('getTopics returns only topic category', async () => {
    const { default: service } = await import('../modules/trends/TrendService.js');
    const topics = await service.getTopics({ limit: 5 });
    assert.ok(topics.every((t) => t.category === 'topic'));
  });

  it('getHashtags returns only hashtag category', async () => {
    const { default: service } = await import('../modules/trends/TrendService.js');
    const hashtags = await service.getHashtags({ limit: 5 });
    assert.ok(hashtags.every((h) => h.category === 'hashtag'));
  });
});

// ─── Trend API endpoints ──────────────────────────────────────────────────────

describe('Trend API endpoints', () => {
  before(async () => {
    await connectDB();
    const { default: _app } = await import('../app.js');
    app = _app;
  });
  after(disconnectDB);

  it('GET /api/v1/trends — public, returns 200', async () => {
    const res = await supertest(app).get('/api/v1/trends');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
  });

  it('GET /api/v1/trends/topics — public, returns 200', async () => {
    const res = await supertest(app).get('/api/v1/trends/topics');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
  });

  it('GET /api/v1/trends/hashtags — public, returns 200', async () => {
    const res = await supertest(app).get('/api/v1/trends/hashtags');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
  });

  it('GET /api/v1/trends/creators — public, returns 200', async () => {
    const res = await supertest(app).get('/api/v1/trends/creators');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
  });

  it('POST /api/v1/trends/refresh — 401 without auth', async () => {
    const res = await supertest(app).post('/api/v1/trends/refresh');
    assert.equal(res.status, 401);
  });

  it('GET /api/v1/trends?platform=invalid — returns 400', async () => {
    const res = await supertest(app).get('/api/v1/trends?platform=badplatform');
    assert.equal(res.status, 400);
  });

  it('GET /api/v1/trends?category=hashtag — filters correctly', async () => {
    const res = await supertest(app).get('/api/v1/trends?category=hashtag');
    assert.equal(res.status, 200);
    const data = res.body.data;
    assert.ok(data.every((t) => t.category === 'hashtag'));
  });
});
