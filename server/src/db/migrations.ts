import { db } from './index.js';

export function runMigrations(): void {
  console.log('Running database migrations...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      safety_pin_hash TEXT,
      duress_pin_hash TEXT,
      age_confirmed_at TEXT NOT NULL,
      settings_json TEXT NOT NULL DEFAULT '{}',
      false_alarm_count INTEGER DEFAULT 0,
      onboarded_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS consents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      granted INTEGER NOT NULL DEFAULT 0,
      policy_version TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS guardians (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      relation TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'pending',
      token TEXT UNIQUE NOT NULL,
      told_confirmed INTEGER NOT NULL DEFAULT 0,
      last_viewed_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS journeys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'planned',
      mode TEXT NOT NULL DEFAULT 'walk',
      origin_json TEXT NOT NULL,
      dest_json TEXT NOT NULL,
      route_json TEXT NOT NULL,
      planned_eta_ts TEXT NOT NULL,
      started_at TEXT,
      ended_at TEXT,
      timing_profile TEXT NOT NULL DEFAULT 'production',
      simulated INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 0,
      risk_score INTEGER NOT NULL DEFAULT 0,
      risk_explain_json TEXT NOT NULL DEFAULT '[]',
      cab_json TEXT,
      checkpoint_rule_json TEXT,
      guardian_ids_json TEXT NOT NULL DEFAULT '[]',
      last_seen_ts TEXT,
      last_lat REAL,
      last_lng REAL,
      last_acc REAL,
      battery INTEGER,
      online INTEGER NOT NULL DEFAULT 1,
      share_expires_at TEXT,
      drill INTEGER NOT NULL DEFAULT 0,
      drill_scenario TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS journey_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      journey_id TEXT NOT NULL,
      ts TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      acc REAL NOT NULL,
      speed REAL,
      heading REAL,
      battery INTEGER,
      FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS journey_events (
      id TEXT PRIMARY KEY,
      journey_id TEXT NOT NULL,
      ts TEXT NOT NULL,
      type TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS planned_stops (
      id TEXT PRIMARY KEY,
      journey_id TEXT NOT NULL,
      label TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      radius_m INTEGER NOT NULL DEFAULT 100,
      until_ts TEXT NOT NULL,
      FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS safety_checks (
      id TEXT PRIMARY KEY,
      journey_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      due_at TEXT NOT NULL,
      responded_at TEXT,
      response TEXT,
      FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sos_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      journey_id TEXT,
      trigger TEXT NOT NULL,
      discreet INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      cancel_until TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      acc REAL NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      journey_id TEXT,
      sos_id TEXT,
      level INTEGER NOT NULL DEFAULT 3,
      status TEXT NOT NULL DEFAULT 'open',
      trigger TEXT NOT NULL,
      duress INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      packet_json TEXT NOT NULL DEFAULT '{}',
      guardian_ack_deadline TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE SET NULL,
      FOREIGN KEY (sos_id) REFERENCES sos_events(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      incident_id TEXT NOT NULL,
      recipient_type TEXT NOT NULL,
      recipient_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      queued_at TEXT NOT NULL,
      sent_at TEXT,
      delivered_at TEXT,
      acknowledged_at TEXT,
      meta_json TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS facilities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      phone TEXT NOT NULL,
      is_24x7 INTEGER NOT NULL DEFAULT 1,
      is_demo INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'seed'
    );

    CREATE TABLE IF NOT EXISTS risk_zones (
      id TEXT PRIMARY KEY,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      radius_m INTEGER NOT NULL DEFAULT 200,
      severity INTEGER NOT NULL DEFAULT 3,
      category TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      is_demo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS lighting_zones (
      id TEXT PRIMARY KEY,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      radius_m INTEGER NOT NULL DEFAULT 200,
      level REAL NOT NULL DEFAULT 0.5
    );

    CREATE TABLE IF NOT EXISTS activity_zones (
      id TEXT PRIMARY KEY,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      radius_m INTEGER NOT NULL DEFAULT 200,
      level REAL NOT NULL DEFAULT 0.5
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_hash TEXT NOT NULL,
      category TEXT NOT NULL,
      severity INTEGER NOT NULL DEFAULT 3,
      text TEXT NOT NULL DEFAULT '',
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      confirmations INTEGER NOT NULL DEFAULT 0,
      denials INTEGER NOT NULL DEFAULT 0,
      flags INTEGER NOT NULL DEFAULT 0,
      confidence REAL NOT NULL DEFAULT 0.25,
      status TEXT NOT NULL DEFAULT 'unverified',
      is_demo INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS report_votes (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      voter_hash TEXT NOT NULL,
      vote TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(report_id, voter_hash),
      FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS fake_calls (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      caller_name TEXT NOT NULL,
      caller_number TEXT NOT NULL,
      avatar_color TEXT NOT NULL DEFAULT '#4338CA',
      ringtone TEXT NOT NULL DEFAULT 'classic',
      ui_style TEXT NOT NULL DEFAULT 'classic',
      script_json TEXT NOT NULL,
      use_recording INTEGER NOT NULL DEFAULT 0,
      scheduled_for TEXT NOT NULL,
      ring_seconds INTEGER NOT NULL DEFAULT 30,
      notify_guardian INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'scheduled',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      owner_type TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      endpoint TEXT UNIQUE NOT NULL,
      keys_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY,
      to_phone TEXT NOT NULL,
      body TEXT NOT NULL,
      kind TEXT NOT NULL,
      incident_id TEXT,
      journey_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guardian_access_log (
      id TEXT PRIMARY KEY,
      guardian_id TEXT NOT NULL,
      journey_id TEXT NOT NULL,
      ts TEXT NOT NULL,
      FOREIGN KEY (guardian_id) REFERENCES guardians(id) ON DELETE CASCADE,
      FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Performance and Lookup Indexes
    CREATE INDEX IF NOT EXISTS idx_journeys_user_id ON journeys(user_id);
    CREATE INDEX IF NOT EXISTS idx_journey_points_journey_id ON journey_points(journey_id);
    CREATE INDEX IF NOT EXISTS idx_journey_points_ts ON journey_points(ts);
    CREATE INDEX IF NOT EXISTS idx_journey_events_journey_id ON journey_events(journey_id);
    CREATE INDEX IF NOT EXISTS idx_guardians_token ON guardians(token);
    CREATE INDEX IF NOT EXISTS idx_guardians_user_id ON guardians(user_id);
    CREATE INDEX IF NOT EXISTS idx_facilities_coords ON facilities(lat, lng);
    CREATE INDEX IF NOT EXISTS idx_risk_zones_coords ON risk_zones(lat, lng);
    CREATE INDEX IF NOT EXISTS idx_lighting_coords ON lighting_zones(lat, lng);
    CREATE INDEX IF NOT EXISTS idx_activity_coords ON activity_zones(lat, lng);
    CREATE INDEX IF NOT EXISTS idx_reports_coords ON reports(lat, lng);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    CREATE INDEX IF NOT EXISTS idx_incidents_user_id ON incidents(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_incident ON notifications(incident_id);
    CREATE INDEX IF NOT EXISTS idx_fake_calls_user ON fake_calls(user_id);
  `);

  try {
    db.exec(`ALTER TABLE users ADD COLUMN onboarded_at TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE journeys ADD COLUMN drill INTEGER NOT NULL DEFAULT 0;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE journeys ADD COLUMN drill_scenario TEXT;`);
  } catch {}

  console.log('Database migrations completed successfully.');
}
