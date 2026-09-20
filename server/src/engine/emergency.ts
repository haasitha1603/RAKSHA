import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { haversineDistance } from '../db/geo.js';
import {
  EmergencyContextPacket,
  LocationConfidence,
  FacilityRow,
  GuardianRow,
  UserRow,
  JourneyRow,
  JourneyPointRow,
  TIMING_PROFILES,
  TimingProfileKey,
} from '@raksha/shared';
import { emitToRoom } from '../sockets/index.js';
import { smsProvider } from '../services/sms.js';
import { sendWebPush } from '../services/push.js';

export interface CreateIncidentParams {
  userId: string;
  journeyId?: string | null;
  sosId?: string | null;
  trigger: string;
  discreet: boolean;
  duress?: boolean;
  lat: number;
  lng: number;
  acc?: number;
}

export async function findNearestFacility(
  type: 'police' | 'hospital',
  lat: number,
  lng: number
): Promise<{ facility: FacilityRow; distanceKm: number } | null> {
  const radiuses = [3000, 10000, 25000]; // 3km -> 10km -> 25km

  for (const r of radiuses) {
    const facilities = await db.prepare(`
      SELECT * FROM facilities WHERE type = ?
    `).all<FacilityRow>(type);

    const withDist = facilities
      .map((f) => ({
        facility: f,
        distM: haversineDistance(lat, lng, f.lat, f.lng),
      }))
      .filter((f) => f.distM <= r)
      .sort((a, b) => a.distM - b.distM);

    if (withDist.length > 0) {
      return {
        facility: withDist[0].facility,
        distanceKm: Number((withDist[0].distM / 1000).toFixed(1)),
      };
    }
  }

  return null;
}

