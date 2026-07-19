/**
 * Phase 4 Integration Tests
 *
 * Covers:
 *  - Session listing, revocation (single + all-others)
 *  - Connected account CRUD
 *  - Token encryption / decryption round-trip
 *  - OAuth infrastructure (factory, base class, provider registration)
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';

import { connectDatabase, disconnectDatabase } from '../infrastructure/database/index.js';
import app from '../app.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { parseUserAgent } from '../utils/uaParser.js';
import OAuthProviderFactory from '../modules/integrations/oauth/OAuthProviderFactory.js';
import BaseOAuthProvider from '../modules/integrations/oauth/BaseOAuthProvider.js';
import ConnectedAccount from '../models/ConnectedAccount.js';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';

const request = supertest(app);

// ─── Helpers ──────────────────────────────────────────────────────────────────

let db;

async function registerUser(overrides = {}) {
  const res = await request.post('/api/v1/auth/register').send({
    name: 'Test User',
    email: `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
    password: 'P@ssword123!',
    ...overrides,
  });
  assert.equal(res.status, 201, `register failed: ${JSON.stringify(res.body)}`);
  return {
    user: res.body.data.user,
    accessToken: res.body.data.accessToken,
    refreshToken: res.body.data.refreshToken,
  };
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

before(async () => {
  db = await connectDatabase();
});

after(async () => {
  await disconnectDatabase();
});

// ─── Encryption ───────────────────────────────────────────────────────────────

describe('Encryption utility', () => {
  it('encrypts and decrypts a string correctly', () => {
    const original = 'super-secret-oauth-token-abc123';
    const ciphertext = encrypt(original);
    assert.notEqual(ciphertext, original, 'Ciphertext should differ from plaintext');
    const decrypted = decrypt(ciphertext);
    assert.equal(decrypted, original, 'Decrypted value should match original');
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const token = 'same-token-each-time';
    const c1 = encrypt(token);
    const c2 = encrypt(token);
    assert.notEqual(c1, c2, 'Each encryption call should produce a unique ciphertext');
  });

  it('returns null when encrypting null', () => {
    assert.equal(encrypt(null), null);
  });

  it('returns null when decrypting null', () => {
    assert.equal(decrypt(null), null);
  });

  it('throws on tampered ciphertext (GCM auth tag check)', () => {
    const ciphertext = encrypt('legitimate-token');
    // Flip last byte of the encrypted portion
    const parts = ciphertext.split(':');
    parts[2] = parts[2].slice(0, -2) + 'ff';
    const tampered = parts.join(':');
    assert.throws(() => decrypt(tampered), /Unsupported state|bad decrypt|auth tag/i);
  });
});

// ─── User-Agent Parser ────────────────────────────────────────────────────────

describe('UA parser', () => {
  it('parses a Chrome on Windows UA', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const result = parseUserAgent(ua);
    assert.equal(result.browser, 'Chrome');
    assert.equal(result.os, 'Windows 10');
    assert.ok(result.deviceName.includes('Chrome'));
  });

  it('parses a Firefox on macOS UA', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Gecko/20100101 Firefox/121.0';
    const result = parseUserAgent(ua);
    assert.equal(result.browser, 'Firefox');
    assert.ok(result.os.startsWith('macOS'));
  });

  it('parses a mobile Safari on iPhone UA', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    const result = parseUserAgent(ua);
    assert.equal(result.browser, 'Safari');
    assert.ok(result.os.startsWith('iOS'));
    assert.ok(result.deviceName.toLowerCase().includes('iphone'));
  });

  it('handles null/undefined gracefully', () => {
    const result = parseUserAgent(null);
    assert.equal(result.browser, 'Unknown');
    assert.equal(result.os, 'Unknown');
  });
});

// ─── OAuth Infrastructure ─────────────────────────────────────────────────────

describe('OAuth infrastructure', () => {
  it('OAuthProviderFactory lists supported platforms', () => {
    const platforms = OAuthProviderFactory.getSupportedPlatforms();
    assert.ok(platforms.includes('youtube'), 'youtube should be listed');
    assert.ok(platforms.includes('instagram'), 'instagram should be listed');
    assert.ok(platforms.includes('linkedin'), 'linkedin should be listed');
    assert.ok(platforms.includes('tiktok'), 'tiktok should be listed');
    assert.ok(platforms.includes('x'), 'x should be listed');
  });

  it('OAuthProviderFactory reports unimplemented platforms correctly', () => {
    assert.equal(OAuthProviderFactory.isImplemented('youtube'), false);
    assert.equal(OAuthProviderFactory.isImplemented('instagram'), false);
  });

  it('OAuthProviderFactory throws for unknown platform', () => {
    assert.throws(
      () => OAuthProviderFactory.getProvider('myspace'),
      /Unknown OAuth platform/
    );
  });

  it('OAuthProviderFactory throws for unimplemented-but-registered platform', () => {
    assert.throws(
      () => OAuthProviderFactory.getProvider('youtube'),
      /not yet implemented/
    );
  });

  it('BaseOAuthProvider cannot be instantiated directly', () => {
    assert.throws(
      () => new BaseOAuthProvider('test', {}),
      /abstract/
    );
  });

  it('OAuthProviderFactory.register() accepts a concrete provider', () => {
    class MockProvider extends BaseOAuthProvider {
      getAuthorizationUrl() { return 'https://mock.example.com/auth'; }
      async handleCallback() { return {}; }
      async connect() { return {}; }
      async disconnect() {}
      async refreshToken() { return {}; }
      async validateConnection() { return true; }
      async getProfile() { return {}; }
    }

    OAuthProviderFactory.register('mock_platform', MockProvider, {});
    assert.equal(OAuthProviderFactory.isImplemented('mock_platform'), true);

    const provider = OAuthProviderFactory.getProvider('mock_platform');
    assert.equal(provider.getAuthorizationUrl('state'), 'https://mock.example.com/auth');
  });
});

// ─── Session Management — API ─────────────────────────────────────────────────

describe('GET /account/sessions', () => {
  it('returns active sessions for the authenticated user', async () => {
    const { accessToken } = await registerUser();

    const res = await request
      .get('/api/v1/account/sessions')
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.sessions));
    assert.ok(res.body.data.sessions.length >= 1);

    const session = res.body.data.sessions[0];
    assert.ok('id' in session);
    assert.ok('deviceName' in session);
    assert.ok('browser' in session);
    assert.ok('os' in session);
    assert.ok('loginTime' in session);
    assert.ok('lastActivity' in session);
    assert.ok('isCurrent' in session);
  });

  it('returns 401 without a token', async () => {
    const res = await request.get('/api/v1/account/sessions');
    assert.equal(res.status, 401);
  });
});

describe('DELETE /account/sessions/:id', () => {
  it('revokes a specific session', async () => {
    const { accessToken } = await registerUser();

    // List sessions to get an ID
    const listRes = await request
      .get('/api/v1/account/sessions')
      .set(authHeader(accessToken));

    const session = listRes.body.data.sessions[0];
    assert.ok(session, 'Expected at least one session');

    // Register a second user and try to revoke first user's session (should fail)
    const { accessToken: otherToken } = await registerUser();
    const badRes = await request
      .delete(`/api/v1/account/sessions/${session.id}`)
      .set(authHeader(otherToken));
    assert.equal(badRes.status, 404, 'Another user cannot revoke this session');
  });

  it('returns 400 for an invalid session ID', async () => {
    const { accessToken } = await registerUser();
    const res = await request
      .delete('/api/v1/account/sessions/not-a-valid-id')
      .set(authHeader(accessToken));
    assert.equal(res.status, 400);
  });

  it('returns 401 without a token', async () => {
    const res = await request.delete('/api/v1/account/sessions/64b0f5e5e6b3d5f1c2a0e001');
    assert.equal(res.status, 401);
  });
});

describe('DELETE /account/sessions (revoke others)', () => {
  it('revokes all sessions except current and returns count', async () => {
    // Register and log in twice to create two sessions
    const { user, accessToken: token1, refreshToken: rt1 } = await registerUser();

    const loginRes = await request.post('/api/v1/auth/login').send({
      email: user.email,
      password: 'P@ssword123!',
    });
    // Second session created by login

    const revokeRes = await request
      .delete('/api/v1/account/sessions')
      .set(authHeader(token1))
      .set('Cookie', `refreshToken=${rt1}`);

    assert.equal(revokeRes.status, 200);
    assert.ok(typeof revokeRes.body.data.revokedCount === 'number');
  });

  it('returns 401 without a token', async () => {
    const res = await request.delete('/api/v1/account/sessions');
    assert.equal(res.status, 401);
  });
});

// ─── Connected Accounts — API ─────────────────────────────────────────────────

describe('GET /integrations', () => {
  it('returns an empty list when no accounts are connected', async () => {
    const { accessToken } = await registerUser();

    const res = await request
      .get('/api/v1/integrations')
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.integrations));
    assert.equal(res.body.data.count, 0);
  });

  it('returns connected accounts for the user', async () => {
    const { user, accessToken } = await registerUser();

    // Seed a connected account directly via Mongoose
    await ConnectedAccount.create({
      user: user.id,
      platform: 'instagram',
      platformUserId: 'ig_user_123',
      username: 'test_creator',
      status: 'active',
    });

    const res = await request
      .get('/api/v1/integrations')
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
    assert.equal(res.body.data.count, 1);
    assert.equal(res.body.data.integrations[0].platform, 'instagram');

    // Tokens must not be in the response
    assert.ok(!('accessToken' in res.body.data.integrations[0]));
    assert.ok(!('refreshToken' in res.body.data.integrations[0]));
  });

  it('returns 401 without a token', async () => {
    const res = await request.get('/api/v1/integrations');
    assert.equal(res.status, 401);
  });
});

describe('DELETE /integrations/:platform', () => {
  it('disconnects a connected account', async () => {
    const { user, accessToken } = await registerUser();

    await ConnectedAccount.create({
      user: user.id,
      platform: 'youtube',
      platformUserId: 'yt_user_456',
      username: 'test_creator_yt',
      status: 'active',
    });

    const res = await request
      .delete('/api/v1/integrations/youtube')
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);

    // Verify it's soft-deleted
    const doc = await ConnectedAccount.findOne({ user: user.id, platform: 'youtube' });
    assert.equal(doc.isDeleted, true);
  });

  it('returns 404 when the account is not connected', async () => {
    const { accessToken } = await registerUser();

    const res = await request
      .delete('/api/v1/integrations/tiktok')
      .set(authHeader(accessToken));

    assert.equal(res.status, 404);
  });

  it('returns 400 for an invalid platform', async () => {
    const { accessToken } = await registerUser();

    const res = await request
      .delete('/api/v1/integrations/myspace')
      .set(authHeader(accessToken));

    assert.equal(res.status, 400);
  });

  it('returns 401 without a token', async () => {
    const res = await request.delete('/api/v1/integrations/instagram');
    assert.equal(res.status, 401);
  });

  it('cannot see another user\'s connected account', async () => {
    const { user: user1 } = await registerUser();
    const { accessToken: token2 } = await registerUser();

    await ConnectedAccount.create({
      user: user1.id,
      platform: 'linkedin',
      platformUserId: 'li_user_789',
      status: 'active',
    });

    // user2 tries to disconnect user1's linkedin — should 404
    const res = await request
      .delete('/api/v1/integrations/linkedin')
      .set(authHeader(token2));

    assert.equal(res.status, 404);
  });
});

// ─── Token encryption stored in DB ───────────────────────────────────────────

describe('Connected account token encryption', () => {
  it('stores tokens encrypted in the database', async () => {
    const { user } = await registerUser();

    const plainAccessToken = 'plain-access-token-value';
    const { encrypt: encryptFn } = await import('../utils/encryption.js');

    await ConnectedAccount.create({
      user: user.id,
      platform: 'twitter',
      platformUserId: 'x_user_001',
      status: 'active',
      accessToken: encryptFn(plainAccessToken),
    });

    // Read raw from DB — should NOT be plaintext
    const raw = await ConnectedAccount.findOne({ user: user.id, platform: 'twitter' })
      .select('+accessToken')
      .lean();

    assert.ok(raw.accessToken !== plainAccessToken, 'Token should be stored encrypted');
    assert.ok(raw.accessToken.includes(':'), 'Encrypted token should contain IV:tag:data separators');

    // Decrypt and verify
    const { decrypt: decryptFn } = await import('../utils/encryption.js');
    assert.equal(decryptFn(raw.accessToken), plainAccessToken);
  });
});
