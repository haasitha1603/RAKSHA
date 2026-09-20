import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  createGuardianSchema,
  pushSubscribeSchema,
  GuardianRow,
  UserRow,
  JourneyRow,
  GuardianSnapshot,
  IncidentRow,
  TIMING_PROFILES,
  TimingProfileKey,
} from '@raksha/shared';
import { smsProvider } from '../services/sms.js';
import { sendWebPush } from '../services/push.js';
import { emitToRoom } from '../sockets/index.js';
import { acknowledgeIncident } from '../engine/emergency.js';

export const guardiansRouter = Router();

// ================= USER ENDPOINTS =================

guardiansRouter.get('/guardians', requireAuth, async (req: AuthRequest, res: Response) => {
  const guardians = await db.prepare(`
    SELECT * FROM guardians WHERE user_id = ? ORDER BY priority ASC, created_at DESC
  `).all(req.user!.id);
  res.json({ guardians });
});

guardiansRouter.post(
  '/guardians',
  requireAuth,
  validateBody(createGuardianSchema),
  async (req: AuthRequest, res: Response) => {
    const { name, phone, relation, priority, toldConfirmed } = req.body;
    const userId = req.user!.id;

    // Limit to max 5 guardians
    const countRow = (await db.prepare(`SELECT COUNT(*) as c FROM guardians WHERE user_id = ?`).get(userId)) as any;
    const count = Number(countRow?.c || 0);
    if (count >= 5) {
      res.status(400).json({ error: { code: 'GUARDIAN_LIMIT', message: 'You can add up to 5 guardians' } });
      return;
    }

    const guardianId = `g_${nanoid(8)}`;
    const token = `gtok_${nanoid(20)}`;
    const nowIso = new Date().toISOString();

    await db.prepare(`
      INSERT INTO guardians (
        id, user_id, name, phone, relation, priority, status, token, told_confirmed, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `).run(guardianId, userId, name.trim(), phone.trim(), relation.trim(), priority || 1, token, toldConfirmed ? 1 : 0, nowIso);

    // Initial invite SMS
    const inviteLink = `http://localhost:5173/g/${token}`;
    smsProvider.send({
      toPhone: phone,
      body: `Hi ${name}, ${req.user!.display_name} has listed you as a safety guardian on Raksha. View & accept: ${inviteLink}`,
      kind: 'guardian_invite',
    }).catch(() => {});

    res.status(201).json({
      guardian: {
        id: guardianId,
        name,
        phone,
        relation,
        priority,
        status: 'pending',
        token,
      },
    });
  }
);

guardiansRouter.patch('/guardians/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const { name, phone, relation, priority } = req.body;
  const guardian = await db.prepare(`SELECT * FROM guardians WHERE id = ? AND user_id = ?`).get(req.params.id, req.user!.id);
  if (!guardian) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Guardian not found' } });
    return;
  }

  await db.prepare(`
    UPDATE guardians SET
      name = COALESCE(?, name),
      phone = COALESCE(?, phone),
      relation = COALESCE(?, relation),
      priority = COALESCE(?, priority)
    WHERE id = ?
  `).run(name?.trim() ?? null, phone?.trim() ?? null, relation?.trim() ?? null, priority ?? null, req.params.id);

  res.json({ success: true });
});

guardiansRouter.delete('/guardians/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  await db.prepare(`DELETE FROM guardians WHERE id = ? AND user_id = ?`).run(req.params.id, req.user!.id);
  res.json({ success: true });
});

guardiansRouter.post('/guardians/:id/test', requireAuth, async (req: AuthRequest, res: Response) => {
  const guardian = (await db.prepare(`
    SELECT * FROM guardians WHERE id = ? AND user_id = ?
  `).get(req.params.id, req.user!.id)) as GuardianRow | undefined;

  if (!guardian) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Guardian not found' } });
    return;
  }

  // Send test mock SMS and push
  const testMsg = `[RAKSHA TEST] Hi ${guardian.name}, this is a test alert from ${req.user!.display_name}. Everything is safe!`;
  await smsProvider.send({
    toPhone: guardian.phone,
    body: testMsg,
    kind: 'test_alert',
  });

  await sendWebPush('guardian', guardian.id, {
    title: 'Raksha Test Alert',
    body: `${req.user!.display_name} sent you a test alert. Coordination is working!`,
    data: { url: `/g/${guardian.token}` },
  });

  res.json({ success: true, message: `Test alert sent to ${guardian.name}.` });
});

guardiansRouter.post('/guardians/:id/revoke', requireAuth, async (req: AuthRequest, res: Response) => {
  const newToken = `gtok_${nanoid(20)}`;
  await db.prepare(`UPDATE guardians SET token = ? WHERE id = ? AND user_id = ?`).run(newToken, req.params.id, req.user!.id);
  res.json({ success: true, token: newToken });
});

