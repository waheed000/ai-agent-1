/**
 * Phase 3B — Profile & account management integration tests
 * Run: node --test src/tests/profile.test.js
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';
import { connectDatabase, disconnectDatabase } from '../infrastructure/database/index.js';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import CreatorProfile from '../models/CreatorProfile.js';

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

before(async () => { await connectDatabase(); });
after(async () => { await disconnectDatabase(); });
beforeEach(async () => {
  await User.deleteMany({});
  await RefreshToken.deleteMany({});
  await CreatorProfile.deleteMany({});
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const api = (path) => `/api/v1/auth${path}`;

const validUser = { name: 'Test User', email: 'test@example.com', password: 'StrongPass1!' };

/** Register and return { accessToken, cookies } */
const registerUser = async (data = validUser) => {
  const res = await request(app).post(api('/register')).send(data);
  assert.equal(res.status, 201, `Register failed: ${JSON.stringify(res.body)}`);
  return {
    accessToken: res.body.data.accessToken,
    cookies: res.headers['set-cookie'],
    userId: res.body.data.user._id ?? res.body.data.user.id,
  };
};

const authGet  = (path, token) => request(app).get(api(path)).set('Authorization', `Bearer ${token}`);
const authPatch = (path, token, body) => request(app).patch(api(path)).set('Authorization', `Bearer ${token}`).send(body);
const authDelete = (path, token) => request(app).delete(api(path)).set('Authorization', `Bearer ${token}`);

// ─── GET /auth/me ─────────────────────────────────────────────────────────────

describe('GET /auth/me', () => {
  it('returns user and profile for authenticated user', async () => {
    const { accessToken } = await registerUser();
    const res = await authGet('/me', accessToken);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.user, 'user present');
    assert.equal(res.body.data.user.email, validUser.email);
    // sensitive fields must be absent
    assert.equal(res.body.data.user.password, undefined);
    assert.equal(res.body.data.user.verificationToken, undefined);
    // profile auto-created on register
    assert.ok(res.body.data.profile, 'profile present');
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get(api('/me'));
    assert.equal(res.status, 401);
  });
});

// ─── PATCH /auth/profile ──────────────────────────────────────────────────────

