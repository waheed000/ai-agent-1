/**
 * Phase 3A — Authentication integration tests
 * Uses Node.js built-in test runner (node:test) + supertest.
 *
 * Run: node --test src/tests/auth.test.js
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';
import { connectDatabase, disconnectDatabase } from '../infrastructure/database/index.js';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import TokenService from '../modules/auth/TokenService.js';

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

before(async () => {
  await connectDatabase();
});

after(async () => {
  await disconnectDatabase();
});

beforeEach(async () => {
  // Clean slate between tests
  await User.deleteMany({});
  await RefreshToken.deleteMany({});
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const api = (path) => `/api/v1/auth${path}`;

const validUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'StrongPass1!',
};

const register = (data = validUser) => request(app).post(api('/register')).send(data);
const login = (email = validUser.email, password = validUser.password) =>
  request(app).post(api('/login')).send({ email, password });

// ─── Register ─────────────────────────────────────────────────────────────────

describe('POST /auth/register', () => {
  it('creates a new user and returns tokens', async () => {
    const res = await register();
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.accessToken, 'access token present');
    assert.ok(res.body.data.user, 'user object present');
    assert.equal(res.body.data.user.email, validUser.email);
    // password must NOT be in response
    assert.equal(res.body.data.user.password, undefined);
    // refresh token must be in http-only cookie
    const cookieHeader = res.headers['set-cookie'] || [];
    assert.ok(cookieHeader.some((c) => c.startsWith('refreshToken=')), 'refreshToken cookie set');
  });

  it('auto-creates a CreatorProfile for new users', async () => {
    const res = await register();
    assert.equal(res.status, 201);
    // CreatorProfile creation is logged but not returned — verify via DB
    const { default: CreatorProfile } = await import('../models/CreatorProfile.js');
    const userId = res.body.data.user._id || res.body.data.user.id;
    const profile = await CreatorProfile.findOne({ user: userId });
    assert.ok(profile, 'CreatorProfile created');
  });

  it('rejects duplicate email with 409', async () => {
    await register();
    const res = await register();
    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
  });

  it('rejects invalid email format with 400', async () => {
    const res = await register({ ...validUser, email: 'not-an-email' });
    assert.equal(res.status, 400);
  });

  it('rejects weak password with 400', async () => {
    const res = await register({ ...validUser, email: 'weak@example.com', password: 'weak' });
    assert.equal(res.status, 400);
  });

  it('rejects missing name with 400', async () => {
    const res = await register({ email: validUser.email, password: validUser.password });
    assert.equal(res.status, 400);
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────

describe('POST /auth/login', () => {
  it('returns tokens for valid credentials', async () => {
    await register();
    const res = await login();
    assert.equal(res.status, 200);
    assert.ok(res.body.data.accessToken);
    assert.ok(res.body.data.user);
  });

  it('rejects wrong password with 401', async () => {
    await register();
    const res = await login(validUser.email, 'WrongPass1!');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('rejects unknown email with 401 (no user enumeration)', async () => {
    const res = await login('nobody@example.com', 'SomePass1!');
    assert.equal(res.status, 401);
    // must NOT say "user not found"
    assert.ok(!res.body.message.toLowerCase().includes('not found'));
  });

  it('rejects suspended accounts with 401', async () => {
    await register();
    await User.updateOne({ email: validUser.email }, { status: 'suspended' });
    const res = await login();
    assert.equal(res.status, 401);
    assert.ok(res.body.message.toLowerCase().includes('suspended'));
  });

  it('rejects deleted accounts with 401 (no enumeration)', async () => {
    await register();
    await User.updateOne({ email: validUser.email }, { isDeleted: true });
    const res = await login();
    assert.equal(res.status, 401);
    assert.ok(!res.body.message.toLowerCase().includes('deleted'));
  });

  it('rejects pending_verification accounts with 401', async () => {
    await register();
    await User.updateOne({ email: validUser.email }, { status: 'pending_verification' });
    const res = await login();
    assert.equal(res.status, 401);
  });
});

// ─── Refresh Token ────────────────────────────────────────────────────────────

describe('POST /auth/refresh-token', () => {
  it('issues new token pair from a valid refresh token', async () => {
    const reg = await register();
    const cookies = reg.headers['set-cookie'];
    const res = await request(app)
      .post(api('/refresh-token'))
      .set('Cookie', cookies);
    assert.equal(res.status, 200);
    assert.ok(res.body.data.accessToken);
  });

  it('rejects a missing refresh token with 401', async () => {
    const res = await request(app).post(api('/refresh-token'));
    assert.equal(res.status, 401);
  });

  it('rejects a token that has already been rotated (reuse attack)', async () => {
    const reg = await register();
    const cookies = reg.headers['set-cookie'];

    // Use it once — valid rotation
    const first = await request(app)
      .post(api('/refresh-token'))
      .set('Cookie', cookies);
    assert.equal(first.status, 200);

    // Replay the OLD token — should be rejected
    const second = await request(app)
      .post(api('/refresh-token'))
      .set('Cookie', cookies);
    assert.equal(second.status, 401);
  });

  it('accepts refresh token from request body (non-browser clients)', async () => {
    const reg = await register();
    const cookies = reg.headers['set-cookie'];

    // Extract token value from cookie header
    const cookiePair = cookies.find((c) => c.startsWith('refreshToken='));
    const rawToken = cookiePair.split(';')[0].replace('refreshToken=', '');

    const res = await request(app)
      .post(api('/refresh-token'))
      .send({ refreshToken: rawToken });
    assert.equal(res.status, 200);
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────

describe('POST /auth/logout', () => {
  it('revokes the current session and clears the cookie', async () => {
    const reg = await register();
    const loginCookies = reg.headers['set-cookie'];

    // Grab access token for Authorization header
    const accessToken = reg.body.data.accessToken;

    const res = await request(app)
      .post(api('/logout'))
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', loginCookies);

    assert.equal(res.status, 200);
    // Cookie should be cleared
    const setCookies = res.headers['set-cookie'] || [];
    const rtCookie = setCookies.find((c) => c.startsWith('refreshToken='));
    assert.ok(!rtCookie || rtCookie.includes('Expires=') || rtCookie.includes('Max-Age=0'));

    // Subsequent refresh should fail
    const retry = await request(app)
      .post(api('/refresh-token'))
      .set('Cookie', loginCookies);
    assert.equal(retry.status, 401);
  });

  it('requires authentication — returns 401 with no token', async () => {
    const res = await request(app).post(api('/logout'));
    assert.equal(res.status, 401);
  });
});

// ─── Logout All ───────────────────────────────────────────────────────────────

describe('POST /auth/logout-all', () => {
  it('revokes all sessions for the user', async () => {
    // Register once, login twice from "different devices"
    const reg = await register();
    const accessToken = reg.body.data.accessToken;
    const session1Cookies = reg.headers['set-cookie'];

    const loginRes = await login();
    const session2Cookies = loginRes.headers['set-cookie'];

    // Logout all using session1 access token
    const res = await request(app)
      .post(api('/logout-all'))
      .set('Authorization', `Bearer ${accessToken}`);
    assert.equal(res.status, 200);

    // Both sessions should now be invalid
    const retry1 = await request(app)
      .post(api('/refresh-token'))
      .set('Cookie', session1Cookies);
    assert.equal(retry1.status, 401);

    const retry2 = await request(app)
      .post(api('/refresh-token'))
      .set('Cookie', session2Cookies);
    assert.equal(retry2.status, 401);
  });
});

// ─── JWT edge cases ───────────────────────────────────────────────────────────

describe('JWT edge cases', () => {
  it('rejects a tampered access token with 401', async () => {
    await register();
    const loginRes = await login();
    const accessToken = loginRes.body.data.accessToken;
    const tampered = accessToken.slice(0, -5) + 'XXXXX';

    const res = await request(app)
      .post(api('/logout-all'))
      .set('Authorization', `Bearer ${tampered}`);
    assert.equal(res.status, 401);
  });

  it('rejects an expired access token with 401', async () => {
    // Generate a token that expired 1 second in the past
    const expiredToken = TokenService.generateAccessToken({
      sub: '000000000000000000000001',
      role: 'user',
    });

    // Override expiry by directly signing with negative exp
    import('jsonwebtoken').then(async ({ default: jwt }) => {
      const secret = (await import('../config/index.js')).default.auth.jwtSecret;
      const expired = jwt.sign(
        { sub: '000000000000000000000001', role: 'user' },
        secret,
        { expiresIn: -1, issuer: 'creator-os' }
      );

      const res = await request(app)
        .post(api('/logout-all'))
        .set('Authorization', `Bearer ${expired}`);
      assert.equal(res.status, 401);
    });
  });

  it('ignores a completely invalid JWT string', async () => {
    const res = await request(app)
      .post(api('/logout'))
      .set('Authorization', 'Bearer this.is.not.valid');
    assert.equal(res.status, 401);
  });
});
