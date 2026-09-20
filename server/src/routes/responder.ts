import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { config } from '../config.js';
import { requireResponderAuth, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { responderLoginSchema, responderDispatchSchema, IncidentRow, FacilityRow } from '@raksha/shared';
import { emitToRoom } from '../sockets/index.js';
import { acknowledgeIncident } from '../engine/emergency.js';

export const responderRouter = Router();

responderRouter.post('/responder/login', validateBody(responderLoginSchema), (req: Request, res: Response) => {
  const { facilityId, key } = req.body;

  if (key !== config.DEMO_RESPONDER_KEY) {
    res.status(403).json({ error: { code: 'INVALID_PASSCODE', message: 'Invalid responder passcode' } });
    return;
  }

  const facility = db.prepare(`SELECT * FROM facilities WHERE id = ?`).get(facilityId) as FacilityRow | undefined;
  if (!facility && facilityId !== 'all') {
    res.status(404).json({ error: { code: 'FACILITY_NOT_FOUND', message: 'Facility not found' } });
    return;
  }

  res.cookie('raksha_responder', `${facilityId}:${key}`, {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  });

  res.json({
    success: true,
    facility: facility || { id: 'all', name: 'Combined Emergency Control Room', type: 'police' },
  });
});

responderRouter.get('/responder/incidents', requireResponderAuth, (req: AuthRequest, res: Response) => {
  const facilityId = req.responderFacilityId!;

  let incidents: IncidentRow[] = [];
  if (facilityId === 'all') {
    incidents = db.prepare(`
      SELECT * FROM incidents WHERE status IN ('open', 'acknowledged') ORDER BY created_at DESC
    `).all() as IncidentRow[];
  } else {
    // Get incidents notifying this facility
    incidents = db.prepare(`
      SELECT i.* FROM incidents i
      JOIN notifications n ON n.incident_id = i.id
      WHERE n.recipient_id = ? AND i.status IN ('open', 'acknowledged')
      ORDER BY i.created_at DESC
    `).all(facilityId) as IncidentRow[];
  }

  const enriched = incidents.map((inc) => {
    let packet = {};
    try {
      packet = JSON.parse(inc.packet_json);
    } catch {}

    const notifications = db.prepare(`SELECT * FROM notifications WHERE incident_id = ?`).all(inc.id);
    return {
      ...inc,
      packet,
      notifications,
    };
  });

  res.json({ incidents: enriched });
});

responderRouter.post('/responder/incidents/:id/ack', requireResponderAuth, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const facilityId = req.responderFacilityId!;

  acknowledgeIncident(id, 'police', facilityId);
  res.json({ success: true, message: 'Incident acknowledged by responder.' });
});

responderRouter.post(
  '/responder/incidents/:id/dispatch',
  requireResponderAuth,
  validateBody(responderDispatchSchema),
  (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { etaMinutes } = req.body;
    const facilityId = req.responderFacilityId!;
    const nowIso = new Date().toISOString();

    const incident = db.prepare(`SELECT * FROM incidents WHERE id = ?`).get(id) as IncidentRow | undefined;
    if (!incident) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Incident not found' } });
      return;
    }

    const facility = db.prepare(`SELECT name FROM facilities WHERE id = ?`).get(facilityId) as { name: string } | undefined;
    const facilityName = facility?.name || 'Emergency Unit';

    if (incident.journey_id) {
      db.prepare(`
        INSERT INTO journey_events (id, journey_id, ts, type, payload_json)
        VALUES (?, ?, ?, 'responder_dispatched', ?)
      `).run(`evt_${id}_dispatch`, incident.journey_id, nowIso, JSON.stringify({ facilityName, etaMinutes }));

      emitToRoom(`journey:${incident.journey_id}`, 'journey:event', {
        type: 'responder_dispatched',
        title: 'Emergency Unit Dispatched',
        message: `${facilityName} dispatched unit. Estimated arrival: ~${etaMinutes} mins.`,
      });
    }

    emitToRoom(`incident:${id}`, 'incident:update', {
      incidentId: id,
      dispatch: { facilityName, etaMinutes, dispatchedAt: nowIso },
    });

    res.json({ success: true, etaMinutes });
  }
);

responderRouter.post('/responder/incidents/:id/resolve', requireResponderAuth, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const nowIso = new Date().toISOString();

  db.prepare(`UPDATE incidents SET status = 'resolved', resolved_at = ? WHERE id = ?`).run(nowIso, id);
  db.prepare(`UPDATE notifications SET status = 'acknowledged', acknowledged_at = ? WHERE incident_id = ?`).run(nowIso, id);

  emitToRoom(`incident:${id}`, 'incident:resolved', {
    incidentId: id,
    status: 'resolved',
    resolvedBy: 'responder',
    resolvedAt: nowIso,
  });

  res.json({ success: true });
});

responderRouter.post('/responder/incidents/:id/false-alarm', requireResponderAuth, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const nowIso = new Date().toISOString();

  const incident = db.prepare(`SELECT user_id FROM incidents WHERE id = ?`).get(id) as { user_id: string } | undefined;
  if (incident) {
    db.prepare(`UPDATE users SET false_alarm_count = false_alarm_count + 1 WHERE id = ?`).run(incident.user_id);
  }

  db.prepare(`UPDATE incidents SET status = 'false_alarm', resolved_at = ? WHERE id = ?`).run(nowIso, id);

  emitToRoom(`incident:${id}`, 'incident:resolved', {
    incidentId: id,
    status: 'false_alarm',
    resolvedBy: 'responder',
    resolvedAt: nowIso,
  });

  res.json({ success: true });
});
