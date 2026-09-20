import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { runMigrations } from '../db/migrations.js';
import { db } from '../db/index.js';

describe('Auth & Session Security Tests', () => {
  beforeAll(() => {
    runMigrations();
  });

  const testUser = {
    username: `authtest_${Date.now()}`,
    password: 'Password@123',
    displayName: 'Auth Test User',
    ageConfirmed18: true,
    consents: { terms_privacy: true },
  };

  it('performs full auth cycle: signup -> login -> set-cookie -> /me (200) -> logout -> /me (401)', async () => {
    // 1. Signup
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send(testUser);

    expect(signupRes.status).toBe(201);
    expect(signupRes.body.user).toBeDefined();
    expect(signupRes.body.user.username).toBe(testUser.username.toLowerCase());
    expect(signupRes.headers['set-cookie']).toBeDefined();

    // 2. Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: testUser.username,
        password: testUser.password,
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user).toBeDefined();
    expect(loginRes.body.user.username).toBe(testUser.username.toLowerCase());

    const cookies = loginRes.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const sessionCookie = cookies[0];
    expect(sessionCookie).toContain('raksha_session');
    expect(sessionCookie).toContain('HttpOnly');
    expect(sessionCookie).toContain('Path=/');

    // 3. Access /api/me with session cookie
    const meRes = await request(app)
      .get('/api/me')
      .set('Cookie', sessionCookie);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.username).toBe(testUser.username.toLowerCase());

    // 4. Logout
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', sessionCookie);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.headers['set-cookie']).toBeDefined();

    // 5. Access /api/me after logout (without valid session)
    const unauthRes = await request(app)
      .get('/api/me');

    expect(unauthRes.status).toBe(401);
  });

  it('rejects wrong password with 401 and specific error message', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: testUser.username,
        password: 'WrongPassword@999',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(res.body.error.message).toBe('Incorrect username or password');
  });

  it('rejects non-existent user with 401 and generic security error', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'non_existent_user_99999',
        password: 'SomePassword@123',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('verifies dynamic cookie secure flag behavior (HTTP vs HTTPS forwarded)', async () => {
    // HTTP request (no HTTPS proto) -> Secure flag should NOT be present
    const httpRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: testUser.username,
        password: testUser.password,
      });

    expect(httpRes.status).toBe(200);
    const httpCookie = httpRes.headers['set-cookie'][0];
    expect(httpCookie.toLowerCase()).not.toContain('; secure');

    // HTTPS request (via X-Forwarded-Proto: https) -> Secure flag SHOULD be present
    const httpsRes = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-Proto', 'https')
      .send({
        username: testUser.username,
        password: testUser.password,
      });

    expect(httpsRes.status).toBe(200);
    const httpsCookie = httpsRes.headers['set-cookie'][0];
    expect(httpsCookie.toLowerCase()).toContain('secure');
  });

  it('triggers rate limiting after exceeding max attempts', async () => {
    const rateLimitIp = '198.51.100.55';

    // Send 10 attempts
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', rateLimitIp)
        .send({ username: 'someone', password: 'bad' });
    }

    // 11th attempt should trigger 429
    const limitedRes = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', rateLimitIp)
      .send({ username: 'someone', password: 'bad' });

    expect(limitedRes.status).toBe(429);
    expect(limitedRes.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});
