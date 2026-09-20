import { Router, Response } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  createJourneySchema,
  positionBatchSchema,
  safetyCheckResponseSchema,
  plannedStopSchema,
  JourneyRow,
  JourneyPointRow,
  TIMING_PROFILES,
  TimingProfileKey,
} from '@raksha/shared';
import { filterPositions, evaluateJourneyRisk } from '../engine/riskEngine.js';
import { emitToRoom } from '../sockets/index.js';
import { createEmergencyIncident } from '../engine/emergency.js';
import { smsProvider } from '../services/sms.js';

export const journeysRouter = Router();

journeysRouter.get('/journeys/active', requireAuth, async (req: AuthRequest, res: Response) => {
  const journey = (await db.prepare(`
    SELECT * FROM journeys WHERE user_id = ? AND status IN ('active', 'emergency')
    ORDER BY started_at DESC LIMIT 1
  `).get(req.user!.id)) as JourneyRow | undefined;

  if (!journey) {
    res.json({ journey: null });
    return;
  }

  // Get active safety check if any
  const nowIso = new Date().toISOString();
  const pendingCheck = await db.prepare(`
    SELECT * FROM safety_checks
    WHERE journey_id = ? AND responded_at IS NULL AND due_at > ?
    ORDER BY sent_at DESC LIMIT 1
  `).get(journey.id, nowIso);

  res.json({ journey, pendingCheck: pendingCheck || null });
});

journeysRouter.get('/journeys', requireAuth, async (req: AuthRequest, res: Response) => {
  const journeys = await db.prepare(`
    SELECT * FROM journeys WHERE user_id = ? ORDER BY started_at DESC
  `).all(req.user!.id);
  res.json({ journeys });
});

journeysRouter.get('/journeys/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const journey = (await db.prepare(`
    SELECT * FROM journeys WHERE id = ? AND user_id = ?
  `).get(req.params.id, req.user!.id)) as JourneyRow | undefined;

  if (!journey) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Journey not found' } });
    return;
  }

  const points = await db.prepare(`
    SELECT * FROM journey_points WHERE journey_id = ? ORDER BY id ASC
  `).all(journey.id);

  const events = await db.prepare(`
    SELECT * FROM journey_events WHERE journey_id = ? ORDER BY ts ASC
  `).all(journey.id);

  res.json({ journey, points, events });
});

journeysRouter.post(
  '/journeys',
  requireAuth,
  validateBody(createJourneySchema),
  async (req: AuthRequest, res: Response) => {
    const {
      mode,
      origin,
      destination,
      selectedRoute,
      plannedEta,
      guardianIds,
      checkpointIntervalMin,
      plannedStops,
      cab,
      timingProfile,
      drill,
      drillScenario,
    } = req.body;

    const journeyId = `jny_${nanoid(10)}`;

    await db.prepare(`
      INSERT INTO journeys (
        id, user_id, status, mode, origin_json, dest_json, route_json,
        planned_eta_ts, timing_profile, simulated, level, risk_score,
        risk_explain_json, cab_json, checkpoint_rule_json, guardian_ids_json,
        online, share_expires_at, drill, drill_scenario
      ) VALUES (?, ?, 'planned', ?, ?, ?, ?, ?, ?, 0, 0, 10, '[]', ?, ?, ?, 1, ?, ?, ?)
    `).run(
      journeyId,
      req.user!.id,
      mode,
      JSON.stringify(origin),
      JSON.stringify(destination),
      JSON.stringify(selectedRoute),
      plannedEta,
      timingProfile || 'production',
      cab ? JSON.stringify(cab) : null,
      checkpointIntervalMin ? JSON.stringify({ intervalMin: checkpointIntervalMin }) : null,
      JSON.stringify(guardianIds || []),
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      drill ? 1 : 0,
      drillScenario || null
    );

    // Insert planned stops if provided
    if (plannedStops && plannedStops.length > 0) {
      const insertStop = db.prepare(`
        INSERT INTO planned_stops (id, journey_id, label, lat, lng, radius_m, until_ts)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const ps of plannedStops) {
        await insertStop.run(`stop_${nanoid(6)}`, journeyId, ps.label, ps.lat, ps.lng, ps.radiusM || 100, ps.untilTs);
      }
    }

    res.status(201).json({ journeyId });
  }
);

