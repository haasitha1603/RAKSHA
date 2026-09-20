import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { runMigrations } from '../db/migrations.js';
import { db } from '../db/index.js';
import { authRouter } from '../routes/auth.js';
import { journeysRouter } from '../routes/journeys.js';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api', authRouter);
app.use('/api', journeysRouter);

describe('Retention, Export & Cascade Delete', () => {
  it('exports user data and then permanently cascades on account delete', async () => {
    runMigrations();

    const username = `deluser_${Date.now()}`;
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({
        username,
        password: 'Password@123',
        displayName: 'Delete Me',
        ageConfirmed18: true,
        consents: { terms_privacy: true },
      });

    const cookie = signupRes.headers['set-cookie'][0];
    const userId = signupRes.body.user.id;

    // 1. Export Data
    const exportRes = await request(app)
      .get('/api/me/export')
      .set('Cookie', cookie);

    expect(exportRes.status).toBe(200);
    expect(exportRes.body.user.id).toBe(userId);
    expect(exportRes.body.consents.length).toBeGreaterThan(0);

    // 2. Delete Account
    const deleteRes = await request(app)
      .delete('/api/me')
      .set('Cookie', cookie)
      .send({ password: 'Password@123' });

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // Verify user is gone
    const checkUser = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
    expect(checkUser).toBeUndefined();

    // Verify consents cascaded
    const checkConsents = db.prepare(`SELECT * FROM consents WHERE user_id = ?`).all(userId);
    expect(checkConsents.length).toBe(0);
  });
});
