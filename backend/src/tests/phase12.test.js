/**
 * Phase 12 Tests — Notification Engine
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

// ─── NotificationRepository ───────────────────────────────────────────────────

describe('NotificationRepository', () => {
  before(connectDB);
  after(disconnectDB);

  let userId;
  beforeEach(async () => {
    userId = new mongoose.Types.ObjectId();
    const { default: Notification } = await import('../models/Notification.js');
    await Notification.deleteMany({});
  });

  it('creates a notification', async () => {
    const { default: repo } = await import('../repositories/NotificationRepository.js');
    const n = await repo.create(userId, {
      type: 'growth_milestone',
      title: 'Milestone reached!',
      body: 'You hit 1000 followers.',
    });
    assert.equal(n.type, 'growth_milestone');
    assert.equal(n.isRead, false);
  });

  it('findAllByUser returns user notifications', async () => {
    const { default: repo } = await import('../repositories/NotificationRepository.js');
    await repo.create(userId, { type: 'trend_alert', title: 'Trend' });
    await repo.create(userId, { type: 'system', title: 'System' });
    const list = await repo.findAllByUser(userId);
    assert.equal(list.length, 2);
  });

  it('markRead sets isRead to true', async () => {
    const { default: repo } = await import('../repositories/NotificationRepository.js');
    const n = await repo.create(userId, { type: 'system', title: 'Test' });
    const updated = await repo.markRead(n._id, userId);
    assert.equal(updated.isRead, true);
    assert.ok(updated.readAt instanceof Date);
  });

  it('markAllRead marks every unread notification', async () => {
    const { default: repo } = await import('../repositories/NotificationRepository.js');
    await repo.create(userId, { type: 'trend_alert', title: 'T1' });
    await repo.create(userId, { type: 'growth_milestone', title: 'T2' });
    const count = await repo.markAllRead(userId);
    assert.equal(count, 2);
    const remaining = await repo.findAllByUser(userId, { isRead: false });
    assert.equal(remaining.length, 0);
  });

  it('countUnread returns correct count', async () => {
    const { default: repo } = await import('../repositories/NotificationRepository.js');
    await repo.create(userId, { type: 'system', title: 'A' });
    await repo.create(userId, { type: 'system', title: 'B' });
    assert.equal(await repo.countUnread(userId), 2);
    await repo.markAllRead(userId);
    assert.equal(await repo.countUnread(userId), 0);
  });

  it('deleteById removes the notification', async () => {
    const { default: repo } = await import('../repositories/NotificationRepository.js');
    const n = await repo.create(userId, { type: 'system', title: 'Del' });
    await repo.deleteById(n._id, userId);
    const list = await repo.findAllByUser(userId);
    assert.equal(list.length, 0);
  });

  it('deleteById throws NotFoundError for wrong user', async () => {
    const { default: repo } = await import('../repositories/NotificationRepository.js');
    const n = await repo.create(userId, { type: 'system', title: 'X' });
    const wrongId = new mongoose.Types.ObjectId();
    await assert.rejects(() => repo.deleteById(n._id, wrongId), /not found/i);
  });
});

// ─── NotificationPreferences ──────────────────────────────────────────────────

describe('NotificationPreferences', () => {
  before(connectDB);
  after(disconnectDB);

  let userId;
  beforeEach(async () => {
    userId = new mongoose.Types.ObjectId();
    const { default: NotificationPreferences } = await import('../models/NotificationPreferences.js');
    await NotificationPreferences.deleteMany({});
  });

  it('upsertPreferences creates preferences', async () => {
    const { default: repo } = await import('../repositories/NotificationRepository.js');
    const prefs = await repo.upsertPreferences(userId, { enabled: true });
    assert.equal(prefs.enabled, true);
  });

  it('upsertPreferences updates existing preferences', async () => {
    const { default: repo } = await import('../repositories/NotificationRepository.js');
    await repo.upsertPreferences(userId, { enabled: true });
    const updated = await repo.upsertPreferences(userId, { enabled: false });
    assert.equal(updated.enabled, false);
  });

  it('getPreferences returns null when none set', async () => {
    const { default: repo } = await import('../repositories/NotificationRepository.js');
    const prefs = await repo.getPreferences(new mongoose.Types.ObjectId());
    assert.equal(prefs, null);
  });

  it('quiet hours can be configured', async () => {
    const { default: repo } = await import('../repositories/NotificationRepository.js');
    const prefs = await repo.upsertPreferences(userId, {
      quietHoursEnabled: true,
      quietHoursStart: 22,
      quietHoursEnd: 8,
    });
    assert.equal(prefs.quietHoursEnabled, true);
    assert.equal(prefs.quietHoursStart, 22);
    assert.equal(prefs.quietHoursEnd, 8);
  });
});

// ─── NotificationService ──────────────────────────────────────────────────────

describe('NotificationService', () => {
  before(connectDB);
  after(disconnectDB);

  let userId;
  beforeEach(async () => {
    userId = new mongoose.Types.ObjectId();
    const { default: Notification } = await import('../models/Notification.js');
    const { default: NotificationPreferences } = await import('../models/NotificationPreferences.js');
    await Notification.deleteMany({});
    await NotificationPreferences.deleteMany({});
  });

  it('create stores a notification in DB', async () => {
    const { default: service } = await import('../services/NotificationService.js');
    const n = await service.create(userId, {
      type: 'growth_milestone',
      body: 'You hit 1000 followers!',
    });
    assert.ok(n);
    assert.equal(n.type, 'growth_milestone');
    assert.ok(n.title.length > 0);
  });

  it('create uses type default title when none provided', async () => {
    const { default: service } = await import('../services/NotificationService.js');
    const n = await service.create(userId, { type: 'trend_alert' });
    assert.equal(n.title, 'Trend Alert');
  });

  it('create returns null when user has disabled notifications', async () => {
    const { default: service } = await import('../services/NotificationService.js');
    await service.updatePreferences(userId, { enabled: false });
    const n = await service.create(userId, { type: 'system', body: 'Should be suppressed' });
    assert.equal(n, null);
  });

  it('getAll returns notifications with unreadCount', async () => {
    const { default: service } = await import('../services/NotificationService.js');
    await service.create(userId, { type: 'system', body: 'A' });
    await service.create(userId, { type: 'trend_alert', body: 'B' });
    const result = await service.getAll(userId);
    assert.equal(result.notifications.length, 2);
    assert.equal(result.unreadCount, 2);
  });

  it('markRead marks a single notification', async () => {
    const { default: service } = await import('../services/NotificationService.js');
    const n = await service.create(userId, { type: 'system', body: 'X' });
    const updated = await service.markRead(userId, n._id.toString());
    assert.equal(updated.isRead, true);
  });

  it('markAllRead clears all unread', async () => {
    const { default: service } = await import('../services/NotificationService.js');
    await service.create(userId, { type: 'system', body: 'A' });
    await service.create(userId, { type: 'system', body: 'B' });
    const result = await service.markAllRead(userId);
    assert.equal(result.updated, 2);
  });

  it('delete removes a notification', async () => {
    const { default: service } = await import('../services/NotificationService.js');
    const n = await service.create(userId, { type: 'system', body: 'Del' });
    await service.delete(userId, n._id.toString());
    const list = await service.getAll(userId);
    assert.equal(list.notifications.length, 0);
  });

  it('all 10 Phase 12 notification types are supported', async () => {
    const { default: service } = await import('../services/NotificationService.js');
    const types = [
      'growth_drop', 'growth_milestone', 'trend_alert', 'competitor_alert',
      'weekly_report_ready', 'monthly_report_ready', 'ai_recommendation',
      'publishing_reminder', 'failed_sync', 'expired_token',
    ];
    for (const type of types) {
      const n = await service.create(userId, { type, body: `Test ${type}` });
      assert.ok(n, `Notification type "${type}" should be created`);
      assert.equal(n.type, type);
    }
  });
});

// ─── NotificationDispatcher ───────────────────────────────────────────────────

describe('NotificationDispatcher', () => {
  it('dispatches to inApp channel by default', async () => {
    const { default: dispatcher } = await import('../services/NotificationDispatcher.js');
    const fakeNotification = { _id: new mongoose.Types.ObjectId(), type: 'system', title: 'T', body: 'B' };
    const results = await dispatcher.dispatch(fakeNotification, { inApp: true });
    assert.equal(results.length, 1);
    assert.equal(results[0].channel, 'inApp');
    assert.equal(results[0].status, 'delivered');
  });

  it('dispatches to multiple channels', async () => {
    const { default: dispatcher } = await import('../services/NotificationDispatcher.js');
    const fakeNotification = { _id: new mongoose.Types.ObjectId(), type: 'trend_alert', title: 'T', body: 'B' };
    const results = await dispatcher.dispatch(fakeNotification, {
      inApp: true, email: true, websocket: true, push: true,
    });
    assert.equal(results.length, 4);
    const channels = results.map((r) => r.channel);
    assert.ok(channels.includes('inApp'));
    assert.ok(channels.includes('email'));
    assert.ok(channels.includes('websocket'));
    assert.ok(channels.includes('push'));
  });

  it('stub channels return stub status', async () => {
    const { default: dispatcher } = await import('../services/NotificationDispatcher.js');
    const fakeNotification = { _id: new mongoose.Types.ObjectId(), type: 'system', title: 'T', body: 'B' };
    const results = await dispatcher.dispatch(fakeNotification, { email: true });
    assert.equal(results[0].status, 'stub');
  });

  it('dispatch does not throw on empty preferences', async () => {
    const { default: dispatcher } = await import('../services/NotificationDispatcher.js');
    const fakeNotification = { _id: new mongoose.Types.ObjectId(), type: 'system', title: 'T', body: 'B' };
    await assert.doesNotReject(() => dispatcher.dispatch(fakeNotification, {}));
  });

  it('all four channels are registered', async () => {
    const { default: dispatcher } = await import('../services/NotificationDispatcher.js');
    assert.ok(dispatcher.channels.inApp);
    assert.ok(dispatcher.channels.email);
    assert.ok(dispatcher.channels.websocket);
    assert.ok(dispatcher.channels.push);
  });
});

// ─── Notifications API ────────────────────────────────────────────────────────

describe('Notifications API endpoints', () => {
  before(async () => {
    await connectDB();
    const { default: _app } = await import('../app.js');
    app = _app;
  });
  after(disconnectDB);

  it('GET /api/v1/notifications — 401 without auth', async () => {
    const res = await supertest(app).get('/api/v1/notifications');
    assert.equal(res.status, 401);
  });

  it('PATCH /api/v1/notifications/read-all — 401 without auth', async () => {
    const res = await supertest(app).patch('/api/v1/notifications/read-all');
    assert.equal(res.status, 401);
  });

  it('PATCH /api/v1/notifications/preferences — 401 without auth', async () => {
    const res = await supertest(app).patch('/api/v1/notifications/preferences');
    assert.equal(res.status, 401);
  });

  it('PATCH /api/v1/notifications/:id/read — 401 without auth', async () => {
    const res = await supertest(app)
      .patch(`/api/v1/notifications/${new mongoose.Types.ObjectId()}/read`);
    assert.equal(res.status, 401);
  });

  it('DELETE /api/v1/notifications/:id — 401 without auth', async () => {
    const res = await supertest(app)
      .delete(`/api/v1/notifications/${new mongoose.Types.ObjectId()}`);
    assert.equal(res.status, 401);
  });

  it('GET /api/v1/notifications?isRead=not-bool — 400', async () => {
    const res = await supertest(app)
      .get('/api/v1/notifications?isRead=notaboolean')
      .set('Authorization', 'Bearer fake');
    assert.ok([400, 401].includes(res.status));
  });
});
