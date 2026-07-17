/**
 * Phase 14 Tests — Enterprise Platform Features
 *
 * Covers: WorkspaceRepository, ApiKeyRepository, AuditRepository,
 *         UsageRepository, FeatureRepository, SettingsRepository,
 *         WorkspaceService, TeamService, PermissionService,
 *         ApiKeyService, AuditService, UsageService, FeatureService,
 *         SettingsService, SearchService, and HTTP routes.
 *
 * All describe blocks share a single MongoMemoryServer connection
 * to avoid repeated connect/disconnect cycles that cause silent failures.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import supertest from 'supertest';

let mongod;
let app;

// ─── Shared connection lifecycle ──────────────────────────────────────────────

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await mongoose.connection.syncIndexes();
  // Load app once — after mongoose is connected
  const { default: appModule } = await import('../app.js');
  app = appModule;
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function clearCollections(...models) {
  for (const m of models) await m.deleteMany({});
}

// ─── WorkspaceRepository ─────────────────────────────────────────────────────

describe('WorkspaceRepository', () => {
  let repo;
  let Workspace;

  before(async () => {
    ({ default: repo }      = await import('../repositories/WorkspaceRepository.js'));
    ({ default: Workspace } = await import('../models/Workspace.js'));
  });

  beforeEach(async () => {
    await clearCollections(Workspace);
  });

  it('creates a workspace', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const ws = await repo.create(ownerId, { name: 'My Workspace', slug: 'my-workspace' });
    assert.equal(ws.name, 'My Workspace');
    assert.equal(ws.slug, 'my-workspace');
    assert.equal(String(ws.owner), String(ownerId));
  });

  it('findById returns the workspace', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const ws = await repo.create(ownerId, { name: 'WS', slug: 'ws-find' });
    const found = await repo.findById(ws._id);
    assert.equal(String(found._id), String(ws._id));
  });

  it('findAllAccessible returns owner workspaces', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    await repo.create(ownerId, { name: 'A', slug: 'ws-a' });
    await repo.create(ownerId, { name: 'B', slug: 'ws-b' });
    const list = await repo.findAllAccessible(ownerId);
    assert.equal(list.length, 2);
  });

  it('softDelete hides workspace from listing', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const ws = await repo.create(ownerId, { name: 'Del', slug: 'ws-del' });
    await repo.softDelete(ws._id);
    await assert.rejects(() => repo.findById(ws._id), /not found/i);
  });

  it('addMember and removeMember work correctly', async () => {
    const ownerId   = new mongoose.Types.ObjectId();
    const memberId  = new mongoose.Types.ObjectId();
    const ws = await repo.create(ownerId, { name: 'Team', slug: 'ws-team' });
    const withMember = await repo.addMember(ws._id, { user: memberId, role: 'editor' });
    assert.ok(withMember.members.some(m => String(m.user) === String(memberId)));
    const without = await repo.removeMember(ws._id, memberId);
    assert.ok(!without.members.some(m => String(m.user) === String(memberId)));
  });

  it('updateMember changes role', async () => {
    const ownerId  = new mongoose.Types.ObjectId();
    const memberId = new mongoose.Types.ObjectId();
    const ws = await repo.create(ownerId, { name: 'Roles', slug: 'ws-roles' });
    await repo.addMember(ws._id, { user: memberId, role: 'viewer' });
    const updated = await repo.updateMember(ws._id, memberId, 'admin');
    const member  = updated.members.find(m => String(m.user) === String(memberId));
    assert.equal(member.role, 'admin');
  });
});

// ─── ApiKeyRepository ────────────────────────────────────────────────────────

describe('ApiKeyRepository', () => {
  let repo;
  let ApiKey;

  before(async () => {
    ({ default: repo }   = await import('../repositories/ApiKeyRepository.js'));
    ({ default: ApiKey } = await import('../models/ApiKey.js'));
  });

  beforeEach(async () => {
    await clearCollections(ApiKey);
  });

  it('creates an API key', async () => {
    const userId = new mongoose.Types.ObjectId();
    const key = await repo.create(userId, { prefix: 'cos_abcd', keyHash: 'abc123hash', description: 'Test key' });
    assert.equal(key.description, 'Test key');
    assert.equal(key.revoked, false);
  });

  it('findByHash returns non-revoked key', async () => {
    const userId = new mongoose.Types.ObjectId();
    await repo.create(userId, { prefix: 'cos_xxxx', keyHash: 'unique_hash_xyz', description: 'Look me up' });
    const found = await repo.findByHash('unique_hash_xyz');
    assert.ok(found);
    assert.equal(found.description, 'Look me up');
  });

  it('revoke marks key as revoked', async () => {
    const userId = new mongoose.Types.ObjectId();
    const key = await repo.create(userId, { prefix: 'cos_revk', keyHash: 'revoke_hash', description: 'Revoke me' });
    const revoked = await repo.revoke(key._id, userId);
    assert.equal(revoked.revoked, true);
    assert.ok(revoked.revokedAt instanceof Date);
  });

  it('findAllByUser returns only non-deleted keys', async () => {
    const userId = new mongoose.Types.ObjectId();
    const k1 = await repo.create(userId, { prefix: 'cos_1111', keyHash: 'hash1_u', description: 'Key 1' });
    const k2 = await repo.create(userId, { prefix: 'cos_2222', keyHash: 'hash2_u', description: 'Key 2' });
    await repo.softDelete(k2._id, userId);
    const list = await repo.findAllByUser(userId);
    assert.equal(list.length, 1);
    assert.equal(String(list[0]._id), String(k1._id));
  });

  it('findByHash returns null for revoked key', async () => {
    const userId = new mongoose.Types.ObjectId();
    const key = await repo.create(userId, { prefix: 'cos_rvkd', keyHash: 'revoked_hash_key', description: 'Old' });
    await repo.revoke(key._id, userId);
    const found = await repo.findByHash('revoked_hash_key');
    assert.equal(found, null);
  });
});

// ─── AuditRepository ─────────────────────────────────────────────────────────

describe('AuditRepository', () => {
  let repo;
  let AuditLog;

  before(async () => {
    ({ default: repo }     = await import('../repositories/AuditRepository.js'));
    ({ default: AuditLog } = await import('../models/AuditLog.js'));
  });

  beforeEach(async () => {
    await clearCollections(AuditLog);
  });

  it('creates an audit log entry', async () => {
    const userId = new mongoose.Types.ObjectId();
    const log = await repo.create({ user: userId, action: 'auth.login', ip: '127.0.0.1' });
    assert.equal(log.action, 'auth.login');
    assert.equal(String(log.user), String(userId));
  });

  it('findByUser returns logs', async () => {
    const userId = new mongoose.Types.ObjectId();
    await repo.create({ user: userId, action: 'auth.login' });
    await repo.create({ user: userId, action: 'workspace.created' });
    const logs = await repo.findByUser(userId);
    assert.equal(logs.length, 2);
  });

  it('findByUser filters by action', async () => {
    const userId = new mongoose.Types.ObjectId();
    await repo.create({ user: userId, action: 'auth.login' });
    await repo.create({ user: userId, action: 'workspace.created' });
    const logins = await repo.findByUser(userId, { action: 'auth.login' });
    assert.equal(logins.length, 1);
    assert.equal(logins[0].action, 'auth.login');
  });

  it('countByUser returns correct count', async () => {
    const userId = new mongoose.Types.ObjectId();
    await repo.create({ user: userId, action: 'auth.login' });
    await repo.create({ user: userId, action: 'auth.logout' });
    const count = await repo.countByUser(userId);
    assert.equal(count, 2);
  });
});

// ─── UsageRepository ─────────────────────────────────────────────────────────

describe('UsageRepository', () => {
  let repo;
  let UsageRecord;

  before(async () => {
    ({ default: repo }        = await import('../repositories/UsageRepository.js'));
    ({ default: UsageRecord } = await import('../models/UsageRecord.js'));
  });

  beforeEach(async () => {
    await clearCollections(UsageRecord);
  });

  it('records a usage event', async () => {
    const userId = new mongoose.Types.ObjectId();
    const rec = await repo.record(userId, null, { category: 'ai_request', action: 'chat', count: 1 });
    assert.equal(rec.category, 'ai_request');
    assert.equal(rec.count, 1);
  });

  it('findByUser filters by category', async () => {
    const userId = new mongoose.Types.ObjectId();
    await repo.record(userId, null, { category: 'ai_request', action: 'chat' });
    await repo.record(userId, null, { category: 'report', action: 'generate' });
    const aiRecords = await repo.findByUser(userId, { category: 'ai_request' });
    assert.equal(aiRecords.length, 1);
    assert.equal(aiRecords[0].category, 'ai_request');
  });

  it('summarizeByUser aggregates totals by category', async () => {
    const userId = new mongoose.Types.ObjectId();
    await repo.record(userId, null, { category: 'ai_request', action: 'a', count: 3 });
    await repo.record(userId, null, { category: 'ai_request', action: 'b', count: 2 });
    await repo.record(userId, null, { category: 'report', action: 'gen', count: 1 });
    const summary = await repo.summarizeByUser(userId);
    const ai = summary.find(s => s._id === 'ai_request');
    assert.ok(ai);
    assert.equal(ai.totalCount, 5);
  });

  it('countByCategory returns the correct total', async () => {
    const userId = new mongoose.Types.ObjectId();
    await repo.record(userId, null, { category: 'planner', action: 'generate', count: 4 });
    await repo.record(userId, null, { category: 'planner', action: 'generate', count: 6 });
    const total = await repo.countByCategory(userId, 'planner');
    assert.equal(total, 10);
  });
});

// ─── FeatureRepository ────────────────────────────────────────────────────────

describe('FeatureRepository', () => {
  let repo;
  let FeatureFlag;

  before(async () => {
    ({ default: repo }        = await import('../repositories/FeatureRepository.js'));
    ({ default: FeatureFlag } = await import('../models/FeatureFlag.js'));
  });

  beforeEach(async () => {
    await clearCollections(FeatureFlag);
  });

  it('upserts a feature flag', async () => {
    const flag = await repo.upsert('ai', { name: 'AI Features', enabled: true });
    assert.equal(flag.key, 'ai');
    assert.equal(flag.enabled, true);
  });

  it('setEnabled toggles the flag', async () => {
    await repo.upsert('reports', { name: 'Reports', enabled: true });
    const toggled = await repo.setEnabled('reports', false);
    assert.equal(toggled.enabled, false);
  });

  it('findAll returns all flags', async () => {
    await repo.upsert('ai', { name: 'AI', enabled: true });
    await repo.upsert('trends', { name: 'Trends', enabled: true });
    const all = await repo.findAll();
    assert.equal(all.length, 2);
  });
});

// ─── SettingsRepository ───────────────────────────────────────────────────────

describe('SettingsRepository', () => {
  let repo;
  let Settings;

  before(async () => {
    ({ default: repo }     = await import('../repositories/SettingsRepository.js'));
    ({ default: Settings } = await import('../models/Settings.js'));
  });

  beforeEach(async () => {
    await clearCollections(Settings);
  });

  it('upserts user settings', async () => {
    const userId = new mongoose.Types.ObjectId();
    const s = await repo.upsert(userId, 'user', { timezone: 'America/New_York', language: 'en', theme: 'dark' });
    assert.equal(s.type, 'user');
    assert.equal(s.timezone, 'America/New_York');
    assert.equal(s.theme, 'dark');
  });

  it('upsert overwrites existing settings', async () => {
    const userId = new mongoose.Types.ObjectId();
    await repo.upsert(userId, 'user', { theme: 'light' });
    const updated = await repo.upsert(userId, 'user', { theme: 'dark' });
    assert.equal(updated.theme, 'dark');
  });

  it('findByUserAndType returns correct settings', async () => {
    const userId = new mongoose.Types.ObjectId();
    await repo.upsert(userId, 'user', { theme: 'system' });
    await repo.upsert(userId, 'ai', { data: { model: 'gpt-4' } });
    const userSettings = await repo.findByUserAndType(userId, 'user');
    assert.equal(userSettings.theme, 'system');
  });

  it('findAllByUser returns all settings types', async () => {
    const userId = new mongoose.Types.ObjectId();
    await repo.upsert(userId, 'user', { theme: 'light' });
    await repo.upsert(userId, 'notification', { data: { email: true } });
    const all = await repo.findAllByUser(userId);
    assert.equal(all.length, 2);
  });
});

// ─── ApiKeyService ────────────────────────────────────────────────────────────

describe('ApiKeyService', () => {
  let svc;
  let ApiKey;
  let AuditLog;

  before(async () => {
    ({ default: svc }      = await import('../services/ApiKeyService.js'));
    ({ default: ApiKey }   = await import('../models/ApiKey.js'));
    ({ default: AuditLog } = await import('../models/AuditLog.js'));
  });

  beforeEach(async () => {
    await clearCollections(ApiKey, AuditLog);
  });

  it('create returns rawKey starting with cos_', async () => {
    const userId = new mongoose.Types.ObjectId();
    const { apiKey, rawKey } = await svc.create(userId, { description: 'My key' });
    assert.ok(rawKey.startsWith('cos_'));
    assert.equal(apiKey.description, 'My key');
  });

  it('validate returns key doc for valid raw key', async () => {
    const userId = new mongoose.Types.ObjectId();
    const { rawKey } = await svc.create(userId, { description: 'Valid' });
    const found = await svc.validate(rawKey);
    assert.ok(found);
    assert.equal(found.description, 'Valid');
  });

  it('validate returns null for revoked key', async () => {
    const userId = new mongoose.Types.ObjectId();
    const { apiKey, rawKey } = await svc.create(userId, { description: 'Revoke' });
    await svc.revoke(userId, apiKey._id);
    const found = await svc.validate(rawKey);
    assert.equal(found, null);
  });

  it('validate returns null for garbage input', async () => {
    const found = await svc.validate('not-a-real-key');
    assert.equal(found, null);
  });

  it('delete soft-deletes the key', async () => {
    const userId = new mongoose.Types.ObjectId();
    const { apiKey } = await svc.create(userId, { description: 'Delete me' });
    await svc.delete(userId, apiKey._id);
    const list = await svc.getAll(userId);
    assert.equal(list.length, 0);
  });
});

// ─── AuditService ─────────────────────────────────────────────────────────────

describe('AuditService', () => {
  let svc;
  let AuditLog;

  before(async () => {
    ({ default: svc }      = await import('../services/AuditService.js'));
    ({ default: AuditLog } = await import('../models/AuditLog.js'));
  });

  beforeEach(async () => {
    await clearCollections(AuditLog);
  });

  it('log creates an audit entry', async () => {
    const userId = new mongoose.Types.ObjectId();
    const entry = await svc.log({ userId, action: 'auth.login', ip: '1.2.3.4' });
    assert.ok(entry);
    assert.equal(entry.action, 'auth.login');
    assert.equal(entry.ip, '1.2.3.4');
  });

  it('log is non-fatal even without userId', async () => {
    const entry = await svc.log({ action: 'system.startup' });
    assert.ok(entry);
  });

  it('getLogs returns logs for user', async () => {
    const userId = new mongoose.Types.ObjectId();
    await svc.log({ userId, action: 'auth.login' });
    await svc.log({ userId, action: 'workspace.created' });
    const logs = await svc.getLogs(userId);
    assert.equal(logs.length, 2);
  });
});

// ─── UsageService ─────────────────────────────────────────────────────────────

describe('UsageService', () => {
  let svc;
  let UsageRecord;

  before(async () => {
    ({ default: svc }         = await import('../services/UsageService.js'));
    ({ default: UsageRecord } = await import('../models/UsageRecord.js'));
  });

  beforeEach(async () => {
    await clearCollections(UsageRecord);
  });

  it('record stores a usage event', async () => {
    const userId = new mongoose.Types.ObjectId();
    const rec = await svc.record(userId, 'ai_request', 'chat', { count: 2 });
    assert.ok(rec);
    assert.equal(rec.category, 'ai_request');
    assert.equal(rec.count, 2);
  });

  it('getSummary aggregates by category', async () => {
    const userId = new mongoose.Types.ObjectId();
    await svc.record(userId, 'report', 'generate');
    await svc.record(userId, 'report', 'generate');
    const summary = await svc.getSummary(userId);
    const report = summary.find(s => s._id === 'report');
    assert.equal(report.totalCount, 2);
  });

  it('getCount returns total for a category', async () => {
    const userId = new mongoose.Types.ObjectId();
    await svc.record(userId, 'planner', 'create', { count: 5 });
    const count = await svc.getCount(userId, 'planner');
    assert.equal(count, 5);
  });
});

// ─── PermissionService ────────────────────────────────────────────────────────

describe('PermissionService', () => {
  let svc;
  let wsRepo;
  let workspaceId;
  const ownerId    = new mongoose.Types.ObjectId();
  const editorId   = new mongoose.Types.ObjectId();
  const outsiderId = new mongoose.Types.ObjectId();
  let Workspace;

  before(async () => {
    ({ default: svc }       = await import('../services/PermissionService.js'));
    ({ default: wsRepo }    = await import('../repositories/WorkspaceRepository.js'));
    ({ default: Workspace } = await import('../models/Workspace.js'));
    await clearCollections(Workspace);
    const ws = await wsRepo.create(ownerId, { name: 'Perms WS', slug: 'perms-ws-' + Date.now() });
    workspaceId = ws._id;
    await wsRepo.addMember(ws._id, { user: editorId, role: 'editor' });
  });

  it('getRole returns "owner" for workspace owner', async () => {
    const role = await svc.getRole(workspaceId, ownerId);
    assert.equal(role, 'owner');
  });

  it('getRole returns member role for regular member', async () => {
    const role = await svc.getRole(workspaceId, editorId);
    assert.equal(role, 'editor');
  });

  it('getRole returns null for outsider', async () => {
    const role = await svc.getRole(workspaceId, outsiderId);
    assert.equal(role, null);
  });

  it('assertRole passes for sufficient role', async () => {
    await assert.doesNotReject(() => svc.assertRole(workspaceId, ownerId, 'admin'));
  });

  it('assertRole throws for insufficient role', async () => {
    await assert.rejects(() => svc.assertRole(workspaceId, editorId, 'admin'), /role/i);
  });

  it('assertRole throws for outsider', async () => {
    await assert.rejects(() => svc.assertRole(workspaceId, outsiderId, 'viewer'), /member/i);
  });

  it('hasRole returns false for outsider', async () => {
    const result = await svc.hasRole(workspaceId, outsiderId, 'viewer');
    assert.equal(result, false);
  });
});

// ─── WorkspaceService ─────────────────────────────────────────────────────────

describe('WorkspaceService', () => {
  let svc;
  let Workspace;
  let AuditLog;

  before(async () => {
    ({ default: svc }      = await import('../services/WorkspaceService.js'));
    ({ default: Workspace }= await import('../models/Workspace.js'));
    ({ default: AuditLog } = await import('../models/AuditLog.js'));
  });

  beforeEach(async () => {
    await clearCollections(Workspace, AuditLog);
  });

  it('create builds workspace with owner as first member', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const ws = await svc.create(ownerId, { name: 'SVC WS' });
    assert.equal(ws.name, 'SVC WS');
    assert.ok(ws.members.some(m => String(m.user) === String(ownerId) && m.role === 'owner'));
  });

  it('getAll returns workspaces accessible to user', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    await svc.create(ownerId, { name: 'WS1' });
    await svc.create(ownerId, { name: 'WS2' });
    const list = await svc.getAll(ownerId);
    assert.ok(list.length >= 2);
  });

  it('update changes workspace fields', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const ws = await svc.create(ownerId, { name: 'Old Name' });
    const updated = await svc.update(ownerId, ws._id, { name: 'New Name' });
    assert.equal(updated.name, 'New Name');
  });

  it('update throws AuthorizationError for non-owner', async () => {
    const ownerId  = new mongoose.Types.ObjectId();
    const stranger = new mongoose.Types.ObjectId();
    const ws = await svc.create(ownerId, { name: 'Protected' });
    await assert.rejects(() => svc.update(stranger, ws._id, { name: 'Hijacked' }), /owner/i);
  });

  it('delete soft-deletes the workspace', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const ws = await svc.create(ownerId, { name: 'Bye' });
    await svc.delete(ownerId, ws._id);
    const list = await svc.getAll(ownerId);
    const found = list.find(w => String(w._id) === String(ws._id));
    assert.equal(found, undefined);
  });
});

// ─── TeamService ──────────────────────────────────────────────────────────────

describe('TeamService', () => {
  let svc;
  let wsRepo;
  let Workspace;
  let AuditLog;

  before(async () => {
    ({ default: svc }      = await import('../services/TeamService.js'));
    ({ default: wsRepo }   = await import('../repositories/WorkspaceRepository.js'));
    ({ default: Workspace }= await import('../models/Workspace.js'));
    ({ default: AuditLog } = await import('../models/AuditLog.js'));
  });

  beforeEach(async () => {
    await clearCollections(Workspace, AuditLog);
  });

  it('invite adds a member with given role', async () => {
    const ownerId  = new mongoose.Types.ObjectId();
    const newUser  = new mongoose.Types.ObjectId();
    const ws = await wsRepo.create(ownerId, { name: 'Invite', slug: 'inv-' + Date.now() });
    const updated = await svc.invite(ws._id, ownerId, { userId: newUser, role: 'editor' });
    assert.ok(updated.members.some(m => String(m.user) === String(newUser) && m.role === 'editor'));
  });

  it('invite throws ConflictError for duplicate member', async () => {
    const ownerId  = new mongoose.Types.ObjectId();
    const newUser  = new mongoose.Types.ObjectId();
    const ws = await wsRepo.create(ownerId, { name: 'Dup', slug: 'dup-' + Date.now() });
    await svc.invite(ws._id, ownerId, { userId: newUser, role: 'viewer' });
    await assert.rejects(() => svc.invite(ws._id, ownerId, { userId: newUser, role: 'viewer' }), /already a member/i);
  });

  it('invite rejects "owner" role assignment', async () => {
    const ownerId  = new mongoose.Types.ObjectId();
    const newUser  = new mongoose.Types.ObjectId();
    const ws = await wsRepo.create(ownerId, { name: 'No Owner', slug: 'noown-' + Date.now() });
    await assert.rejects(() => svc.invite(ws._id, ownerId, { userId: newUser, role: 'owner' }), /invalid role/i);
  });

  it('updateMember changes role', async () => {
    const ownerId  = new mongoose.Types.ObjectId();
    const member   = new mongoose.Types.ObjectId();
    const ws = await wsRepo.create(ownerId, { name: 'UpdateRole', slug: 'updr-' + Date.now() });
    await svc.invite(ws._id, ownerId, { userId: member, role: 'viewer' });
    const updated = await svc.updateMember(ws._id, ownerId, member, 'admin');
    const m = updated.members.find(m => String(m.user) === String(member));
    assert.equal(m.role, 'admin');
  });

  it('removeMember removes the member', async () => {
    const ownerId  = new mongoose.Types.ObjectId();
    const member   = new mongoose.Types.ObjectId();
    const ws = await wsRepo.create(ownerId, { name: 'RemoveMem', slug: 'rmm-' + Date.now() });
    await svc.invite(ws._id, ownerId, { userId: member, role: 'viewer' });
    await svc.removeMember(ws._id, ownerId, member);
    const members = await svc.getMembers(ws._id);
    assert.ok(!members.some(m => String(m.user) === String(member)));
  });

  it('cannot remove workspace owner', async () => {
    const ownerId  = new mongoose.Types.ObjectId();
    const ws = await wsRepo.create(ownerId, { name: 'OwnerSafe', slug: 'owns-' + Date.now() });
    await assert.rejects(() => svc.removeMember(ws._id, ownerId, ownerId), /owner/i);
  });
});

// ─── FeatureService ───────────────────────────────────────────────────────────

describe('FeatureService', () => {
  let svc;
  let FeatureFlag;

  before(async () => {
    ({ default: svc }         = await import('../services/FeatureService.js'));
    ({ default: FeatureFlag } = await import('../models/FeatureFlag.js'));
  });

  beforeEach(async () => {
    await clearCollections(FeatureFlag);
  });

  it('setEnabled toggles flag and returns updated doc', async () => {
    await svc.upsert('ai', { name: 'AI', enabled: true });
    const flag = await svc.setEnabled('ai', false);
    assert.equal(flag.enabled, false);
  });

  it('isEnabled defaults to true for unseeded flag', async () => {
    const enabled = await svc.isEnabled('reports');
    assert.equal(enabled, true);
  });

  it('isEnabled respects global flag', async () => {
    await svc.upsert('notifications', { name: 'Notifications', enabled: false });
    const enabled = await svc.isEnabled('notifications');
    assert.equal(enabled, false);
  });
});

// ─── SettingsService ──────────────────────────────────────────────────────────

describe('SettingsService', () => {
  let svc;
  let Settings;
  let AuditLog;

  before(async () => {
    ({ default: svc }      = await import('../services/SettingsService.js'));
    ({ default: Settings } = await import('../models/Settings.js'));
    ({ default: AuditLog } = await import('../models/AuditLog.js'));
  });

  beforeEach(async () => {
    await clearCollections(Settings, AuditLog);
  });

  it('update creates settings on first call', async () => {
    const userId = new mongoose.Types.ObjectId();
    const settings = await svc.update(userId, 'user', { theme: 'dark', timezone: 'UTC' });
    assert.equal(settings.theme, 'dark');
  });

  it('update overwrites existing settings', async () => {
    const userId = new mongoose.Types.ObjectId();
    await svc.update(userId, 'user', { theme: 'light' });
    const updated = await svc.update(userId, 'user', { theme: 'dark' });
    assert.equal(updated.theme, 'dark');
  });

  it('getAll returns all settings types for user', async () => {
    const userId = new mongoose.Types.ObjectId();
    await svc.update(userId, 'user', { theme: 'system' });
    await svc.update(userId, 'ai', { data: { maxTokens: 4096 } });
    const all = await svc.getAll(userId);
    assert.ok(all.length >= 2);
  });
});

// ─── SearchService ────────────────────────────────────────────────────────────

describe('SearchService', () => {
  let svc;

  before(async () => {
    ({ default: svc } = await import('../services/SearchService.js'));
  });

  it('returns grouped results structure', async () => {
    const userId  = new mongoose.Types.ObjectId();
    const results = await svc.search(userId, 'growth');
    assert.ok('results' in results);
    assert.ok('reports'       in results.results);
    assert.ok('planner'       in results.results);
    assert.ok('competitors'   in results.results);
    assert.ok('posts'         in results.results);
    assert.ok('ideas'         in results.results);
    assert.ok('notifications' in results.results);
    assert.ok('trends'        in results.results);
  });

  it('returns query and totalCount fields', async () => {
    const userId  = new mongoose.Types.ObjectId();
    const results = await svc.search(userId, 'test');
    assert.equal(results.query, 'test');
    assert.ok(typeof results.totalCount === 'number');
  });

  it('does not throw for empty result set', async () => {
    const userId = new mongoose.Types.ObjectId();
    await assert.doesNotReject(() => svc.search(userId, 'xyzzy-no-results-12345'));
  });
});

// ─── HTTP: Workspace routes ───────────────────────────────────────────────────

describe('HTTP /api/v1/workspaces', () => {
  let token;
  let Workspace;
  let AuditLog;
  let User;

  before(async () => {
    ({ default: User }      = await import('../models/User.js'));
    ({ default: Workspace } = await import('../models/Workspace.js'));
    ({ default: AuditLog }  = await import('../models/AuditLog.js'));
    const { default: bcrypt }       = await import('bcryptjs');
    const { default: TokenService } = await import('../services/TokenService.js');
    await clearCollections(User, Workspace, AuditLog);
    const hash = await bcrypt.hash('Password1!', 10);
    const user = await User.create({ name: 'WS Tester', email: 'ws-test@example.com', password: hash, username: 'ws_tester', status: 'active' });
    token = TokenService.generateAccessToken({ sub: String(user._id) });
  });

  beforeEach(async () => {
    await clearCollections(Workspace, AuditLog);
  });

  it('POST /api/v1/workspaces creates a workspace', async () => {
    const res = await supertest(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'HTTP Workspace' });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.name, 'HTTP Workspace');
  });

  it('POST /api/v1/workspaces rejects missing name', async () => {
    const res = await supertest(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    assert.equal(res.status, 400);
  });

  it('GET /api/v1/workspaces lists workspaces for user', async () => {
    await supertest(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'WS List Test' });
    const res = await supertest(app)
      .get('/api/v1/workspaces')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length >= 1);
  });

  it('GET /api/v1/workspaces/:id retrieves by id', async () => {
    const created = await supertest(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Get By ID' });
    const id = created.body.data.id || created.body.data._id;
    const res = await supertest(app)
      .get(`/api/v1/workspaces/${id}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
  });

  it('PATCH /api/v1/workspaces/:id updates name', async () => {
    const created = await supertest(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Old' });
    const id = created.body.data.id || created.body.data._id;
    const res = await supertest(app)
      .patch(`/api/v1/workspaces/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.name, 'New');
  });

  it('DELETE /api/v1/workspaces/:id soft-deletes', async () => {
    const created = await supertest(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Delete Me' });
    const id = created.body.data.id || created.body.data._id;
    const res = await supertest(app)
      .delete(`/api/v1/workspaces/${id}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
  });

  it('POST /api/v1/workspaces/:id/invite adds a member', async () => {
    const created = await supertest(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Invite Test' });
    const id = created.body.data.id || created.body.data._id;
    const { default: bcrypt } = await import('bcryptjs');
    const hash = await bcrypt.hash('Password1!', 10);
    const invitee = await User.create({ name: 'Invitee User', email: 'invitee@example.com', password: hash, username: 'invitee_user', status: 'active' });
    const res = await supertest(app)
      .post(`/api/v1/workspaces/${id}/invite`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: String(invitee._id), role: 'viewer' });
    assert.equal(res.status, 200);
  });

  it('GET /api/v1/workspaces requires auth', async () => {
    const res = await supertest(app).get('/api/v1/workspaces');
    assert.equal(res.status, 401);
  });
});

// ─── HTTP: API key routes ─────────────────────────────────────────────────────

describe('HTTP /api/v1/apikeys', () => {
  let token;
  let ApiKey;
  let AuditLog;

  before(async () => {
    ({ default: ApiKey }   = await import('../models/ApiKey.js'));
    ({ default: AuditLog } = await import('../models/AuditLog.js'));
    const { default: User }         = await import('../models/User.js');
    const { default: bcrypt }       = await import('bcryptjs');
    const { default: TokenService } = await import('../services/TokenService.js');
    const hash = await bcrypt.hash('Password1!', 10);
    const user = await User.create({ name: 'ApiKey Tester', email: 'apikey-test@example.com', password: hash, username: 'apikey_tester', status: 'active' });
    token = TokenService.generateAccessToken({ sub: String(user._id) });
  });

  beforeEach(async () => {
    await clearCollections(ApiKey, AuditLog);
  });

  it('POST /api/v1/apikeys creates a key and returns rawKey', async () => {
    const res = await supertest(app)
      .post('/api/v1/apikeys')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'HTTP API key test' });
    assert.equal(res.status, 201);
    assert.ok(res.body.data.rawKey.startsWith('cos_'));
  });

  it('GET /api/v1/apikeys lists keys', async () => {
    const res = await supertest(app)
      .get('/api/v1/apikeys')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
  });

  it('DELETE /api/v1/apikeys/:id removes key', async () => {
    const created = await supertest(app)
      .post('/api/v1/apikeys')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Delete this' });
    const id = created.body.data.id || created.body.data._id;
    const res = await supertest(app)
      .delete(`/api/v1/apikeys/${id}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
  });
});

// ─── HTTP: Search route ───────────────────────────────────────────────────────

describe('HTTP /api/v1/search', () => {
  let token;

  before(async () => {
    const { default: User }         = await import('../models/User.js');
    const { default: bcrypt }       = await import('bcryptjs');
    const { default: TokenService } = await import('../services/TokenService.js');
    const hash = await bcrypt.hash('Password1!', 10);
    const user = await User.create({ name: 'Search Tester', email: 'search-test@example.com', password: hash, username: 'search_tester', status: 'active' });
    token = TokenService.generateAccessToken({ sub: String(user._id) });
  });

  it('GET /api/v1/search?q=growth returns grouped results', async () => {
    const res = await supertest(app)
      .get('/api/v1/search?q=growth')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.ok('results' in res.body.data);
  });

  it('GET /api/v1/search without q returns 400', async () => {
    const res = await supertest(app)
      .get('/api/v1/search')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 400);
  });

  it('GET /api/v1/search requires auth', async () => {
    const res = await supertest(app).get('/api/v1/search?q=test');
    assert.equal(res.status, 401);
  });
});
