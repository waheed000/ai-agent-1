/**
 * Phase 13 Tests — Content Planner
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

// ─── PlannerRepository ────────────────────────────────────────────────────────

describe('PlannerRepository', () => {
  before(connectDB);
  after(disconnectDB);

  let userId;
  beforeEach(async () => {
    userId = new mongoose.Types.ObjectId();
    const { default: ContentPlan } = await import('../models/ContentPlan.js');
    await ContentPlan.deleteMany({});
  });

  it('creates a content plan item', async () => {
    const { default: repo } = await import('../modules/content/PlannerRepository.js');
    const item = await repo.create(userId, {
      title: 'Post about AI',
      platform: 'instagram',
      suggestedTime: new Date(),
      status: 'draft',
    });
    assert.equal(item.title, 'Post about AI');
    assert.equal(item.platform, 'instagram');
    assert.equal(item.status, 'draft');
  });

  it('bulkCreate inserts multiple items', async () => {
    const { default: repo } = await import('../modules/content/PlannerRepository.js');
    const items = Array.from({ length: 5 }, (_, i) => ({
      title: `Item ${i}`,
      platform: 'tiktok',
      suggestedTime: new Date(Date.now() + i * 86_400_000),
    }));
    const created = await repo.bulkCreate(userId, items);
    assert.equal(created.length, 5);
  });

  it('findAllByUser filters by status', async () => {
    const { default: repo } = await import('../modules/content/PlannerRepository.js');
    await repo.create(userId, { title: 'Draft', platform: 'instagram', status: 'draft' });
    await repo.create(userId, { title: 'Published', platform: 'instagram', status: 'published' });
    const drafts = await repo.findAllByUser(userId, { status: 'draft' });
    assert.equal(drafts.length, 1);
    assert.equal(drafts[0].status, 'draft');
  });

  it('update changes fields', async () => {
    const { default: repo } = await import('../modules/content/PlannerRepository.js');
    const item = await repo.create(userId, { title: 'Old', platform: 'instagram', status: 'draft' });
    const updated = await repo.update(item._id, userId, { status: 'review', title: 'New' });
    assert.equal(updated.status, 'review');
    assert.equal(updated.title, 'New');
  });

  it('softDelete removes from listing', async () => {
    const { default: repo } = await import('../modules/content/PlannerRepository.js');
    const item = await repo.create(userId, { title: 'Del', platform: 'instagram' });
    await repo.softDelete(item._id, userId);
    const list = await repo.findAllByUser(userId);
    assert.equal(list.length, 0);
  });

  it('findCalendar returns items in date range', async () => {
    const { default: repo } = await import('../modules/content/PlannerRepository.js');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 10);

    await repo.create(userId, { title: 'Today', platform: 'instagram', suggestedTime: today });
    await repo.create(userId, { title: 'Next week', platform: 'instagram', suggestedTime: nextWeek });

    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const end = new Date(tomorrow);
    end.setHours(23, 59, 59, 999);

    const items = await repo.findCalendar(userId, start, end);
    assert.equal(items.length, 1);
    assert.equal(items[0].title, 'Today');
  });
});

// ─── DraftRepository ──────────────────────────────────────────────────────────

describe('DraftRepository', () => {
  before(connectDB);
  after(disconnectDB);

  let userId;
  beforeEach(async () => {
    userId = new mongoose.Types.ObjectId();
    const { default: Draft } = await import('../models/Draft.js');
    await Draft.deleteMany({});
  });

  it('creates a draft', async () => {
    const { default: repo } = await import('../modules/content/DraftRepository.js');
    const draft = await repo.create(userId, {
      title: 'My first draft',
      caption: 'Check this out!',
      platform: 'instagram',
      status: 'draft',
    });
    assert.equal(draft.title, 'My first draft');
    assert.equal(draft.versionNumber, 1);
  });

  it('findAllByUser filters by status', async () => {
    const { default: repo } = await import('../modules/content/DraftRepository.js');
    await repo.create(userId, { title: 'D1', platform: 'instagram', status: 'draft' });
    await repo.create(userId, { title: 'D2', platform: 'youtube', status: 'review' });
    const drafts = await repo.findAllByUser(userId, { status: 'draft' });
    assert.equal(drafts.length, 1);
  });

  it('update changes fields', async () => {
    const { default: repo } = await import('../modules/content/DraftRepository.js');
    const d = await repo.create(userId, { title: 'Old', platform: 'instagram' });
    const updated = await repo.update(d._id, userId, { title: 'New', status: 'review' });
    assert.equal(updated.title, 'New');
    assert.equal(updated.status, 'review');
  });

  it('softDelete removes draft', async () => {
    const { default: repo } = await import('../modules/content/DraftRepository.js');
    const d = await repo.create(userId, { title: 'Del', platform: 'instagram' });
    await repo.softDelete(d._id, userId);
    const list = await repo.findAllByUser(userId);
    assert.equal(list.length, 0);
  });

  it('createVersion increments version number', async () => {
    const { default: repo } = await import('../modules/content/DraftRepository.js');
    const original = await repo.create(userId, { title: 'V1', platform: 'instagram' });
    const v2 = await repo.createVersion(original._id, userId, { title: 'V2', caption: 'Updated' });
    assert.equal(v2.versionNumber, 2);
    assert.equal(v2.previousVersion.toString(), original._id.toString());
  });
});

// ─── PlannerService ───────────────────────────────────────────────────────────

describe('PlannerService', () => {
  before(connectDB);
  after(disconnectDB);

  let userId;
  beforeEach(async () => {
    userId = new mongoose.Types.ObjectId();
    const { default: ContentPlan } = await import('../models/ContentPlan.js');
    const { default: Draft } = await import('../models/Draft.js');
    await ContentPlan.deleteMany({});
    await Draft.deleteMany({});
  });

  it('generate creates the correct number of items', async () => {
    const { default: service } = await import('../modules/content/PlannerService.js');
    const result = await service.generate(userId, { days: 7, platforms: ['instagram'] });
    assert.equal(result.generated, 7);
    assert.equal(result.days, 7);
  });

  it('generate creates items with required fields', async () => {
    const { default: service } = await import('../modules/content/PlannerService.js');
    const result = await service.generate(userId, { days: 3, platforms: ['tiktok'] });
    for (const item of result.items) {
      assert.ok(item.title);
      assert.ok(item.platform);
      assert.ok(item.contentType);
      assert.ok(item.suggestedTime);
      assert.ok(item.aiCaption);
    }
  });

  it('generate distributes across multiple platforms', async () => {
    const { default: service } = await import('../modules/content/PlannerService.js');
    const result = await service.generate(userId, { days: 6, platforms: ['instagram', 'tiktok'] });
    const platforms = [...new Set(result.items.map((i) => i.platform))];
    assert.ok(platforms.length >= 2);
  });

  it('update modifies a plan item', async () => {
    const { default: service } = await import('../modules/content/PlannerService.js');
    const result = await service.generate(userId, { days: 1, platforms: ['instagram'] });
    const item = result.items[0];
    const updated = await service.update(userId, item._id.toString(), { status: 'review', priority: 'high' });
    assert.equal(updated.status, 'review');
    assert.equal(updated.priority, 'high');
  });

  it('delete soft-deletes an item', async () => {
    const { default: service } = await import('../modules/content/PlannerService.js');
    const result = await service.generate(userId, { days: 1, platforms: ['instagram'] });
    const item = result.items[0];
    await service.delete(userId, item._id.toString());
    const list = await service.getAll(userId);
    assert.equal(list.length, 0);
  });

  it('createDraft stores a draft in DB', async () => {
    const { default: service } = await import('../modules/content/PlannerService.js');
    const draft = await service.createDraft(userId, {
      title: 'Test Draft',
      caption: 'Hello world',
      platform: 'instagram',
    });
    assert.equal(draft.title, 'Test Draft');
    assert.equal(draft.status, 'draft');
  });

  it('updateDraft changes draft fields', async () => {
    const { default: service } = await import('../modules/content/PlannerService.js');
    const draft = await service.createDraft(userId, { title: 'D1', platform: 'instagram' });
    const updated = await service.updateDraft(userId, draft._id.toString(), {
      title: 'D1 Updated',
      status: 'review',
    });
    assert.equal(updated.title, 'D1 Updated');
    assert.equal(updated.status, 'review');
  });

  it('deleteDraft soft-deletes the draft', async () => {
    const { default: service } = await import('../modules/content/PlannerService.js');
    const draft = await service.createDraft(userId, { title: 'Del', platform: 'instagram' });
    await service.deleteDraft(userId, draft._id.toString());
    const { default: DraftRepository } = await import('../modules/content/DraftRepository.js');
    const list = await DraftRepository.findAllByUser(userId);
    assert.equal(list.length, 0);
  });
});

// ─── CalendarService ──────────────────────────────────────────────────────────

describe('CalendarService', () => {
  before(connectDB);
  after(disconnectDB);

  let userId;
  beforeEach(async () => {
    userId = new mongoose.Types.ObjectId();
    const { default: ContentPlan } = await import('../models/ContentPlan.js');
    await ContentPlan.deleteMany({});
  });

  it('getCalendar returns a day array covering the range', async () => {
    const { default: service } = await import('../modules/content/CalendarService.js');
    const start = new Date();
    const end   = new Date();
    end.setDate(end.getDate() + 6);
    const cal = await service.getCalendar(userId, { startDate: start, endDate: end });
    assert.equal(cal.totalDays, 7);
    assert.ok(Array.isArray(cal.days));
  });

  it('getCalendar groups items by date', async () => {
    const { default: calService } = await import('../modules/content/CalendarService.js');
    const { default: planService } = await import('../modules/content/PlannerService.js');
    await planService.generate(userId, { days: 3, platforms: ['instagram'] });

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setDate(end.getDate() + 3);
    end.setHours(23, 59, 59, 999);

    const cal = await calService.getCalendar(userId, { startDate: start, endDate: end });
    assert.ok(cal.totalItems >= 1);
  });

  it('getWeeklySchedule returns 7 days', async () => {
    const { default: service } = await import('../modules/content/CalendarService.js');
    const cal = await service.getWeeklySchedule(userId);
    assert.equal(cal.totalDays, 7);
  });

  it('getMonthlySchedule returns 28-31 days', async () => {
    const { default: service } = await import('../modules/content/CalendarService.js');
    const now = new Date();
    const cal = await service.getMonthlySchedule(userId, now.getFullYear(), now.getMonth() + 1);
    assert.ok(cal.totalDays >= 28 && cal.totalDays <= 31);
  });
});

// ─── ContentWorkflow ──────────────────────────────────────────────────────────

describe('ContentWorkflow', () => {
  before(connectDB);
  after(disconnectDB);

  let userId;
  beforeEach(async () => {
    userId = new mongoose.Types.ObjectId();
    const { default: ContentPlan } = await import('../models/ContentPlan.js');
    await ContentPlan.deleteMany({});
  });

  it('advance moves draft → review', async () => {
    const { default: workflow } = await import('../modules/content/ContentWorkflow.js');
    const { default: planRepo } = await import('../modules/content/PlannerRepository.js');
    const item = await planRepo.create(userId, { title: 'T', platform: 'instagram', status: 'draft' });
    const advanced = await workflow.advance(userId, item._id.toString());
    assert.equal(advanced.status, 'review');
  });

  it('approve transitions review → approved', async () => {
    const { default: workflow } = await import('../modules/content/ContentWorkflow.js');
    const { default: planRepo } = await import('../modules/content/PlannerRepository.js');
    const item = await planRepo.create(userId, { title: 'T', platform: 'instagram', status: 'review' });
    const approved = await workflow.approve(userId, item._id.toString());
    assert.equal(approved.status, 'approved');
  });

  it('reject transitions review → draft with reason', async () => {
    const { default: workflow } = await import('../modules/content/ContentWorkflow.js');
    const { default: planRepo } = await import('../modules/content/PlannerRepository.js');
    const item = await planRepo.create(userId, { title: 'T', platform: 'instagram', status: 'review' });
    const rejected = await workflow.reject(userId, item._id.toString(), 'Needs improvement');
    assert.equal(rejected.status, 'draft');
    assert.equal(rejected.rejectionReason, 'Needs improvement');
  });

  it('publish transitions approved → published', async () => {
    const { default: workflow } = await import('../modules/content/ContentWorkflow.js');
    const { default: planRepo } = await import('../modules/content/PlannerRepository.js');
    const item = await planRepo.create(userId, { title: 'T', platform: 'instagram', status: 'approved' });
    const published = await workflow.publish(userId, item._id.toString());
    assert.equal(published.status, 'published');
    assert.ok(published.publishedAt instanceof Date);
  });

  it('setStatus throws for invalid transition', async () => {
    const { default: workflow } = await import('../modules/content/ContentWorkflow.js');
    const { default: planRepo } = await import('../modules/content/PlannerRepository.js');
    const item = await planRepo.create(userId, { title: 'T', platform: 'instagram', status: 'draft' });
    await assert.rejects(
      () => workflow.setStatus(userId, item._id.toString(), 'published'),
      /cannot transition/i
    );
  });

  it('advance throws when in terminal state (archived)', async () => {
    const { default: workflow } = await import('../modules/content/ContentWorkflow.js');
    const { default: planRepo } = await import('../modules/content/PlannerRepository.js');
    const item = await planRepo.create(userId, { title: 'T', platform: 'instagram', status: 'archived' });
    await assert.rejects(
      () => workflow.advance(userId, item._id.toString()),
      /terminal state/i
    );
  });

  it('transitions map covers all status values', async () => {
    const { ContentWorkflowTransitions } = await import('../modules/content/PublishingService.js');
    const allStatuses = ['draft', 'review', 'approved', 'scheduled', 'published', 'archived'];
    for (const s of allStatuses) {
      assert.ok(s in ContentWorkflowTransitions, `"${s}" missing from transitions map`);
    }
  });

  it('full workflow: draft → review → approved → scheduled → published → archived', async () => {
    const { default: workflow } = await import('../modules/content/ContentWorkflow.js');
    const { default: planRepo } = await import('../modules/content/PlannerRepository.js');
    const item = await planRepo.create(userId, { title: 'Full Flow', platform: 'instagram', status: 'draft' });

    let current = await workflow.setStatus(userId, item._id.toString(), 'review');
    assert.equal(current.status, 'review');

    current = await workflow.approve(userId, item._id.toString());
    assert.equal(current.status, 'approved');

    current = await workflow.schedule(userId, item._id.toString(), new Date(Date.now() + 3600_000));
    assert.equal(current.status, 'scheduled');

    current = await workflow.publish(userId, item._id.toString());
    assert.equal(current.status, 'published');

    current = await workflow.setStatus(userId, item._id.toString(), 'archived');
    assert.equal(current.status, 'archived');
  });
});

// ─── PublishingService ────────────────────────────────────────────────────────

describe('PublishingService', () => {
  before(connectDB);
  after(disconnectDB);

  let userId;
  beforeEach(async () => {
    userId = new mongoose.Types.ObjectId();
    const { default: ContentPlan } = await import('../models/ContentPlan.js');
    const { default: Draft } = await import('../models/Draft.js');
    await ContentPlan.deleteMany({});
    await Draft.deleteMany({});
  });

  it('publishDraft updates draft status to published', async () => {
    const { default: service } = await import('../modules/content/PublishingService.js');
    const { default: draftRepo } = await import('../modules/content/DraftRepository.js');
    const draft = await draftRepo.create(userId, { title: 'Ready', platform: 'instagram', status: 'approved' });
    const published = await service.publishDraft(userId, draft._id.toString());
    assert.equal(published.status, 'published');
    assert.ok(published.publishedAt instanceof Date);
  });

  it('publishDraft throws if draft is in draft status', async () => {
    const { default: service } = await import('../modules/content/PublishingService.js');
    const { default: draftRepo } = await import('../modules/content/DraftRepository.js');
    const draft = await draftRepo.create(userId, { title: 'NotReady', platform: 'instagram', status: 'draft' });
    await assert.rejects(
      () => service.publishDraft(userId, draft._id.toString()),
      /approved or scheduled/i
    );
  });
});

// ─── API endpoints — Phase 13 ──────────────────────────────────────────────────

describe('Planner API endpoints', () => {
  before(async () => {
    await connectDB();
    const { default: _app } = await import('../app.js');
    app = _app;
  });
  after(disconnectDB);

  it('POST /api/v1/planner/generate — 401 without auth', async () => {
    const res = await supertest(app).post('/api/v1/planner/generate').send({ days: 7 });
    assert.equal(res.status, 401);
  });

  it('GET /api/v1/planner — 401 without auth', async () => {
    const res = await supertest(app).get('/api/v1/planner');
    assert.equal(res.status, 401);
  });

  it('GET /api/v1/calendar — 401 without auth', async () => {
    const res = await supertest(app).get('/api/v1/calendar');
    assert.equal(res.status, 401);
  });

  it('POST /api/v1/drafts — 401 without auth', async () => {
    const res = await supertest(app).post('/api/v1/drafts').send({ title: 'Test', platform: 'instagram' });
    assert.equal(res.status, 401);
  });

  it('PATCH /api/v1/drafts/:id — 401 without auth', async () => {
    const res = await supertest(app)
      .patch(`/api/v1/drafts/${new mongoose.Types.ObjectId()}`);
    assert.equal(res.status, 401);
  });

  it('DELETE /api/v1/drafts/:id — 401 without auth', async () => {
    const res = await supertest(app)
      .delete(`/api/v1/drafts/${new mongoose.Types.ObjectId()}`);
    assert.equal(res.status, 401);
  });

  it('PATCH /api/v1/planner/:id — 401 without auth', async () => {
    const res = await supertest(app)
      .patch(`/api/v1/planner/${new mongoose.Types.ObjectId()}`);
    assert.equal(res.status, 401);
  });

  it('POST /api/v1/planner/generate — 400 for days > 90', async () => {
    const res = await supertest(app)
      .post('/api/v1/planner/generate')
      .set('Authorization', 'Bearer fake')
      .send({ days: 91 });
    assert.ok([400, 401].includes(res.status));
  });

  it('GET /api/v1/calendar?startDate=invalid — 400', async () => {
    const res = await supertest(app)
      .get('/api/v1/calendar?startDate=not-a-date')
      .set('Authorization', 'Bearer fake');
    assert.ok([400, 401].includes(res.status));
  });
});