journeysRouter.post('/journeys/:id/start', requireAuth, async (req: AuthRequest, res: Response) => {
  const journey = (await db.prepare(`
    SELECT * FROM journeys WHERE id = ? AND user_id = ?
  `).get(req.params.id, req.user!.id)) as JourneyRow | undefined;

  if (!journey) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Journey not found' } });
    return;
  }

  const nowIso = new Date().toISOString();
  await db.prepare(`
    UPDATE journeys SET status = 'active', started_at = ?, last_seen_ts = ? WHERE id = ?
  `).run(nowIso, nowIso, journey.id);

  // Add event
  await db.prepare(`
    INSERT INTO journey_events (id, journey_id, ts, type, payload_json)
    VALUES (?, ?, ?, 'journey_started', '{}')
  `).run(`evt_${nanoid(8)}`, journey.id, nowIso);

  // Notify guardians
  try {
    const gIds: string[] = JSON.parse(journey.guardian_ids_json);
    for (const gid of gIds) {
      const guardian = (await db.prepare(`SELECT * FROM guardians WHERE id = ?`).get(gid)) as any;
      if (guardian) {
        smsProvider.send({
          toPhone: guardian.phone,
          body: `${req.user!.display_name} has started their journey to ${JSON.parse(journey.dest_json).label}. Track: http://localhost:5173/g/${guardian.token}`,
          kind: 'journey_start',
          journeyId: journey.id,
        }).catch(() => {});
      }
    }
  } catch {}

  emitToRoom(`journey:${journey.id}`, 'journey:update', {
    journeyId: journey.id,
    status: 'active',
    startedAt: nowIso,
  });

  res.json({ success: true, startedAt: nowIso });
});