// ================= PUBLIC /g/:token ENDPOINTS =================

guardiansRouter.get('/g/:token', async (req: Request, res: Response) => {
  const guardian = (await db.prepare(`SELECT * FROM guardians WHERE token = ?`).get(req.params.token)) as GuardianRow | undefined;
  if (!guardian) {
    res.status(404).json({ error: { code: 'INVALID_TOKEN', message: 'Guardian link expired or invalid' } });
    return;
  }

  const user = (await db.prepare(`SELECT id, display_name FROM users WHERE id = ?`).get(guardian.user_id)) as UserRow;

  // Log access
  const nowIso = new Date().toISOString();
  await db.prepare(`UPDATE guardians SET last_viewed_at = ? WHERE id = ?`).run(nowIso, guardian.id);

  // Check active journey
  const activeJourney = (await db.prepare(`
    SELECT * FROM journeys WHERE user_id = ? AND status IN ('active', 'emergency')
    ORDER BY started_at DESC LIMIT 1
  `).get(user.id)) as JourneyRow | undefined;

  if (activeJourney) {
    await db.prepare(`
      INSERT INTO guardian_access_log (id, guardian_id, journey_id, ts)
      VALUES (?, ?, ?, ?)
    `).run(`gal_${nanoid(8)}`, guardian.id, activeJourney.id, nowIso);
  }

  // Check active incident
  const activeIncident = (await db.prepare(`
    SELECT * FROM incidents WHERE user_id = ? AND status IN ('open', 'acknowledged')
    ORDER BY created_at DESC LIMIT 1
  `).get(user.id)) as IncidentRow | undefined;

  let packet;
  if (activeIncident) {
    try {
      packet = JSON.parse(activeIncident.packet_json);
    } catch {}
  }

  // Build timeline
  let timeline: any[] = [];
  if (activeJourney) {
    timeline = await db.prepare(`
      SELECT * FROM journey_events WHERE journey_id = ? ORDER BY ts DESC
    `).all(activeJourney.id);
  }

  const snapshot: GuardianSnapshot = {
    guardian: {
      id: guardian.id,
      name: guardian.name,
      phone: guardian.phone,
      relation: guardian.relation,
      status: guardian.status,
    },
    user: {
      displayName: user.display_name,
    },
    journey: activeJourney
      ? {
          id: activeJourney.id,
          status: activeJourney.status,
          mode: activeJourney.mode,
          origin: JSON.parse(activeJourney.origin_json || '{}'),
          destination: JSON.parse(activeJourney.dest_json || '{}'),
          startedAt: activeJourney.started_at,
          plannedEta: activeJourney.planned_eta_ts,
          level: activeJourney.level,
          riskScore: activeJourney.risk_score,
          riskSummary: activeJourney.level === 3 ? 'Emergency' : activeJourney.level === 2 ? 'Safety Check in Progress' : activeJourney.level === 1 ? 'Caution' : 'Normal',
          lastLocation: activeJourney.last_lat
            ? {
                lat: activeJourney.last_lat,
                lng: activeJourney.last_lng!,
                accuracyM: activeJourney.last_acc || 15,
                confidence: (activeJourney.last_acc || 10) > 100 ? 'low' : (activeJourney.last_acc || 10) > 30 ? 'medium' : 'high',
                lastFixAt: activeJourney.last_seen_ts || nowIso,
              }
            : null,
          battery: activeJourney.battery,
          online: Boolean(activeJourney.online),
          cab: activeJourney.cab_json ? JSON.parse(activeJourney.cab_json) : undefined,
        }
      : null,
    incident: activeIncident
      ? {
          id: activeIncident.id,
          status: activeIncident.status,
          trigger: activeIncident.trigger,
          duress: Boolean(activeIncident.duress),
          createdAt: activeIncident.created_at,
          packet,
        }
      : null,
    timeline: timeline.map((e) => ({
      id: e.id,
      ts: e.ts,
      type: e.type,
      title: e.type.replace(/_/g, ' ').toUpperCase(),
      description: e.payload_json,
    })),
  };

  res.json(snapshot);
});

guardiansRouter.post('/g/:token/accept', async (req: Request, res: Response) => {
  const guardian = (await db.prepare(`SELECT * FROM guardians WHERE token = ?`).get(req.params.token)) as GuardianRow | undefined;
  if (!guardian) {
    res.status(404).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid token' } });
    return;
  }

  await db.prepare(`UPDATE guardians SET status = 'accepted' WHERE id = ?`).run(guardian.id);
  res.json({ success: true, status: 'accepted' });
});

