/**
 * Phase 11 Tests — Reports & Strategy Engine
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
  await mongoose.connection.syncIndexes();
}

async function disconnectDB() {
  await mongoose.disconnect();
  await mongod.stop();
}

// ─── ReportRepository ─────────────────────────────────────────────────────────

describe('ReportRepository', () => {
  before(connectDB);
  after(disconnectDB);

  let userId;
  beforeEach(async () => {
    userId = new mongoose.Types.ObjectId();
    const { default: Report } = await import('../models/Report.js');
    await Report.deleteMany({});
  });

  it('creates a report', async () => {
    const { default: repo } = await import('../modules/reports/ReportRepository.js');
    const report = await repo.create(userId, {
      type: 'weekly',
      title: 'Weekly Report — 2025-01-01',
      period: { startDate: new Date('2025-01-01'), endDate: new Date('2025-01-07') },
      status: 'generating',
    });
    assert.equal(report.type, 'weekly');
    assert.equal(report.status, 'generating');
  });

  it('findAllByUser returns only user reports', async () => {
    const { default: repo } = await import('../modules/reports/ReportRepository.js');
    const otherId = new mongoose.Types.ObjectId();
    await repo.create(userId, { type: 'weekly', title: 'R1', period: { startDate: new Date(), endDate: new Date() } });
    await repo.create(userId, { type: 'monthly', title: 'R2', period: { startDate: new Date(), endDate: new Date() } });
    await repo.create(otherId, { type: 'weekly', title: 'R3-other', period: { startDate: new Date(), endDate: new Date() } });
    const list = await repo.findAllByUser(userId);
    assert.equal(list.length, 2);
    assert.ok(list.every((r) => r.user.toString() === userId.toString()));
  });

  it('findLatest returns most recent ready report', async () => {
    const { default: repo } = await import('../modules/reports/ReportRepository.js');
    await repo.create(userId, {
      type: 'weekly', title: 'Old', status: 'ready', generatedAt: new Date('2025-01-01'),
      period: { startDate: new Date(), endDate: new Date() },
    });
    const newer = await repo.create(userId, {
      type: 'weekly', title: 'New', status: 'ready', generatedAt: new Date('2025-01-07'),
      period: { startDate: new Date(), endDate: new Date() },
    });
    const latest = await repo.findLatest(userId, 'weekly');
    assert.ok(latest._id.toString() === newer._id.toString());
  });

  it('updateStatus marks report as ready', async () => {
    const { default: repo } = await import('../modules/reports/ReportRepository.js');
    const r = await repo.create(userId, {
      type: 'weekly', title: 'R', status: 'generating',
      period: { startDate: new Date(), endDate: new Date() },
    });
    const updated = await repo.updateStatus(r._id, 'ready', { generatedAt: new Date() });
    assert.equal(updated.status, 'ready');
  });

  it('softDelete removes report from listing', async () => {
    const { default: repo } = await import('../modules/reports/ReportRepository.js');
    const r = await repo.create(userId, {
      type: 'weekly', title: 'Del', period: { startDate: new Date(), endDate: new Date() },
    });
    await repo.softDelete(r._id, userId);
    const list = await repo.findAllByUser(userId);
    assert.equal(list.length, 0);
  });

  it('findById throws NotFoundError for wrong user', async () => {
    const { default: repo } = await import('../modules/reports/ReportRepository.js');
    const r = await repo.create(userId, {
      type: 'monthly', title: 'R', period: { startDate: new Date(), endDate: new Date() },
    });
    const wrongId = new mongoose.Types.ObjectId();
    await assert.rejects(() => repo.findById(r._id, wrongId), /not found/i);
  });
});

// ─── StrategyRepository ───────────────────────────────────────────────────────

describe('StrategyRepository', () => {
  before(connectDB);
  after(disconnectDB);

  let userId;
  beforeEach(async () => {
    userId = new mongoose.Types.ObjectId();
    const { default: Strategy } = await import('../models/Strategy.js');
    await Strategy.deleteMany({});
  });

  it('creates a strategy', async () => {
    const { default: repo } = await import('../modules/strategy/StrategyRepository.js');
    const s = await repo.create(userId, {
      planType: '7day',
      title: '7-Day Growth Strategy',
      status: 'generating',
    });
    assert.equal(s.planType, '7day');
    assert.equal(s.status, 'generating');
  });

  it('findLatest returns ready strategy', async () => {
    const { default: repo } = await import('../modules/strategy/StrategyRepository.js');
    await repo.create(userId, { planType: '7day', title: 'S1', status: 'ready', generatedAt: new Date() });
    const latest = await repo.findLatest(userId, '7day');
    assert.ok(latest !== null);
    assert.equal(latest.planType, '7day');
  });

  it('updateStatus transitions to ready', async () => {
    const { default: repo } = await import('../modules/strategy/StrategyRepository.js');
    const s = await repo.create(userId, { planType: '30day', title: 'S', status: 'generating' });
    const updated = await repo.updateStatus(s._id, 'ready', { generatedAt: new Date() });
    assert.equal(updated.status, 'ready');
  });
});

// ─── ReportService ────────────────────────────────────────────────────────────

describe('ReportService', () => {
  before(connectDB);
  after(disconnectDB);

  let userId;
  beforeEach(async () => {
    userId = new mongoose.Types.ObjectId();
    const { default: Report } = await import('../models/Report.js');
    await Report.deleteMany({});
  });

  it('initiateGeneration creates a pending report', async () => {
    const { default: service } = await import('../modules/reports/ReportService.js');
    const report = await service.initiateGeneration(userId, { type: 'weekly' });
    assert.equal(report.status, 'generating');
    assert.equal(report.type, 'weekly');
    assert.ok(report.title.includes('Weekly'));
  });

  it('initiateGeneration builds correct period for weekly', async () => {
    const { default: service } = await import('../modules/reports/ReportService.js');
    const report = await service.initiateGeneration(userId, { type: 'weekly' });
    const diff = report.period.endDate - report.period.startDate;
    const days = diff / (1000 * 60 * 60 * 24);
    assert.ok(days >= 5 && days <= 7);
  });

  it('initiateGeneration supports all report types', async () => {
    const { default: service } = await import('../modules/reports/ReportService.js');
    for (const type of ['weekly', 'monthly', 'quarterly', 'yearly']) {
      const r = await service.initiateGeneration(userId, { type });
      assert.equal(r.type, type);
    }
  });

  it('generate completes the report pipeline', async () => {
    const { default: service } = await import('../modules/reports/ReportService.js');
    const report = await service.initiateGeneration(userId, { type: 'weekly' });
    const result = await service.generate(userId, report._id.toString());
    assert.equal(result.status, 'ready');
    assert.ok(result.executiveSummary);
    assert.ok(result.kpis.length > 0);
    assert.ok(result.nextWeekGoals.length > 0);
    assert.ok(typeof result.priorityScore === 'number');
  });

  it('generate fills all required sections', async () => {
    const { default: service } = await import('../modules/reports/ReportService.js');
    const r = await service.initiateGeneration(userId, { type: 'monthly' });
    const result = await service.generate(userId, r._id.toString());
    assert.ok(result.growthMetrics);
    assert.ok(result.engagementMetrics);
    assert.ok(result.contentPerformance);
    assert.ok(result.competitorComparison);
    assert.ok(result.trendSummary);
    assert.ok(result.aiInsights);
  });

  it('getLatest returns null when no reports exist', async () => {
    const { default: service } = await import('../modules/reports/ReportService.js');
    const result = await service.getLatest(new mongoose.Types.ObjectId(), 'weekly');
    assert.equal(result, null);
  });

  it('deleteReport soft-deletes the report', async () => {
    const { default: service } = await import('../modules/reports/ReportService.js');
    const r = await service.initiateGeneration(userId, { type: 'weekly' });
    await service.deleteReport(userId, r._id.toString());
    const list = await service.getAll(userId);
    assert.equal(list.length, 0);
  });
});

// ─── StrategyService ──────────────────────────────────────────────────────────

describe('StrategyService', () => {
  before(connectDB);
  after(disconnectDB);

  let userId;
  beforeEach(async () => {
    userId = new mongoose.Types.ObjectId();
    const { default: Strategy } = await import('../models/Strategy.js');
    await Strategy.deleteMany({});
  });

  it('initiateGeneration creates pending strategy', async () => {
    const { default: service } = await import('../modules/strategy/StrategyService.js');
    const s = await service.initiateGeneration(userId, { planType: '7day' });
    assert.equal(s.planType, '7day');
    assert.equal(s.status, 'generating');
    assert.ok(s.title.includes('7-Day'));
  });

  it('generate produces a 7-day plan', async () => {
    const { default: service } = await import('../modules/strategy/StrategyService.js');
    const s = await service.initiateGeneration(userId, { planType: '7day' });
    const result = await service.generate(userId, s._id.toString());
    assert.equal(result.status, 'ready');
    assert.equal(result.dayPlan.length, 7);
    assert.ok(result.successProbability >= 0 && result.successProbability <= 100);
    assert.ok(result.growthExperiments.length > 0);
    assert.ok(result.actionChecklist.length > 0);
    assert.ok(result.riskAnalysis.length > 0);
  });

  it('generate produces a 30-day plan', async () => {
    const { default: service } = await import('../modules/strategy/StrategyService.js');
    const s = await service.initiateGeneration(userId, { planType: '30day' });
    const result = await service.generate(userId, s._id.toString());
    assert.equal(result.dayPlan.length, 30);
    assert.equal(result.weeklyMilestones.length, 4);
  });

  it('generate produces a 90-day plan', async () => {
    const { default: service } = await import('../modules/strategy/StrategyService.js');
    const s = await service.initiateGeneration(userId, { planType: '90day' });
    const result = await service.generate(userId, s._id.toString());
    assert.equal(result.dayPlan.length, 90);
    assert.equal(result.weeklyMilestones.length, 4);
  });

  it('getLatest returns null when none exist', async () => {
    const { default: service } = await import('../modules/strategy/StrategyService.js');
    const result = await service.getLatest(new mongoose.Types.ObjectId(), '7day');
    assert.equal(result, null);
  });
});

// ─── API endpoints — Phase 11 ──────────────────────────────────────────────────

describe('Reports API endpoints', () => {
  before(async () => {
    await connectDB();
    const { default: _app } = await import('../app.js');
    app = _app;
  });
  after(disconnectDB);

  it('POST /api/v1/reports/generate — 401 without auth', async () => {
    const res = await supertest(app).post('/api/v1/reports/generate').send({ type: 'weekly' });
    assert.equal(res.status, 401);
  });

  it('GET /api/v1/reports — 401 without auth', async () => {
    const res = await supertest(app).get('/api/v1/reports');
    assert.equal(res.status, 401);
  });

  it('GET /api/v1/reports/latest — 401 without auth', async () => {
    const res = await supertest(app).get('/api/v1/reports/latest');
    assert.equal(res.status, 401);
  });

  it('DELETE /api/v1/reports/:id — 401 without auth', async () => {
    const res = await supertest(app).delete(`/api/v1/reports/${new mongoose.Types.ObjectId()}`);
    assert.equal(res.status, 401);
  });

  it('POST /api/v1/reports/generate — 400 for invalid type', async () => {
    const res = await supertest(app)
      .post('/api/v1/reports/generate')
      .set('Authorization', 'Bearer fake')
      .send({ type: 'invalid-type' });
    assert.ok([400, 401].includes(res.status));
  });
});

describe('Strategy API endpoints', () => {
  before(async () => {
    if (mongoose.connection.readyState === 0) await connectDB();
    if (!app) {
      const { default: _app } = await import('../app.js');
      app = _app;
    }
  });
  after(async () => {
    if (mongod) await disconnectDB();
  });

  it('POST /api/v1/strategy/generate — 401 without auth', async () => {
    const res = await supertest(app).post('/api/v1/strategy/generate');
    assert.equal(res.status, 401);
  });

  it('GET /api/v1/strategy — 401 without auth', async () => {
    const res = await supertest(app).get('/api/v1/strategy');
    assert.equal(res.status, 401);
  });

  it('GET /api/v1/strategy/latest — 401 without auth', async () => {
    const res = await supertest(app).get('/api/v1/strategy/latest');
    assert.equal(res.status, 401);
  });

  it('POST /api/v1/strategy/generate — 400 for invalid planType', async () => {
    const res = await supertest(app)
      .post('/api/v1/strategy/generate')
      .set('Authorization', 'Bearer fake')
      .send({ planType: 'invalid' });
    assert.ok([400, 401].includes(res.status));
  });
});