journeysRouter.post(
  '/journeys/:id/positions',
  requireAuth,
  validateBody(positionBatchSchema),
  async (req: AuthRequest, res: Response) => {
    const journey = (await db.prepare(`
      SELECT * FROM journeys WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user!.id)) as JourneyRow | undefined;

    if (!journey) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Journey not found' } });
      return;
    }

    const rawPositions = req.body.positions;
    const cleanPositions = filterPositions(rawPositions);
    if (cleanPositions.length === 0) {
      res.json({
        riskScore: journey.risk_score,
        level: journey.level,
        explanations: [],
        prompts: [],
      });
      return;
    }

    const latest = cleanPositions[cleanPositions.length - 1];

    // Insert points into DB
    const insertPt = db.prepare(`
      INSERT INTO journey_points (journey_id, ts, lat, lng, acc, speed, heading, battery)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const pt of cleanPositions) {
      await insertPt.run(
        journey.id,
        pt.ts,
        pt.lat,
        pt.lng,
        pt.acc,
        pt.speed ?? null,
        pt.heading ?? null,
        pt.battery ?? null
      );
    }

    // Fetch recent points for risk evaluation
    const recentPoints = (await db.prepare(`
      SELECT * FROM journey_points WHERE journey_id = ? ORDER BY id DESC LIMIT 30
    `).all(journey.id)) as JourneyPointRow[];

    // Evaluate Risk Engine
    const evalResult = await evaluateJourneyRisk(journey, latest, recentPoints);

    // Update journey state
    await db.prepare(`
      UPDATE journeys SET
        level = ?, risk_score = ?, risk_explain_json = ?,
        last_seen_ts = ?, last_lat = ?, last_lng = ?, last_acc = ?,
        battery = ?, online = 1
      WHERE id = ?
    `).run(
      evalResult.level,
      evalResult.riskScore,
      JSON.stringify(evalResult.explanations),
      latest.ts,
      latest.lat,
      latest.lng,
      latest.acc,
      latest.battery ?? null,
      journey.id
    );

    // If Level 2 triggered -> create Safety Check prompt
    if (evalResult.shouldTriggerSafetyCheck) {
      const checkId = `chk_${nanoid(8)}`;
      const profileKey = (journey.timing_profile as TimingProfileKey) || 'demo';
      const timeoutMs = TIMING_PROFILES[profileKey].safetyCheckTimeout;
      const dueAt = new Date(Date.now() + timeoutMs).toISOString();

      await db.prepare(`
        INSERT INTO safety_checks (id, journey_id, kind, sent_at, due_at)
        VALUES (?, ?, 'risk', ?, ?)
      `).run(checkId, journey.id, latest.ts, dueAt);

      evalResult.prompts.push({
        type: 'safety_check',
        id: checkId,
        dueAt,
      });

      emitToRoom(`journey:${journey.id}`, 'safety-check:prompt', {
        id: checkId,
        journeyId: journey.id,
        dueAt,
        message: 'Are you safe? Please confirm.',
      });
    }

    // If Level 3 reached -> Trigger emergency coordination
    if (evalResult.shouldEscalateToEmergency && journey.status !== 'emergency') {
      createEmergencyIncident({
        userId: journey.user_id,
        journeyId: journey.id,
        trigger: 'auto_escalation',
        discreet: false,
        lat: latest.lat,
        lng: latest.lng,
        acc: latest.acc,
      }).catch((e) => console.error('Failed auto escalation to emergency:', e));
    }

    // Broadcast live telemetry
    emitToRoom(`journey:${journey.id}`, 'journey:update', {
      journeyId: journey.id,
      level: evalResult.level,
      riskScore: evalResult.riskScore,
      lastLocation: {
        lat: latest.lat,
        lng: latest.lng,
        accuracyM: latest.acc,
        lastFixAt: latest.ts,
      },
      battery: latest.battery,
      online: true,
    });

    res.json(evalResult);
  }
);

journeysRouter.post(
  '/journeys/:id/safety-check/:checkId/respond',
  requireAuth,
  validateBody(safetyCheckResponseSchema),
  async (req: AuthRequest, res: Response) => {
    const { id, checkId } = req.params;
    const { response } = req.body;
    const nowIso = new Date().toISOString();

    const check = (await db.prepare(`
      SELECT * FROM safety_checks WHERE id = ? AND journey_id = ?
    `).get(checkId, id)) as any;

    if (!check) {
      res.status(404).json({ error: { code: 'CHECK_NOT_FOUND', message: 'Safety check not found' } });
      return;
    }

    await db.prepare(`
      UPDATE safety_checks SET responded_at = ?, response = ? WHERE id = ?
    `).run(nowIso, response, checkId);

    const journey = (await db.prepare(`SELECT * FROM journeys WHERE id = ?`).get(id)) as JourneyRow;

    if (response === 'safe') {
      // Lower risk score back to Level 0 / 1
      await db.prepare(`
        UPDATE journeys SET level = 0, risk_score = 15 WHERE id = ?
      `).run(id);

      await db.prepare(`
        INSERT INTO journey_events (id, journey_id, ts, type, payload_json)
        VALUES (?, ?, ?, 'safety_check_confirmed_safe', '{}')
      `).run(`evt_${nanoid(8)}`, id, nowIso);

      emitToRoom(`journey:${id}`, 'journey:update', {
        journeyId: id,
        level: 0,
        riskScore: 15,
        notice: 'Traveller confirmed they are safe.',
      });

      res.json({ success: true, message: 'Safety check response logged: Safe.' });
    } else {
      // response === 'help' -> Escalate immediately to emergency
      const incidentId = await createEmergencyIncident({
        userId: req.user!.id,
        journeyId: journey.id,
        trigger: 'safety_check_help',
        discreet: false,
        lat: journey.last_lat || 28.6139,
        lng: journey.last_lng || 77.2090,
        acc: journey.last_acc || 10,
      });

      res.json({ success: true, escalated: true, incidentId });
    }
  }
);

journeysRouter.post(
  '/journeys/:id/planned-stops',
  requireAuth,
  validateBody(plannedStopSchema),
  async (req: AuthRequest, res: Response) => {
    const { label, lat, lng, radiusM, untilTs } = req.body;
    const stopId = `stop_${nanoid(8)}`;

    await db.prepare(`
      INSERT INTO planned_stops (id, journey_id, label, lat, lng, radius_m, until_ts)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(stopId, req.params.id, label, lat, lng, radiusM || 100, untilTs);

    res.status(201).json({ stopId });
  }
);

journeysRouter.post('/journeys/:id/arrive', requireAuth, async (req: AuthRequest, res: Response) => {
  const journey = (await db.prepare(`
    SELECT * FROM journeys WHERE id = ? AND user_id = ?
  `).get(req.params.id, req.user!.id)) as JourneyRow | undefined;

  if (!journey) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Journey not found' } });
    return;
  }

  const nowIso = new Date().toISOString();
  await db.prepare(`
    UPDATE journeys SET status = 'completed', ended_at = ?, level = 0, risk_score = 0 WHERE id = ?
  `).run(nowIso, journey.id);

  await db.prepare(`
    INSERT INTO journey_events (id, journey_id, ts, type, payload_json)
    VALUES (?, ?, ?, 'arrived_safe', '{}')
  `).run(`evt_${nanoid(8)}`, journey.id, nowIso);

  // Notify guardians
  try {
    const gIds: string[] = JSON.parse(journey.guardian_ids_json);
    for (const gid of gIds) {
      const guardian = (await db.prepare(`SELECT * FROM guardians WHERE id = ?`).get(gid)) as any;
      if (guardian) {
        smsProvider.send({
          toPhone: guardian.phone,
          body: `${req.user!.display_name} has arrived safely at their destination.`,
          kind: 'arrived_safe',
          journeyId: journey.id,
        }).catch(() => {});
      }
    }
  } catch {}

  emitToRoom(`journey:${journey.id}`, 'journey:update', {
    journeyId: journey.id,
    status: 'completed',
    level: 0,
    riskScore: 0,
    notice: 'Traveller arrived safely.',
  });

  res.json({ success: true, message: 'Safe arrival logged. Guardians notified.' });
});

journeysRouter.post('/journeys/:id/cancel', requireAuth, async (req: AuthRequest, res: Response) => {
  const nowIso = new Date().toISOString();
  await db.prepare(`
    UPDATE journeys SET status = 'cancelled', ended_at = ? WHERE id = ? AND user_id = ?
  `).run(nowIso, req.params.id, req.user!.id);

  emitToRoom(`journey:${req.params.id}`, 'journey:update', {
    journeyId: req.params.id,
    status: 'cancelled',
  });

  res.json({ success: true });
});
