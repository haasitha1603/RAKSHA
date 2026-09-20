import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { runMigrations } from '../db/migrations.js';
import { db } from '../db/index.js';
import { authRouter } from '../routes/auth.js';
import { sosRouter } from '../routes/sos.js';
import { guardiansRouter } from '../routes/guardians.js';
import { demoRouter } from '../routes/demo.js';
import { createEmergencyIncident } from '../engine/emergency.js';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api', authRouter);
app.use('/api', sosRouter);
app.use('/api', guardiansRouter);
app.use('/api', demoRouter);

describe('Server API Endpoints & Emergency Bridge', () => {
  let sessionCookie: string;
  let testUserId: string;

  beforeAll(async () => {
    await runMigrations();
    // Seed test facilities for dispatch test
    await db.prepare(`
      INSERT OR IGNORE INTO facilities (id, type, name, lat, lng, phone, is_24x7, is_demo, source)
      VALUES 
        ('test_ps_1', 'police', 'Test Police Station', 28.6140, 77.2091, '112', 1, 1, 'test'),
        ('test_hosp_1', 'hospital', 'Test Hospital Desk', 28.6145, 77.2095, '108', 1, 1, 'test')
    `).run();
  });

  it('handles user signup with 18+ verification and returns session cookie', async () => {
    const testUsername = `testuser_${Date.now()}`;
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        username: testUsername,
        password: 'Password@123',
        displayName: 'Aarav Kumar',
        ageConfirmed18: true,
        consents: { terms_privacy: true },
      });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.username).toBe(testUsername);
    testUserId = res.body.user.id;

    const cookieHeader = res.headers['set-cookie'];
    expect(cookieHeader).toBeDefined();
    sessionCookie = cookieHeader[0];
  });

  it('rejects signup without 18+ confirmation', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        username: `minor_${Date.now()}`,
        password: 'Password@123',
        displayName: 'Minor User',
        ageConfirmed18: false,
        consents: { terms_privacy: true },
      });

    expect(res.status).toBe(400);
  });

  it('fetches current user profile via session cookie', async () => {
    const res = await request(app)
      .get('/api/me')
      .set('Cookie', sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(testUserId);
  });

  it('sets safety PIN and duress PIN ensuring they differ', async () => {
    // Fails if pins are identical
    const failRes = await request(app)
      .post('/api/me/pins')
      .set('Cookie', sessionCookie)
      .send({
        safetyPin: '1234',
        duressPin: '1234',
      });
    expect(failRes.status).toBe(400);

    // Succeeds if pins differ
    const successRes = await request(app)
      .post('/api/me/pins')
      .set('Cookie', sessionCookie)
      .send({
        safetyPin: '1234',
        duressPin: '4321',
      });
    expect(successRes.status).toBe(200);
    expect(successRes.body.success).toBe(true);
  });

  it('creates an emergency incident and dispatches in parallel', async () => {
    const incidentId = await createEmergencyIncident({
      userId: testUserId,
      trigger: 'button',
      discreet: false,
      duress: false,
      lat: 28.6139,
      lng: 77.2090,
      acc: 12,
    });

    expect(incidentId).toMatch(/^inc_/);

    const incident = await db.prepare(`SELECT * FROM incidents WHERE id = ?`).get(incidentId) as any;
    expect(incident).toBeDefined();
    expect(incident.level).toBe(3);

    // Verify parallel notifications were created
    const notifs = await db.prepare(`SELECT * FROM notifications WHERE incident_id = ?`).all(incidentId);
    expect(notifs.length).toBeGreaterThanOrEqual(2); // At least police and hospital
  });

  it('keeps emergency running silently when cancelled with Duress PIN', async () => {
    // 1. Create SOS event
    const sosRes = await request(app)
      .post('/api/sos')
      .set('Cookie', sessionCookie)
      .send({
        trigger: 'hold',
        discreet: true,
        location: { lat: 28.6139, lng: 77.2090, acc: 10 },
      });

    expect(sosRes.status).toBe(201);
    const sosId = sosRes.body.sosId;

    // 2. Cancel using Duress PIN (4321)
    const cancelRes = await request(app)
      .post(`/api/sos/${sosId}/cancel`)
      .set('Cookie', sessionCookie)
      .send({ pin: '4321' });

    // Client sees benign "cancelled" response
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.status).toBe('cancelled');

    // But in DB, status is 'duress_escalated'
    const sosRow = await db.prepare(`SELECT * FROM sos_events WHERE id = ?`).get(sosId) as any;
    expect(sosRow.status).toBe('duress_escalated');

    // And an emergency incident with duress=1 exists
    const duressIncident = await db.prepare(`SELECT * FROM incidents WHERE sos_id = ?`).get(sosId) as any;
    expect(duressIncident).toBeDefined();
    expect(duressIncident.duress).toBe(1);
  });
});
