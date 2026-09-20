import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { runMigrations } from '../db/migrations.js';
import { config } from '../config.js';
import { SeededPRNG } from './prng.js';
import { toRadians } from '../db/geo.js';

export async function seedDatabase(
  centerLat = config.DEMO_CENTER_LAT,
  centerLng = config.DEMO_CENTER_LNG,
  seed = 42
) {
  runMigrations();

  const prng = new SeededPRNG(seed);
  console.log(`Seeding database around [${centerLat}, ${centerLng}] (seed=${seed})...`);

  // Clear demo data
  db.prepare(`DELETE FROM risk_zones WHERE is_demo = 1`).run();
  db.prepare(`DELETE FROM lighting_zones`).run();
  db.prepare(`DELETE FROM activity_zones`).run();
  db.prepare(`DELETE FROM facilities WHERE is_demo = 1`).run();
  db.prepare(`DELETE FROM reports WHERE is_demo = 1`).run();
  db.prepare(`DELETE FROM report_votes`).run();
  db.prepare(`DELETE FROM users WHERE username = 'demo'`).run();

  // Helper to offset lat/lng by dx/dy meters
  function offsetCoord(lat: number, lng: number, dxMeters: number, dyMeters: number) {
    const dLat = dyMeters / 111320;
    const dLng = dxMeters / (111320 * Math.cos(toRadians(lat)));
    return { lat: Number((lat + dLat).toFixed(6)), lng: Number((lng + dLng).toFixed(6)) };
  }

  // 1. Incident Zones (45 zones over 6 hotspot clusters within 6 km)
  const clusterCenters = [
    offsetCoord(centerLat, centerLng, 800, 1200),
    offsetCoord(centerLat, centerLng, -1400, 900),
    offsetCoord(centerLat, centerLng, 1800, -1100),
    offsetCoord(centerLat, centerLng, -900, -1600),
    offsetCoord(centerLat, centerLng, 2500, 2100),
    offsetCoord(centerLat, centerLng, -2800, -2200),
  ];

  const categories = ['theft', 'harassment', 'assault', 'accident', 'suspicious'];
  const insertRiskZone = db.prepare(`
    INSERT INTO risk_zones (id, lat, lng, radius_m, severity, category, occurred_at, is_demo)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);

  let zoneCount = 0;
  for (let c = 0; c < clusterCenters.length; c++) {
    const cluster = clusterCenters[c];
    const clusterCount = c < 3 ? 8 : 7; // total 45
    for (let i = 0; i < clusterCount; i++) {
      const dx = prng.nextFloat(-450, 450);
      const dy = prng.nextFloat(-450, 450);
      const pt = offsetCoord(cluster.lat, cluster.lng, dx, dy);
      const radius = prng.nextInt(150, 350);
      const severity = prng.nextInt(2, 5);
      const cat = prng.pick(categories);
      const daysAgo = prng.nextInt(1, 180);
      const occurredAt = new Date(Date.now() - daysAgo * 86400000).toISOString();

      insertRiskZone.run(`rz_${nanoid(8)}`, pt.lat, pt.lng, radius, severity, cat, occurredAt);
      zoneCount++;
    }
  }

  // 2. Lighting Zones (30 circles, level 0.1-0.95, ~35% below 0.4)
  const insertLighting = db.prepare(`
    INSERT INTO lighting_zones (id, lat, lng, radius_m, level)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < 30; i++) {
    const dist = prng.nextFloat(200, 4500);
    const angle = prng.nextFloat(0, Math.PI * 2);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const pt = offsetCoord(centerLat, centerLng, dx, dy);
    const radius = prng.nextInt(150, 400);

    // ~35% poorly lit
    const level = i < 11 ? prng.nextFloat(0.1, 0.38) : prng.nextFloat(0.6, 0.95);
    insertLighting.run(`lz_${nanoid(8)}`, pt.lat, pt.lng, radius, Number(level.toFixed(2)));
  }

  // 3. Activity Zones (24 circles, level 0.1-0.95: busy vs isolated)
  const insertActivity = db.prepare(`
    INSERT INTO activity_zones (id, lat, lng, radius_m, level)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < 24; i++) {
    const dist = prng.nextFloat(300, 5000);
    const angle = prng.nextFloat(0, Math.PI * 2);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const pt = offsetCoord(centerLat, centerLng, dx, dy);
    const radius = prng.nextInt(200, 500);
    const level = i < 8 ? prng.nextFloat(0.15, 0.35) : prng.nextFloat(0.65, 0.95);
    insertActivity.run(`az_${nanoid(8)}`, pt.lat, pt.lng, radius, Number(level.toFixed(2)));
  }

  // 4. Facilities (>= 6 police, >= 6 hospitals, >= 10 safe places)
  const insertFacility = db.prepare(`
    INSERT INTO facilities (id, type, name, lat, lng, phone, is_24x7, is_demo, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'seed')
  `);

  const compass = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const pPt = offsetCoord(centerLat, centerLng, Math.cos(angle) * 2200, Math.sin(angle) * 2200);
    insertFacility.run(
      `fac_pol_${i}`,
      'police',
      `Demo Police Station – ${compass[i]}`,
      pPt.lat,
      pPt.lng,
      '112',
      1
    );

    const hPt = offsetCoord(centerLat, centerLng, Math.cos(angle + 0.3) * 2800, Math.sin(angle + 0.3) * 2800);
    insertFacility.run(
      `fac_hosp_${i}`,
      'hospital',
      `Demo Hospital – ${compass[i]}`,
      hPt.lat,
      hPt.lng,
      '108',
      1
    );
  }

  // Safe places (12 places: 4 24x7 pharmacies, 4 fuel stations, 4 metro stations)
  const safePlaceDefs = [
    { type: 'safe_place', name: 'Demo 24x7 Apollo Pharmacy', phone: '+91 11 2345 6789' },
    { type: 'safe_place', name: 'Demo 24x7 MedPlus Pharmacy', phone: '+91 11 2345 6790' },
    { type: 'safe_place', name: 'Demo 24x7 Guardian Care Pharmacy', phone: '+91 11 2345 6791' },
    { type: 'safe_place', name: 'Demo 24x7 Wellness Forever', phone: '+91 11 2345 6792' },
    { type: 'safe_place', name: 'Demo IndianOil 24x7 Fuel & Convenience', phone: '+91 11 2345 6793' },
    { type: 'safe_place', name: 'Demo HP Petrol Pump 24x7', phone: '+91 11 2345 6794' },
    { type: 'safe_place', name: 'Demo Bharat Petroleum Safe Hub', phone: '+91 11 2345 6795' },
    { type: 'safe_place', name: 'Demo Shell 24x7 Safe Haven', phone: '+91 11 2345 6796' },
    { type: 'safe_place', name: 'Demo Central Metro Station (Security Post)', phone: '112' },
    { type: 'safe_place', name: 'Demo East Gate Metro Station CISF Booth', phone: '112' },
    { type: 'safe_place', name: 'Demo Transit Interchange Help Desk', phone: '112' },
    { type: 'safe_place', name: 'Demo South Interchange Police Post', phone: '112' },
  ];

  for (let i = 0; i < safePlaceDefs.length; i++) {
    const angle = prng.nextFloat(0, Math.PI * 2);
    const dist = prng.nextFloat(400, 3200);
    const pt = offsetCoord(centerLat, centerLng, Math.cos(angle) * dist, Math.sin(angle) * dist);
    insertFacility.run(
      `fac_safe_${i}`,
      safePlaceDefs[i].type,
      safePlaceDefs[i].name,
      pt.lat,
      pt.lng,
      safePlaceDefs[i].phone,
      1
    );
  }

  // 5. Community Reports (18 reports: 6 unverified, 6 likely, 6 verified)
  const insertReport = db.prepare(`
    INSERT INTO reports (
      id, reporter_hash, category, severity, text, lat, lng,
      created_at, expires_at, confirmations, denials, flags, confidence, status, is_demo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const demoReportsData = [
    // 6 Verified (high confidence >= 0.65)
    { cat: 'lighting', sev: 4, text: 'Streetlights out for ~300m stretch past the underpass. Very dark after 8 PM.', conf: 0.82, st: 'verified', c: 4, d: 0, f: 0 },
    { cat: 'hazard', sev: 3, text: 'Open manhole near the sidewalk corner with only a broken branch as marker.', conf: 0.78, st: 'verified', c: 3, d: 0, f: 0 },
    { cat: 'unsafe_road', sev: 4, text: 'Road construction blocked pedestrian path, forcing pedestrians onto fast road.', conf: 0.72, st: 'verified', c: 3, d: 0, f: 0 },
    { cat: 'suspicious', sev: 4, text: 'Group of men loitering near the abandoned bus shelter, passing comments.', conf: 0.70, st: 'verified', c: 3, d: 1, f: 0 },
    { cat: 'harassment', sev: 5, text: 'Persistent catcalling and aggressive following reported along the service lane.', conf: 0.88, st: 'verified', c: 5, d: 0, f: 0 },
    { cat: 'accident', sev: 3, text: 'Two-wheeler skid due to fresh gravel spill on the turn.', conf: 0.68, st: 'verified', c: 2, d: 0, f: 0 },

    // 6 Likely (0.35 <= conf < 0.65)
    { cat: 'lighting', sev: 3, text: 'Flickering streetlights creating blind spots along park boundary.', conf: 0.54, st: 'likely', c: 2, d: 0, f: 0 },
    { cat: 'crowd', sev: 3, text: 'Heavy bottle-neck crowd near metro feeder exit, limited visibility.', conf: 0.48, st: 'likely', c: 1, d: 0, f: 0 },
    { cat: 'unsafe_road', sev: 3, text: 'Waterlogging over sidewalk after rain, walking space obstructed.', conf: 0.52, st: 'likely', c: 2, d: 0, f: 0 },
    { cat: 'suspicious', sev: 3, text: 'Poorly lit parking lot with broken CCTV cameras.', conf: 0.44, st: 'likely', c: 1, d: 0, f: 0 },
    { cat: 'other', sev: 2, text: 'Stray dog pack active near the garbage enclosure at night.', conf: 0.42, st: 'likely', c: 1, d: 0, f: 0 },
    { cat: 'hazard', sev: 3, text: 'Low-hanging electrical cable near the bus stop.', conf: 0.58, st: 'likely', c: 2, d: 0, f: 0 },

    // 6 Unverified (conf < 0.35)
    { cat: 'lighting', sev: 2, text: 'Dim lighting reported along residential lane.', conf: 0.28, st: 'unverified', c: 0, d: 0, f: 0 },
    { cat: 'suspicious', sev: 3, text: 'Saw a parked car with tinted windows idle for hours.', conf: 0.25, st: 'unverified', c: 0, d: 0, f: 0 },
    { cat: 'hazard', sev: 2, text: 'Loose paving stones causing tripping hazard.', conf: 0.30, st: 'unverified', c: 0, d: 0, f: 0 },
    { cat: 'crowd', sev: 2, text: 'Temporary market stall setup narrowing the walkway.', conf: 0.22, st: 'unverified', c: 0, d: 0, f: 0 },
    { cat: 'unsafe_road', sev: 3, text: 'Speeding vehicles ignoring pedestrian crossing sign.', conf: 0.32, st: 'unverified', c: 0, d: 0, f: 0 },
    { cat: 'other', sev: 2, text: 'Construction dust reducing evening visibility.', conf: 0.25, st: 'unverified', c: 0, d: 0, f: 0 },
  ];

  for (let i = 0; i < demoReportsData.length; i++) {
    const item = demoReportsData[i];
    const dist = prng.nextFloat(300, 3800);
    const angle = prng.nextFloat(0, Math.PI * 2);
    const pt = offsetCoord(centerLat, centerLng, Math.cos(angle) * dist, Math.sin(angle) * dist);
    const createdAt = new Date(Date.now() - prng.nextInt(2, 48) * 3600000).toISOString();
    const expiresAt = new Date(Date.now() + 14 * 86400000).toISOString();

    insertReport.run(
      `rep_${nanoid(8)}`,
      `hash_${nanoid(12)}`,
      item.cat,
      item.sev,
      item.text,
      pt.lat,
      pt.lng,
      createdAt,
      expiresAt,
      item.c,
      item.d,
      item.f,
      item.conf,
      item.st
    );
  }

  // 6. Demo User & Guardians & Past Journeys
  const passwordHash = await bcrypt.hash('Demo@12345', 10);
  const safetyPinHash = await bcrypt.hash('1234', 10);
  const duressPinHash = await bcrypt.hash('4321', 10);
  const demoUserId = 'usr_demo_raksha_user';
  const nowIso = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (
      id, username, display_name, password_hash,
      safety_pin_hash, duress_pin_hash, age_confirmed_at,
      settings_json, false_alarm_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    demoUserId,
    'demo',
    'Priya Sharma',
    passwordHash,
    safetyPinHash,
    duressPinHash,
    nowIso,
    JSON.stringify({
      sosActivationStyle: 'hold',
      discreetDefault: false,
      shakeEnabled: true,
      voiceEnabled: false,
      timingProfile: 'demo',
      theme: 'auto',
      textSize: 'normal',
    }),
    nowIso
  );

  // Consents for Demo User
  const insertConsent = db.prepare(`
    INSERT INTO consents (id, user_id, type, granted, policy_version, created_at)
    VALUES (?, ?, ?, ?, '1.0', ?)
  `);
  insertConsent.run(`c_${nanoid(6)}`, demoUserId, 'terms_privacy', 1, nowIso);
  insertConsent.run(`c_${nanoid(6)}`, demoUserId, 'location', 1, nowIso);
  insertConsent.run(`c_${nanoid(6)}`, demoUserId, 'guardian_share', 1, nowIso);
  insertConsent.run(`c_${nanoid(6)}`, demoUserId, 'push', 1, nowIso);
  insertConsent.run(`c_${nanoid(6)}`, demoUserId, 'motion', 1, nowIso);

  // Guardians
  const insertGuardian = db.prepare(`
    INSERT INTO guardians (id, user_id, name, phone, relation, priority, status, token, told_confirmed, last_viewed_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const momToken = 'guardian_demo_mom_tok';
  const friendToken = 'guardian_demo_friend_tok';

  insertGuardian.run(
    'g_demo_mom',
    demoUserId,
    'Demo Guardian – Mom',
    '+91 98765 43210',
    'Mother',
    1,
    'accepted',
    momToken,
    nowIso,
    nowIso
  );

  insertGuardian.run(
    'g_demo_friend',
    demoUserId,
    'Demo Guardian – Friend',
    '+91 98765 43211',
    'Roommate',
    2,
    'accepted',
    friendToken,
    nowIso,
    nowIso
  );

  // Past Completed Journeys
  const insertJourney = db.prepare(`
    INSERT INTO journeys (
      id, user_id, status, mode, origin_json, dest_json, route_json,
      planned_eta_ts, started_at, ended_at, timing_profile, simulated,
      level, risk_score, risk_explain_json, cab_json, guardian_ids_json,
      last_seen_ts, last_lat, last_lng, last_acc, battery, online, share_expires_at
    ) VALUES (?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, 'demo', 1, 0, 12, '[]', ?, ?, ?, ?, ?, 8, 85, 1, ?)
  `);

  for (let j = 1; j <= 3; j++) {
    const jId = `journey_past_${j}`;
    const startTime = new Date(Date.now() - (j * 24 + 2) * 3600000).toISOString();
    const endTime = new Date(Date.now() - (j * 24) * 3600000).toISOString();
    const orig = offsetCoord(centerLat, centerLng, -800 * j, 400 * j);
    const dest = offsetCoord(centerLat, centerLng, 600 * j, -300 * j);

    // Realistic polyline coordinates [lng, lat]
    const routeCoords: [number, number][] = [
      [orig.lng, orig.lat],
      [orig.lng + (dest.lng - orig.lng) * 0.3, orig.lat + (dest.lat - orig.lat) * 0.35],
      [orig.lng + (dest.lng - orig.lng) * 0.7, orig.lat + (dest.lat - orig.lat) * 0.65],
      [dest.lng, dest.lat],
    ];

    insertJourney.run(
      jId,
      demoUserId,
      'walk',
      JSON.stringify({ label: `Origin Point ${j}`, lat: orig.lat, lng: orig.lng }),
      JSON.stringify({ label: `Destination Point ${j}`, lat: dest.lat, lng: dest.lng }),
      JSON.stringify({
        type: 'LineString',
        coordinates: routeCoords,
        distanceM: 1800,
        durationS: 1200,
        safetyScore: 88,
      }),
      endTime,
      startTime,
      endTime,
      JSON.stringify({ vehicleNumber: 'DL-01-AB-1234', driverName: 'Ramesh', company: 'Uber' }),
      JSON.stringify(['g_demo_mom']),
      endTime,
      dest.lat,
      dest.lng,
      new Date(Date.now() + 86400000).toISOString()
    );

    // Event
    db.prepare(`
      INSERT INTO journey_events (id, journey_id, ts, type, payload_json)
      VALUES (?, ?, ?, 'arrived_safe', '{}')
    `).run(`evt_${nanoid(8)}`, jId, endTime);
  }

  // 1 Scheduled Fake Call
  const scheduledTime = new Date(Date.now() + 15 * 60000).toISOString();
  db.prepare(`
    INSERT INTO fake_calls (
      id, user_id, caller_name, caller_number, avatar_color,
      ringtone, ui_style, script_json, use_recording,
      scheduled_for, ring_seconds, notify_guardian, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 30, 0, 'scheduled', ?)
  `).run(
    'fc_demo_initial',
    demoUserId,
    'Mom',
    '+91 98765 43210',
    '#4338CA',
    'classic',
    'classic',
    JSON.stringify([
      { line: 'Beta, where have you reached? It is getting late.', pauseSeconds: 3 },
      { line: 'I am waiting by the gate. Should your brother come pick you up?', pauseSeconds: 3 },
      { line: 'Okay, keep your phone in hand and hurry home safely.', pauseSeconds: 2 }
    ]),
    scheduledTime,
    nowIso
  );

  // Save config coordinates
  db.prepare(`INSERT OR REPLACE INTO app_config (key, value) VALUES ('demo_center_lat', ?)`).run(centerLat.toString());
  db.prepare(`INSERT OR REPLACE INTO app_config (key, value) VALUES ('demo_center_lng', ?)`).run(centerLng.toString());
  db.prepare(`INSERT OR REPLACE INTO app_config (key, value) VALUES ('timing_profile_default', 'demo')`).run();

  console.log('Seeding completed successfully:');
  console.log(`- ${zoneCount} Incident Zones across 6 clusters`);
  console.log(`- 30 Lighting Zones (~35% low lighting)`);
  console.log(`- 24 Activity Zones`);
  console.log(`- 16 Emergency Facilities (8 Police, 8 Hospital, 12 Safe Places)`);
  console.log(`- 18 Community Reports`);
  console.log(`- Demo user 'demo' with Mom and Friend guardians, 3 past journeys, 1 scheduled call`);
}

// Direct execution support
if (process.argv[1]?.endsWith('generate.ts') || process.argv[1]?.endsWith('generate.js')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
