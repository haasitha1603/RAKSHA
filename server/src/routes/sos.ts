import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { sosRateLimiter } from '../middleware/rateLimit.js';
import {
  createSosSchema,
  cancelSosSchema,
  resolveIncidentSchema,
  TIMING_PROFILES,
  TimingProfileKey,
  IncidentRow,
  JourneyRow,
} from '@raksha/shared';
import { createEmergencyIncident } from '../engine/emergency.js';
import { emitToRoom } from '../sockets/index.js';

export const sosRouter = Router();

sosRouter.post(
  '/sos',
  requireAuth,
  sosRateLimiter,
  validateBody(createSosSchema),
  async (req: AuthRequest, res: Response) => {
    const { journeyId, trigger, discreet, location } = req.body;
    const user = req.user!;
    const now = new Date();
    const nowIso = now.toISOString();

    let journey: JourneyRow | undefined;
    if (journeyId) {
      journey = db.prepare(`SELECT * FROM journeys WHERE id = ? AND user_id = ?`).get(journeyId, user.id) as JourneyRow;
    }

    const profileKey = (journey?.timing_profile as TimingProfileKey) || 'demo';
    const profile = TIMING_PROFILES[profileKey] || TIMING_PROFILES.demo;

    // Cancellation window: 10s default (5s if risk level >= 2)
    const windowMs = (journey && journey.level >= 2) ? profile.sosCancelWindowHighRisk : profile.sosCancelWindow;
    const cancelUntil = new Date(now.getTime() + windowMs).toISOString();

    const sosId = `sos_${nanoid(10)}`;

    db.prepare(`
      INSERT INTO sos_events (
        id, user_id, journey_id, trigger, discreet, status, created_at, cancel_until, lat, lng, acc
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
    `).run(
      sosId,
      user.id,
      journeyId || null,
      trigger,
      discreet ? 1 : 0,
      nowIso,
      cancelUntil,
      location.lat,
      location.lng,
      location.acc || 10
    );

    emitToRoom(`user:${user.id}`, 'sos:pending', {
      sosId,
      cancelUntil,
      windowMs,
    });

    res.status(201).json({
      sosId,
      cancelUntil,
      windowMs,
    });
  }
);

sosRouter.post(
  '/sos/:id/cancel',
  requireAuth,
  validateBody(cancelSosSchema),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { pin } = req.body;
    const user = req.user!;

    const sos = db.prepare(`
      SELECT * FROM sos_events WHERE id = ? AND user_id = ?
    `).get(id, user.id) as any;

    if (!sos) {
      res.status(404).json({ error: { code: 'SOS_NOT_FOUND', message: 'SOS event not found' } });
      return;
    }

    // Check if cancellation requires PIN (e.g. if cancel window expired or duress PIN entered)
    if (pin) {
      // Check if this is the Duress PIN
      if (user.duress_pin_hash && (await bcrypt.compare(pin, user.duress_pin_hash))) {
        // DURESS PATH:
        // Visually the UI will show "SOS Cancelled", but behind the scenes:
        // status = 'duress_escalated'
        // An emergency incident is dispatched silently with duress = true!
        db.prepare(`UPDATE sos_events SET status = 'duress_escalated' WHERE id = ?`).run(id);

        await createEmergencyIncident({
          userId: user.id,
          journeyId: sos.journey_id,
          sosId: id,
          trigger: 'duress_pin',
          discreet: true,
          duress: true,
          lat: sos.lat,
          lng: sos.lng,
          acc: sos.acc,
        });

        // Return identical response to normal cancel to preserve user safety
        res.json({
          success: true,
          status: 'cancelled',
          message: 'SOS cancelled successfully.',
        });
        return;
      }

      // Check if this is the regular Safety PIN
      if (user.safety_pin_hash) {
        const isSafetyPin = await bcrypt.compare(pin, user.safety_pin_hash);
        if (!isSafetyPin) {
          res.status(400).json({ error: { code: 'INVALID_PIN', message: 'Invalid PIN entered' } });
          return;
        }
      }
    }

    // Genuine cancellation
    db.prepare(`UPDATE sos_events SET status = 'cancelled' WHERE id = ?`).run(id);

    emitToRoom(`user:${user.id}`, 'sos:cancelled', { sosId: id });

    res.json({
      success: true,
      status: 'cancelled',
      message: 'SOS cancelled successfully.',
    });
  }
);

sosRouter.post('/sos/:id/confirm', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  const sos = db.prepare(`SELECT * FROM sos_events WHERE id = ? AND user_id = ?`).get(id, user.id) as any;
  if (!sos) {
    res.status(404).json({ error: { code: 'SOS_NOT_FOUND', message: 'SOS event not found' } });
    return;
  }

  db.prepare(`UPDATE sos_events SET status = 'escalated' WHERE id = ?`).run(id);

  const incidentId = await createEmergencyIncident({
    userId: user.id,
    journeyId: sos.journey_id,
    sosId: id,
    trigger: sos.trigger,
    discreet: Boolean(sos.discreet),
    duress: false,
    lat: sos.lat,
    lng: sos.lng,
    acc: sos.acc,
  });

  res.json({ success: true, incidentId });
});

sosRouter.get('/incidents/:id', requireAuth, (req: AuthRequest, res: Response) => {
  const incident = db.prepare(`
    SELECT * FROM incidents WHERE id = ? AND user_id = ?
  `).get(req.params.id, req.user!.id) as IncidentRow | undefined;

  if (!incident) {
    res.status(404).json({ error: { code: 'INCIDENT_NOT_FOUND', message: 'Incident not found' } });
    return;
  }

  const notifications = db.prepare(`
    SELECT * FROM notifications WHERE incident_id = ?
  `).all(incident.id);

  res.json({ incident, notifications });
});

sosRouter.post(
  '/incidents/:id/resolve',
  requireAuth,
  validateBody(resolveIncidentSchema),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { pin, falseAlarm } = req.body;
    const user = req.user!;

    // Must verify safety PIN to resolve
    if (user.safety_pin_hash) {
      const valid = await bcrypt.compare(pin, user.safety_pin_hash);
      if (!valid) {
        res.status(401).json({ error: { code: 'INVALID_PIN', message: 'Invalid safety PIN' } });
        return;
      }
    }

    const nowIso = new Date().toISOString();
    const finalStatus = falseAlarm ? 'false_alarm' : 'resolved';

    db.prepare(`
      UPDATE incidents SET status = ?, resolved_at = ? WHERE id = ? AND user_id = ?
    `).run(finalStatus, nowIso, id, user.id);

    if (falseAlarm) {
      db.prepare(`
        UPDATE users SET false_alarm_count = false_alarm_count + 1 WHERE id = ?
      `).run(user.id);
    }

    // Update notifications
    db.prepare(`
      UPDATE notifications SET status = 'acknowledged', acknowledged_at = ? WHERE incident_id = ?
    `).run(nowIso, id);

    emitToRoom(`incident:${id}`, 'incident:resolved', {
      incidentId: id,
      status: finalStatus,
      resolvedAt: nowIso,
    });

    res.json({ success: true, status: finalStatus });
  }
);