guardiansRouter.post('/g/:token/leave', async (req: Request, res: Response) => {
  const guardian = (await db.prepare(`SELECT * FROM guardians WHERE token = ?`).get(req.params.token)) as GuardianRow | undefined;
  if (!guardian) {
    res.status(404).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid token' } });
    return;
  }

  await db.prepare(`UPDATE guardians SET status = 'left' WHERE id = ?`).run(guardian.id);
  res.json({ success: true, status: 'left' });
});

guardiansRouter.post('/g/:token/ack', async (req: Request, res: Response) => {
  const guardian = (await db.prepare(`SELECT * FROM guardians WHERE token = ?`).get(req.params.token)) as GuardianRow | undefined;
  if (!guardian) {
    res.status(404).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid token' } });
    return;
  }

  const activeIncident = (await db.prepare(`
    SELECT * FROM incidents WHERE user_id = ? AND status IN ('open', 'acknowledged')
    ORDER BY created_at DESC LIMIT 1
  `).get(guardian.user_id)) as IncidentRow | undefined;

  if (activeIncident) {
    await acknowledgeIncident(activeIncident.id, 'guardian', guardian.id);
  }

  res.json({ success: true });
});

guardiansRouter.post('/g/:token/on-my-way', async (req: Request, res: Response) => {
  const guardian = (await db.prepare(`SELECT * FROM guardians WHERE token = ?`).get(req.params.token)) as GuardianRow | undefined;
  if (!guardian) {
    res.status(404).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid token' } });
    return;
  }

  const nowIso = new Date().toISOString();
  const activeJourney = (await db.prepare(`
    SELECT * FROM journeys WHERE user_id = ? AND status IN ('active', 'emergency')
    ORDER BY started_at DESC LIMIT 1
  `).get(guardian.user_id)) as JourneyRow | undefined;

  if (activeJourney) {
    await db.prepare(`
      INSERT INTO journey_events (id, journey_id, ts, type, payload_json)
      VALUES (?, ?, ?, 'guardian_on_my_way', ?)
    `).run(`evt_${nanoid(8)}`, activeJourney.id, nowIso, JSON.stringify({ guardianName: guardian.name }));

    emitToRoom(`journey:${activeJourney.id}`, 'journey:event', {
      type: 'guardian_on_my_way',
      title: 'Guardian On Their Way',
      message: `${guardian.name} is on their way to assist.`,
    });
  }

  res.json({ success: true });
});

guardiansRouter.post('/g/:token/request-checkin', async (req: Request, res: Response) => {
  const guardian = (await db.prepare(`SELECT * FROM guardians WHERE token = ?`).get(req.params.token)) as GuardianRow | undefined;
  if (!guardian) {
    res.status(404).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid token' } });
    return;
  }

  const activeJourney = (await db.prepare(`
    SELECT * FROM journeys WHERE user_id = ? AND status = 'active'
    ORDER BY started_at DESC LIMIT 1
  `).get(guardian.user_id)) as JourneyRow | undefined;

  if (!activeJourney) {
    res.status(400).json({ error: { code: 'NO_ACTIVE_JOURNEY', message: 'No active journey in progress' } });
    return;
  }

  const checkId = `chk_${nanoid(8)}`;
  const profileKey = (activeJourney.timing_profile as TimingProfileKey) || 'demo';
  const timeoutMs = TIMING_PROFILES[profileKey].safetyCheckTimeout;
  const nowIso = new Date().toISOString();
  const dueAt = new Date(Date.now() + timeoutMs).toISOString();

  await db.prepare(`
    INSERT INTO safety_checks (id, journey_id, kind, sent_at, due_at)
    VALUES (?, ?, 'guardian_request', ?, ?)
  `).run(checkId, activeJourney.id, nowIso, dueAt);

  emitToRoom(`journey:${activeJourney.id}`, 'safety-check:prompt', {
    id: checkId,
    journeyId: activeJourney.id,
    dueAt,
    message: `${guardian.name} requested a safety check. Are you safe?`,
  });

  res.json({ success: true, checkId, dueAt });
});

guardiansRouter.post(
  '/g/:token/push-subscribe',
  validateBody(pushSubscribeSchema),
  async (req: Request, res: Response) => {
    const guardian = (await db.prepare(`SELECT * FROM guardians WHERE token = ?`).get(req.params.token)) as GuardianRow | undefined;
    if (!guardian) {
      res.status(404).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid token' } });
      return;
    }

    const { endpoint, keys } = req.body;
    const nowIso = new Date().toISOString();

    await db.prepare(`
      INSERT INTO push_subscriptions (id, owner_type, owner_id, endpoint, keys_json, created_at)
      VALUES (?, 'guardian', ?, ?, ?, ?)
      ON CONFLICT (endpoint) DO UPDATE SET keys_json = EXCLUDED.keys_json, created_at = EXCLUDED.created_at
    `).run(`ps_${nanoid(8)}`, guardian.id, endpoint, JSON.stringify(keys), nowIso);

    res.json({ success: true });
  }
);