describe('PATCH /auth/profile', () => {
  it('updates allowed user fields', async () => {
    const { accessToken } = await registerUser();
    const res = await authPatch('/profile', accessToken, { name: 'Updated Name', timezone: 'America/New_York' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.name, 'Updated Name');
    assert.equal(res.body.data.user.timezone, 'America/New_York');
  });

  it('updates allowed profile fields', async () => {
    const { accessToken } = await registerUser();
    const res = await authPatch('/profile', accessToken, {
      bio: 'A short bio',
      niche: 'Tech',
      contentLanguage: 'en',
      experienceLevel: 'intermediate',
      contentGoals: ['grow audience', 'monetize'],
      location: { country: 'United States', city: 'New York' },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.profile.bio, 'A short bio');
    assert.equal(res.body.data.profile.niche, 'Tech');
    assert.equal(res.body.data.profile.contentLanguage, 'en');
    assert.equal(res.body.data.profile.experienceLevel, 'intermediate');
    assert.deepEqual(res.body.data.profile.contentGoals, ['grow audience', 'monetize']);
    assert.equal(res.body.data.profile.location.country, 'United States');
  });

  it('accepts a valid avatar URL', async () => {
    const { accessToken } = await registerUser();
    const res = await authPatch('/profile', accessToken, { avatar: 'https://example.com/pic.jpg' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.avatar, 'https://example.com/pic.jpg');
  });

  it('rejects an invalid avatar URL', async () => {
    const { accessToken } = await registerUser();
    const res = await authPatch('/profile', accessToken, { avatar: 'not-a-url' });
    assert.equal(res.status, 400);
  });

  it('rejects an invalid timezone', async () => {
    const { accessToken } = await registerUser();
    const res = await authPatch('/profile', accessToken, { timezone: 'Mars/Olympus_Mons' });
    assert.equal(res.status, 400);
  });

  it('rejects an invalid language code', async () => {
    const { accessToken } = await registerUser();
    const res = await authPatch('/profile', accessToken, { contentLanguage: 'english' });
    assert.equal(res.status, 400);
  });

  it('rejects unknown/privileged fields (email, role, subscriptionPlan)', async () => {
    const { accessToken } = await registerUser();

    const emailRes = await authPatch('/profile', accessToken, { email: 'hacked@evil.com' });
    assert.equal(emailRes.status, 400);

    const roleRes = await authPatch('/profile', accessToken, { role: 'admin' });
    assert.equal(roleRes.status, 400);

    const planRes = await authPatch('/profile', accessToken, { subscriptionPlan: 'pro' });
    assert.equal(planRes.status, 400);
  });

  it('rejects status update attempt', async () => {
    const { accessToken } = await registerUser();
    const res = await authPatch('/profile', accessToken, { status: 'active' });
    assert.equal(res.status, 400);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).patch(api('/profile')).send({ name: 'X' });
    assert.equal(res.status, 401);
  });
});

// ─── PATCH /auth/change-password ─────────────────────────────────────────────

describe('PATCH /auth/change-password', () => {
  it('changes password with correct current password', async () => {
    const { accessToken } = await registerUser();
    const res = await authPatch('/change-password', accessToken, {
      currentPassword: validUser.password,
      newPassword: 'NewStrongPass2@',
    });
    assert.equal(res.status, 200);
  });

  it('can log in with the new password after change', async () => {
    const { accessToken } = await registerUser();
    await authPatch('/change-password', accessToken, {
      currentPassword: validUser.password,
      newPassword: 'NewStrongPass2@',
    });

    const loginRes = await request(app).post(api('/login')).send({
      email: validUser.email,
      password: 'NewStrongPass2@',
    });
    assert.equal(loginRes.status, 200);
  });

  it('cannot log in with the old password after change', async () => {
    const { accessToken } = await registerUser();
    await authPatch('/change-password', accessToken, {
      currentPassword: validUser.password,
      newPassword: 'NewStrongPass2@',
    });

    const loginRes = await request(app).post(api('/login')).send({
      email: validUser.email,
      password: validUser.password,
    });
    assert.equal(loginRes.status, 401);
  });

  it('revokes all refresh tokens on password change', async () => {
    const reg = await registerUser();
    const { cookies } = reg;

    await authPatch('/change-password', reg.accessToken, {
      currentPassword: validUser.password,
      newPassword: 'NewStrongPass2@',
    });

    // Old session's refresh token should now be invalid
    const refreshRes = await request(app)
      .post(api('/refresh-token'))
      .set('Cookie', cookies);
    assert.equal(refreshRes.status, 401);
  });

  it('rejects incorrect current password with 401', async () => {
    const { accessToken } = await registerUser();
    const res = await authPatch('/change-password', accessToken, {
      currentPassword: 'WrongPass1!',
      newPassword: 'NewStrongPass2@',
    });
    assert.equal(res.status, 401);
  });

  it('rejects a weak new password with 400', async () => {
    const { accessToken } = await registerUser();
    const res = await authPatch('/change-password', accessToken, {
      currentPassword: validUser.password,
      newPassword: 'weak',
    });
    assert.equal(res.status, 400);
  });

  it('rejects unknown fields with 400', async () => {
    const { accessToken } = await registerUser();
    const res = await authPatch('/change-password', accessToken, {
      currentPassword: validUser.password,
      newPassword: 'NewStrongPass2@',
      email: 'hack@evil.com',
    });
    assert.equal(res.status, 400);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).patch(api('/change-password')).send({
      currentPassword: 'a', newPassword: 'b',
    });
    assert.equal(res.status, 401);
  });
});

// ─── DELETE /auth/account ─────────────────────────────────────────────────────

describe('DELETE /auth/account', () => {
  it('soft-deletes the account and returns 200', async () => {
    const { accessToken } = await registerUser();
    const res = await authDelete('/account', accessToken);
    assert.equal(res.status, 200);
  });

  it('deleted account cannot log in', async () => {
    const { accessToken } = await registerUser();
    await authDelete('/account', accessToken);

    const loginRes = await request(app).post(api('/login')).send({
      email: validUser.email,
      password: validUser.password,
    });
    assert.equal(loginRes.status, 401);
    // Must not leak that account was deleted
    assert.ok(!loginRes.body.message.toLowerCase().includes('deleted'));
  });

  it('deleted account refresh tokens are revoked', async () => {
    const reg = await registerUser();
    await authDelete('/account', reg.accessToken);

    const refreshRes = await request(app)
      .post(api('/refresh-token'))
      .set('Cookie', reg.cookies);
    assert.equal(refreshRes.status, 401);
  });

  it('soft-deletes the CreatorProfile', async () => {
    const reg = await registerUser();
    const { userId } = reg;
    await authDelete('/account', reg.accessToken);

    const profile = await CreatorProfile.findOne({ user: userId });
    assert.ok(profile?.isDeleted, 'CreatorProfile should be soft-deleted');
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).delete(api('/account'));
    assert.equal(res.status, 401);
  });
});
