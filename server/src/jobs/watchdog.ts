import { db } from '../db/index.js';
import {
  JourneyRow,
  TIMING_PROFILES,
  TimingProfileKey,
  IncidentRow,
  FakeCallRow,
  SafetyCheckRow,
} from '@raksha/shared';
import { emitToRoom } from '../sockets/index.js';
import { createEmergencyIncident } from '../engine/emergency.js';
import { sendWebPush } from '../services/push.js';

export async function runWatchdogTick(): Promise<void> {
  const now = new Date();
  const nowIso = now.toISOString();
  const nowMs = now.getTime();

  // 1. SOS Cancellation Window Expiry -> Auto Escalate
  const pendingSosList = await db.prepare(`
    SELECT * FROM sos_events
    WHERE status = 'pending' AND datetime(cancel_until) <= datetime(?)
  `).all<{
    id: string;
    user_id: string;
    journey_id: string | null;
    trigger: string;
    discreet: number;
    lat: number;
    lng: number;
    acc: number;
  }>(nowIso);

  for (const sos of pendingSosList) {
    await db.prepare(`UPDATE sos_events SET status = 'escalated' WHERE id = ?`).run(sos.id);

    // Create incident
    createEmergencyIncident({
      userId: sos.user_id,
      journeyId: sos.journey_id,
      sosId: sos.id,
      trigger: sos.trigger,
      discreet: Boolean(sos.discreet),
      duress: false,
      lat: sos.lat,
      lng: sos.lng,
      acc: sos.acc,
    }).catch((err) => console.error('Error auto-escalating SOS:', err));
  }

  // 2. Active Journeys Watchdog: Heartbeat / Connectivity Loss & ETA
  const activeJourneys = await db.prepare(`
    SELECT * FROM journeys WHERE status = 'active'
  `).all<JourneyRow>();

  for (const journey of activeJourneys) {
    const profileKey = (journey.timing_profile as TimingProfileKey) || 'production';
    const profile = TIMING_PROFILES[profileKey] || TIMING_PROFILES.production;

    // Check last seen heartbeat
    if (journey.last_seen_ts) {
      const lastSeenMs = new Date(journey.last_seen_ts).getTime();
      const elapsed = nowMs - lastSeenMs;

      if (elapsed > profile.connectivityLost && journey.online === 1) {
        // Mark offline
        await db.prepare(`UPDATE journeys SET online = 0 WHERE id = ?`).run(journey.id);

        emitToRoom(`journey:${journey.id}`, 'journey:update', {
          journeyId: journey.id,
          online: false,
          lastSeenTs: journey.last_seen_ts,
          notice: 'Connection lost. Last known location preserved.',
        });
      }
    }

    // Safety Checks Timeouts -> Escalate
    const pendingChecks = await db.prepare(`
      SELECT * FROM safety_checks
      WHERE journey_id = ? AND responded_at IS NULL AND datetime(due_at) <= datetime(?)
    `).all<SafetyCheckRow>(journey.id, nowIso);

    for (const check of pendingChecks) {
      await db.prepare(`
        UPDATE safety_checks SET responded_at = ?, response = NULL WHERE id = ?
      `).run(nowIso, check.id);

      // Missed safety check -> auto-escalate journey to emergency
      console.log(`[Watchdog] Safety check ${check.id} timed out for journey ${journey.id}. Escalating.`);

      createEmergencyIncident({
        userId: journey.user_id,
        journeyId: journey.id,
        trigger: 'auto_escalation',
        discreet: false,
        lat: journey.last_lat || 28.6139,
        lng: journey.last_lng || 77.2090,
        acc: journey.last_acc || 15,
      }).catch((err) => console.error('Error escalating missed safety check:', err));
    }
  }

  // 3. Guardian Acknowledgment Timeout on Incidents
  const unacknowledgedIncidents = await db.prepare(`
    SELECT * FROM incidents
    WHERE status = 'open' AND guardian_ack_deadline IS NOT NULL AND datetime(guardian_ack_deadline) <= datetime(?)
  `).all<IncidentRow>(nowIso);

  for (const inc of unacknowledgedIncidents) {
    await db.prepare(`
      UPDATE incidents SET guardian_ack_deadline = NULL WHERE id = ?
    `).run(inc.id);

    // Re-notify all guardians & flag Unacknowledged
    emitToRoom(`incident:${inc.id}`, 'incident:update', {
      incidentId: inc.id,
      unacknowledgedFlag: true,
      notice: 'Guardian acknowledgment deadline elapsed. Re-notifying emergency contacts.',
    });
  }

  // 4. Scheduled Fake Calls Scheduler
  const dueFakeCalls = await db.prepare(`
    SELECT * FROM fake_calls
    WHERE status = 'armed' AND datetime(scheduled_for) <= datetime(?)
  `).all<FakeCallRow>(nowIso);

  for (const fc of dueFakeCalls) {
    await db.prepare(`UPDATE fake_calls SET status = 'ringing' WHERE id = ?`).run(fc.id);

    // Broadcast trigger over socket
    emitToRoom(`user:${fc.user_id}`, 'fake-call:incoming', {
      id: fc.id,
      callerName: fc.caller_name,
      callerNumber: fc.caller_number,
      avatarColor: fc.avatar_color,
      ringtone: fc.ringtone,
      uiStyle: fc.ui_style,
      scriptJson: fc.script_json,
      ringSeconds: fc.ring_seconds,
    });

    // Send Web Push notification
    sendWebPush('user', fc.user_id, {
      title: `Incoming call — ${fc.caller_name}`,
      body: fc.caller_number,
      tag: `fake-call-${fc.id}`,
      requireInteraction: true,
      vibrate: [900, 700, 900, 700],
      actions: [
        { action: 'answer', title: 'Answer' },
        { action: 'decline', title: 'Decline' },
      ],
      data: { url: `/app/fake-call/incoming/${fc.id}` },
    }).catch(() => {});
  }
}

let intervalTimer: NodeJS.Timeout | null = null;

export function startWatchdog(): void {
  if (intervalTimer) return;
  intervalTimer = setInterval(runWatchdogTick, 5000);
  console.log('Watchdog service started (5-second tick).');
}

export function stopWatchdog(): void {
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
  }
}
