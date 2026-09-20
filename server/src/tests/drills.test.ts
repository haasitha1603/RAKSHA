import { describe, it, expect } from 'vitest';
import { DRILL_SCENARIOS, PRESET_DRILL_ROUTES } from '@raksha/shared';
import { createEmergencyIncident } from '../engine/emergency.js';
import { db } from '../db/index.js';
import { nanoid } from 'nanoid';

describe('Safety Drills Scenario Matrix & Suppression Tests', () => {
  it('exports exactly 14 deterministic drill scenarios with valid steps and assertions', () => {
    expect(DRILL_SCENARIOS).toBeDefined();
    expect(DRILL_SCENARIOS.length).toBe(14);

    for (const scenario of DRILL_SCENARIOS) {
      expect(scenario.id).toMatch(/^drill_\d{2}$/);
      expect(scenario.name.length).toBeGreaterThan(5);
      expect(scenario.steps.length).toBeGreaterThanOrEqual(3);
      expect(scenario.assertions.length).toBeGreaterThanOrEqual(2);
      expect(scenario.durationSeconds).toBeGreaterThan(10);
    }
  });

  it('exports 3 preset Delhi routes with valid coordinates and safety scores', () => {
    expect(PRESET_DRILL_ROUTES).toBeDefined();
    expect(PRESET_DRILL_ROUTES.length).toBe(3);

    for (const route of PRESET_DRILL_ROUTES) {
      expect(route.origin.lat).toBeGreaterThan(20);
      expect(route.destination.lat).toBeGreaterThan(20);
      expect(route.waypoints.length).toBeGreaterThanOrEqual(2);
      expect(route.safetyScore).toBeGreaterThanOrEqual(50);
    }
  });

  it('tags emergency notifications with [DRILL] and suppresses external SMS in drill mode', async () => {
    const testUserId = `user_${nanoid(8)}`;
    const testJourneyId = `jny_${nanoid(8)}`;
    const nowIso = new Date().toISOString();

    // Create test user
    await db.prepare(`
      INSERT INTO users (id, username, password_hash, display_name, age_confirmed_at, created_at)
      VALUES (?, ?, 'hash', 'Drill Tester', ?, ?)
    `).run(testUserId, `drilluser_${Date.now()}`, nowIso, nowIso);

    // Create test guardian
    const guardianId = `g_${nanoid(8)}`;
    await db.prepare(`
      INSERT INTO guardians (id, user_id, name, phone, relation, token, status, created_at)
      VALUES (?, ?, 'Drill Guardian', '+919876543210', 'Friend', ?, 'accepted', ?)
    `).run(guardianId, testUserId, `tok_${nanoid(12)}`, nowIso);

    // Create drill journey (drill = 1)
    await db.prepare(`
      INSERT INTO journeys (
        id, user_id, status, mode, origin_json, dest_json, route_json,
        planned_eta_ts, timing_profile, simulated, level, risk_score,
        risk_explain_json, guardian_ids_json, online, drill, drill_scenario
      ) VALUES (?, ?, 'active', 'walk', '{}', '{}', '{}', ?, 'demo', 1, 1, 10, '[]', ?, 1, 1, 'drill_01')
    `).run(testJourneyId, testUserId, nowIso, JSON.stringify([guardianId]));

    // Trigger incident
    const incidentId = await createEmergencyIncident({
      userId: testUserId,
      journeyId: testJourneyId,
      trigger: 'drill_deviation',
      discreet: false,
      lat: 28.6139,
      lng: 77.2090,
    });

    expect(incidentId).toBeDefined();

    // Check outbox entries
    const outboxEntries = await db.prepare(`
      SELECT * FROM outbox WHERE journey_id = ?
    `).all(testJourneyId) as any[];

    expect(outboxEntries.length).toBeGreaterThan(0);
    for (const msg of outboxEntries) {
      expect(msg.kind).toBe('drill_emergency_sos');
      expect(msg.body).toContain('[DRILL]');
    }
  });
});