export async function createEmergencyIncident(params: CreateIncidentParams): Promise<string> {
  const incidentId = `inc_${nanoid(10)}`;
  const nowIso = new Date().toISOString();

  const user = await db.prepare(`SELECT * FROM users WHERE id = ?`).get<UserRow>(params.userId);
  if (!user) {
    throw new Error(`User ${params.userId} not found`);
  }
  const journey = params.journeyId
    ? await db.prepare(`SELECT * FROM journeys WHERE id = ?`).get<JourneyRow>(params.journeyId)
    : undefined;

  const profileKey = ((journey?.timing_profile as TimingProfileKey) || 'demo');
  const profile = TIMING_PROFILES[profileKey] || TIMING_PROFILES.demo;
  const ackDeadline = new Date(Date.now() + profile.guardianAckTimeout).toISOString();

  // 1. Facilities lookup
  const nearestPolice = await findNearestFacility('police', params.lat, params.lng);
  const nearestHospital = await findNearestFacility('hospital', params.lat, params.lng);

  // 2. Guardians lookup
  let guardians: GuardianRow[] = [];
  if (params.journeyId && journey) {
    try {
      const gIds: string[] = JSON.parse(journey.guardian_ids_json);
      if (gIds.length > 0) {
        const placeholders = gIds.map(() => '?').join(',');
        guardians = await db.prepare(`
          SELECT * FROM guardians WHERE id IN (${placeholders}) AND status = 'accepted'
        `).all<GuardianRow>(...gIds);
      }
    } catch {}
  }

  // Fallback to all accepted user guardians if none bound to journey
  if (guardians.length === 0) {
    guardians = await db.prepare(`
      SELECT * FROM guardians WHERE user_id = ? AND status = 'accepted'
    `).all<GuardianRow>(params.userId);
  }

  // 3. Last 5 points & speed
  let last5Points: { lat: number; lng: number; ts: string }[] = [];
  let speedMps = 0;
  let headingDeg = 0;

  if (params.journeyId) {
    const pts = await db.prepare(`
      SELECT lat, lng, ts, speed, heading FROM journey_points
      WHERE journey_id = ? ORDER BY id DESC LIMIT 5
    `).all<JourneyPointRow>(params.journeyId);

    if (pts.length > 0) {
      speedMps = pts[0].speed || 0;
      headingDeg = pts[0].heading || 0;
      last5Points = pts.reverse().map((p) => ({ lat: p.lat, lng: p.lng, ts: p.ts }));
    }
  }

  if (last5Points.length === 0) {
    last5Points.push({ lat: params.lat, lng: params.lng, ts: nowIso });
  }

  // Confidence
  const accuracy = params.acc || 10;
  let confidence: LocationConfidence = 'high';
  if (accuracy > 100) confidence = 'low';
  else if (accuracy > 30) confidence = 'medium';

  // 4. Build EmergencyContextPacket matching §6.7
  const packet: EmergencyContextPacket = {
    incidentId,
    createdAt: nowIso,
    trigger: params.trigger,
    duress: Boolean(params.duress),
    discreet: Boolean(params.discreet),
    person: {
      displayName: user?.display_name || 'Traveller',
      phoneKnown: false,
    },
    location: {
      lat: params.lat,
      lng: params.lng,
      accuracyM: accuracy,
      confidence,
      lastFixAt: nowIso,
      source: 'gps',
    },
    movement: {
      speedMps,
      headingDeg,
      last5Points,
    },
    journey: journey
      ? {
          id: journey.id,
          mode: journey.mode,
          origin: JSON.parse(journey.origin_json || '{}'),
          destination: JSON.parse(journey.dest_json || '{}'),
          plannedEta: journey.planned_eta_ts,
          level: 3,
          riskScore: journey.risk_score || 100,
          riskExplain: JSON.parse(journey.risk_explain_json || '[]').map((e: any) => e.plainText),
        }
      : undefined,
    cab: journey?.cab_json ? JSON.parse(journey.cab_json) : undefined,
    device: {
      battery: journey?.battery ?? null,
      online: Boolean(journey?.online ?? 1),
    },
    recipients: {
      guardians: guardians.map((g) => g.name),
      police: nearestPolice
        ? {
            id: nearestPolice.facility.id,
            name: nearestPolice.facility.name,
            distanceKm: nearestPolice.distanceKm,
            phone: nearestPolice.facility.phone,
          }
        : null,
      hospital: nearestHospital
        ? {
            id: nearestHospital.facility.id,
            name: nearestHospital.facility.name,
            distanceKm: nearestHospital.distanceKm,
            phone: nearestHospital.facility.phone,
          }
        : null,
    },
    safetyCheckHistory: [],
    disclaimer: 'Notice: police/hospital alerts are simulated. In a real emergency call 112.',
  };

  // 5. Insert Incident
  await db.prepare(`
    INSERT INTO incidents (
      id, user_id, journey_id, sos_id, level, status,
      trigger, duress, created_at, packet_json, guardian_ack_deadline
    ) VALUES (?, ?, ?, ?, 3, 'open', ?, ?, ?, ?, ?)
  `).run(
    incidentId,
    params.userId,
    params.journeyId || null,
    params.sosId || null,
    params.trigger,
    params.duress ? 1 : 0,
    nowIso,
    JSON.stringify(packet),
    ackDeadline
  );

  // Update journey status if active
  if (params.journeyId) {
    await db.prepare(`
      UPDATE journeys SET status = 'emergency', level = 3, risk_score = 100 WHERE id = ?
    `).run(params.journeyId);
  }

  // 6. Parallel Notification Engine (§6.11 step 3)
  const notificationPromises: Promise<any>[] = [];

  // Police notification
  if (nearestPolice) {
    const notifId = `notif_pol_${nanoid(8)}`;
    await db.prepare(`
      INSERT INTO notifications (id, incident_id, recipient_type, recipient_id, channel, status, queued_at, sent_at, meta_json)
      VALUES (?, ?, 'police', ?, 'socket', 'sent', ?, ?, ?)
    `).run(
      notifId,
      incidentId,
      nearestPolice.facility.id,
      nowIso,
      new Date(Date.now() + 300).toISOString(),
      JSON.stringify({ facilityName: nearestPolice.facility.name, simulatedLatencyMs: 300 })
    );

    emitToRoom(`responder:${nearestPolice.facility.id}`, 'incident:created', {
      incidentId,
      facilityId: nearestPolice.facility.id,
      packet,
      notificationId: notifId,
    });
    emitToRoom('responder:all', 'incident:created', {
      incidentId,
      facilityId: nearestPolice.facility.id,
      facilityType: 'police',
      packet,
      notificationId: notifId,
    });
  }

  // Hospital notification
  if (nearestHospital) {
    const notifId = `notif_hosp_${nanoid(8)}`;
    await db.prepare(`
      INSERT INTO notifications (id, incident_id, recipient_type, recipient_id, channel, status, queued_at, sent_at, meta_json)
      VALUES (?, ?, 'hospital', ?, 'socket', 'sent', ?, ?, ?)
    `).run(
      notifId,
      incidentId,
      nearestHospital.facility.id,
      nowIso,
      new Date(Date.now() + 450).toISOString(),
      JSON.stringify({ facilityName: nearestHospital.facility.name, simulatedLatencyMs: 450 })
    );

    emitToRoom(`responder:${nearestHospital.facility.id}`, 'incident:created', {
      incidentId,
      facilityId: nearestHospital.facility.id,
      packet,
      notificationId: notifId,
    });
    emitToRoom('responder:all', 'incident:created', {
      incidentId,
      facilityId: nearestHospital.facility.id,
      facilityType: 'hospital',
      packet,
      notificationId: notifId,
    });
  }

  // Guardian notifications (Parallel)
  for (const guardian of guardians) {
    const notifId = `notif_g_${nanoid(8)}`;
    await db.prepare(`
      INSERT INTO notifications (id, incident_id, recipient_type, recipient_id, channel, status, queued_at, sent_at, meta_json)
      VALUES (?, ?, 'guardian', ?, 'sms_mock', 'sent', ?, ?, ?)
    `).run(notifId, incidentId, guardian.id, nowIso, nowIso, JSON.stringify({ phone: guardian.phone }));

    // Send SMS via provider
    const isDrill = Boolean(journey?.drill);
    const trackingLink = `http://localhost:5173/g/${guardian.token}`;
    const smsPrefix = isDrill ? '[DRILL] ' : '';
    const smsBody = `${smsPrefix}[RAKSHA EMERGENCY] Alert from ${user.display_name}! Location: https://maps.google.com/?q=${params.lat},${params.lng}. Track live: ${trackingLink}`;

    notificationPromises.push(
      smsProvider.send({
        toPhone: guardian.phone,
        body: smsBody,
        kind: isDrill ? 'drill_emergency_sos' : 'emergency_sos',
        incidentId,
        journeyId: params.journeyId || undefined,
        isDrill,
      })
    );

    // Send Web Push if subscribed
    notificationPromises.push(
      sendWebPush('guardian', guardian.id, {
        title: `${isDrill ? '[DRILL] ' : ''}🚨 EMERGENCY: ${user.display_name}`,
        body: `Emergency alert triggered (${params.trigger}). Open live coordination bridge.`,
        tag: `emergency-${incidentId}`,
        requireInteraction: true,
        vibrate: [500, 200, 500, 200, 500],
        data: { url: `/g/${guardian.token}` },
      })
    );
  }

  // Wait for parallel outbox / push notifications
  await Promise.allSettled(notificationPromises);

  // 7. Timeline events
  const eventId = `evt_${nanoid(8)}`;
  const eventPayload = {
    trigger: params.trigger,
    duress: params.duress,
    location: { lat: params.lat, lng: params.lng },
    police: nearestPolice?.facility.name || 'None nearby',
    hospital: nearestHospital?.facility.name || 'None nearby',
    guardianCount: guardians.length,
  };

  if (params.journeyId) {
    await db.prepare(`
      INSERT INTO journey_events (id, journey_id, ts, type, payload_json)
      VALUES (?, ?, ?, 'emergency_sos', ?)
    `).run(eventId, params.journeyId, nowIso, JSON.stringify(eventPayload));
  }

  // 8. Broadcast to Sockets
  emitToRoom(`user:${params.userId}`, 'incident:created', {
    incidentId,
    packet,
    duress: params.duress,
    discreet: params.discreet,
  });

  if (params.journeyId) {
    emitToRoom(`journey:${params.journeyId}`, 'incident:created', {
      incidentId,
      packet,
      duress: params.duress,
    });
  }

  return incidentId;
}

export async function acknowledgeIncident(
  incidentId: string,
  recipientType: 'police' | 'hospital' | 'guardian',
  recipientId: string
 ): Promise<void> {
  const nowIso = new Date().toISOString();

  await db.prepare(`
    UPDATE notifications
    SET status = 'acknowledged', acknowledged_at = ?
    WHERE incident_id = ? AND recipient_type = ? AND (recipient_id = ? OR recipient_type IN ('police', 'hospital'))
  `).run(nowIso, incidentId, recipientType, recipientId);

  await db.prepare(`
    UPDATE incidents SET status = 'acknowledged' WHERE id = ? AND status = 'open'
  `).run(incidentId);

  const incident = await db.prepare(`SELECT * FROM incidents WHERE id = ?`).get(incidentId) as any;
  if (!incident) return;

  const notifs = await db.prepare(`SELECT * FROM notifications WHERE incident_id = ?`).all(incidentId);

  emitToRoom(`incident:${incidentId}`, 'incident:update', {
    incidentId,
    status: 'acknowledged',
    notifications: notifs,
  });

  if (incident.journey_id) {
    emitToRoom(`journey:${incident.journey_id}`, 'incident:update', {
      incidentId,
      status: 'acknowledged',
      notifications: notifs,
    });
  }
}
