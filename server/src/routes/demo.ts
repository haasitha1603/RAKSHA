import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { seedDatabase } from '../seed/generate.js';
import { validateBody } from '../middleware/validate.js';
import { demoConfigSchema, JourneyRow } from '@raksha/shared';
import { emitToRoom } from '../sockets/index.js';

export const demoRouter = Router();

demoRouter.get('/demo/config', async (_req: Request, res: Response) => {
  const profileRow = (await db.prepare(`SELECT value FROM app_config WHERE key = 'timing_profile_default'`).get()) as { value: string } | undefined;
  const latRow = (await db.prepare(`SELECT value FROM app_config WHERE key = 'demo_center_lat'`).get()) as { value: string } | undefined;
  const lngRow = (await db.prepare(`SELECT value FROM app_config WHERE key = 'demo_center_lng'`).get()) as { value: string } | undefined;

  res.json({
    timingProfile: profileRow?.value || 'demo',
    centerLat: latRow ? parseFloat(latRow.value) : 28.6139,
    centerLng: lngRow ? parseFloat(lngRow.value) : 77.2090,
  });
});

demoRouter.post('/demo/config', validateBody(demoConfigSchema), async (req: Request, res: Response) => {
  const { timingProfile, centerLat, centerLng } = req.body;

  if (timingProfile) {
    await db.prepare(`INSERT INTO app_config (key, value) VALUES ('timing_profile_default', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`).run(timingProfile);
    // Also update any active journeys
    await db.prepare(`UPDATE journeys SET timing_profile = ? WHERE status = 'active'`).run(timingProfile);
  }
  if (centerLat != null) {
    await db.prepare(`INSERT INTO app_config (key, value) VALUES ('demo_center_lat', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`).run(centerLat.toString());
  }
  if (centerLng != null) {
    await db.prepare(`INSERT INTO app_config (key, value) VALUES ('demo_center_lng', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`).run(centerLng.toString());
  }

  res.json({ success: true, timingProfile, centerLat, centerLng });
});

demoRouter.post('/demo/reseed', async (req: Request, res: Response) => {
  const latRow = (await db.prepare(`SELECT value FROM app_config WHERE key = 'demo_center_lat'`).get()) as { value: string } | undefined;
  const lngRow = (await db.prepare(`SELECT value FROM app_config WHERE key = 'demo_center_lng'`).get()) as { value: string } | undefined;

  const lat = req.body.centerLat ? parseFloat(req.body.centerLat) : latRow ? parseFloat(latRow.value) : 28.6139;
  const lng = req.body.centerLng ? parseFloat(req.body.centerLng) : lngRow ? parseFloat(lngRow.value) : 77.2090;

  await seedDatabase(lat, lng, Date.now());

  emitToRoom('demo', 'demo:reseeded', { centerLat: lat, centerLng: lng });

  res.json({ success: true, message: 'Demo data reseeded successfully.', centerLat: lat, centerLng: lng });
});

demoRouter.get('/demo/outbox', async (_req: Request, res: Response) => {
  const messages = await db.prepare(`
    SELECT * FROM outbox ORDER BY created_at DESC LIMIT 50
  `).all();
  res.json({ outbox: messages });
});

demoRouter.post('/demo/simulate/:journeyId', async (req: Request, res: Response) => {
  const { journeyId } = req.params;
  const { scenario } = req.body; // deviate | stop | offline | low_battery | speed_jump | arrive

  const journey = (await db.prepare(`SELECT * FROM journeys WHERE id = ?`).get(journeyId)) as JourneyRow | undefined;
  if (!journey) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Journey not found' } });
    return;
  }

  const nowIso = new Date().toISOString();

  if (scenario === 'deviate') {
    // Add 0.003 to latitude (~330 meters off route)
    const newLat = (journey.last_lat || 28.6139) + 0.003;
    const newLng = (journey.last_lng || 77.2090) + 0.003;

    await db.prepare(`
      UPDATE journeys SET last_lat = ?, last_lng = ?, last_seen_ts = ? WHERE id = ?
    `).run(newLat, newLng, nowIso, journeyId);

    await db.prepare(`
      INSERT INTO journey_points (journey_id, ts, lat, lng, acc, speed, heading, battery)
      VALUES (?, ?, ?, ?, 10, 1.3, 45, ?)
    `).run(journeyId, nowIso, newLat, newLng, journey.battery || 80);

    emitToRoom(`journey:${journeyId}`, 'journey:update', {
      journeyId,
      lastLocation: { lat: newLat, lng: newLng, accuracyM: 10, lastFixAt: nowIso },
      simulatedScenario: 'deviate',
    });
  } else if (scenario === 'stop') {
    await db.prepare(`
      UPDATE journeys SET last_seen_ts = ? WHERE id = ?
    `).run(nowIso, journeyId);

    // Insert stationary point with speed = 0
    await db.prepare(`
      INSERT INTO journey_points (journey_id, ts, lat, lng, acc, speed, heading, battery)
      VALUES (?, ?, ?, ?, 8, 0, 0, ?)
    `).run(journeyId, nowIso, journey.last_lat || 28.6139, journey.last_lng || 77.2090, journey.battery || 80);

    emitToRoom(`journey:${journeyId}`, 'journey:update', {
      journeyId,
      simulatedScenario: 'stop',
    });
  } else if (scenario === 'offline') {
    await db.prepare(`UPDATE journeys SET online = 0 WHERE id = ?`).run(journeyId);
    emitToRoom(`journey:${journeyId}`, 'journey:update', {
      journeyId,
      online: false,
      notice: 'Connection lost (simulated).',
    });
  } else if (scenario === 'low_battery') {
    await db.prepare(`UPDATE journeys SET battery = 8 WHERE id = ?`).run(journeyId);
    emitToRoom(`journey:${journeyId}`, 'journey:update', {
      journeyId,
      battery: 8,
      notice: 'Battery critically low (8%).',
    });
  }

  res.json({ success: true, scenario });
});
