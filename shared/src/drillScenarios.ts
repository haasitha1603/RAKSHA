export interface DrillStep {
  atSecond: number;
  title: string;
  description: string;
  telemetryDelta?: {
    latOffset?: number;
    lngOffset?: number;
    speed?: number;
    battery?: number;
    online?: boolean;
    event?: string;
  };
}

export interface DrillAssertion {
  id: string;
  label: string;
  expected: string;
}

export interface DrillScenario {
  id: string;
  number: number;
  name: string;
  category: 'Deviation & Movement' | 'Emergency & SOS' | 'Hardware & Connectivity' | 'Coordination & Dispatch';
  difficulty: 'Basic' | 'Intermediate' | 'Advanced';
  description: string;
  initialConditions: string;
  durationSeconds: number;
  steps: DrillStep[];
  assertions: DrillAssertion[];
}

export interface PresetRoute {
  id: string;
  name: string;
  description: string;
  safetyScore: number;
  origin: { lat: number; lng: number; label: string };
  destination: { lat: number; lng: number; label: string };
  waypoints: [number, number][];
}

export const PRESET_DRILL_ROUTES: PresetRoute[] = [
  {
    id: 'route_cp_indiagate',
    name: 'Connaught Place to India Gate',
    description: 'Broad central avenue with active commercial presence and high street lighting.',
    safetyScore: 88,
    origin: { lat: 28.6315, lng: 77.2167, label: 'Connaught Place' },
    destination: { lat: 28.6129, lng: 77.2295, label: 'India Gate' },
    waypoints: [
      [28.6315, 77.2167],
      [28.6250, 77.2190],
      [28.6200, 77.2230],
      [28.6150, 77.2270],
      [28.6129, 77.2295],
    ],
  },
  {
    id: 'route_hauzkhas_saket',
    name: 'Hauz Khas Village to Saket',
    description: 'Mixed urban corridor with park perimeters and varying lighting density.',
    safetyScore: 65,
    origin: { lat: 28.5534, lng: 77.1944, label: 'Hauz Khas Village' },
    destination: { lat: 28.5204, lng: 77.2014, label: 'Saket Metro' },
    waypoints: [
      [28.5534, 77.1944],
      [28.5450, 77.1960],
      [28.5350, 77.1990],
      [28.5280, 77.2005],
      [28.5204, 77.2014],
    ],
  },
  {
    id: 'route_olddelhi_kashmere',
    name: 'Old Delhi Railway Station to Kashmere Gate',
    description: 'High density historic commercial market with active 24/7 foot traffic.',
    safetyScore: 74,
    origin: { lat: 28.6562, lng: 77.2301, label: 'Old Delhi Railway Station' },
    destination: { lat: 28.6675, lng: 77.2284, label: 'Kashmere Gate ISBT' },
    waypoints: [
      [28.6562, 77.2301],
      [28.6590, 77.2310],
      [28.6620, 77.2300],
      [28.6650, 77.2290],
      [28.6675, 77.2284],
    ],
  },
];

export const DRILL_SCENARIOS: DrillScenario[] = [
  {
    id: 'drill_01',
    number: 1,
    name: 'Route Deviation (>150m Excursion)',
    category: 'Deviation & Movement',
    difficulty: 'Basic',
    description: 'Traveler departs from planned route by over 180 meters into an unfamiliar street.',
    initialConditions: 'Active walking journey following polyline at 4.5 km/h.',
    durationSeconds: 20,
    steps: [
      { atSecond: 0, title: 'Normal Movement', description: 'Traveler follows planned route corridor within 15 meters tolerance.' },
      { atSecond: 5, title: 'Deviation Initiated', description: 'Traveler turns into unexpected side alley (lat offset +0.0020).', telemetryDelta: { latOffset: 0.002, speed: 4.8 } },
      { atSecond: 10, title: '150m Threshold Crossed', description: 'Deviation reaches 185m from polyline. Hysteresis timer arms.', telemetryDelta: { latOffset: 0.0035 } },
      { atSecond: 14, title: 'Safety Check Prompt', description: 'Level 2 prompt displays on phone: "Are you safe? Enter PIN to dismiss".', telemetryDelta: { event: 'safety_check_prompt' } },
      { atSecond: 18, title: 'Guardian Telemetry Flag', description: 'Guardian live stream displays amber corridor alert banner with live offset distance.' },
    ],
    assertions: [
      { id: 'asst_01_dev', label: 'Corridor deviation detected at >150m', expected: 'True' },
      { id: 'asst_01_chk', label: 'Safety check prompt presented to traveler', expected: 'True' },
      { id: 'asst_01_sms', label: 'SMS dispatch tagged with [DRILL] mode', expected: 'True' },
    ],
  },
  {
    id: 'drill_02',
    number: 2,
    name: 'Unexpected Stop (>3 min in Isolated Area)',
    category: 'Deviation & Movement',
    difficulty: 'Basic',
    description: 'Traveler halts abruptly in an unlit sector outside any scheduled stop.',
    initialConditions: 'Traveler traveling along corridor, speed drops to 0 km/h.',
    durationSeconds: 20,
    steps: [
      { atSecond: 0, title: 'Traveler Halts', description: 'Speed drops from 5.0 km/h to 0.0 km/h.', telemetryDelta: { speed: 0 } },
      { atSecond: 6, title: 'Stationary Threshold Met', description: 'Stationary duration exceeds tolerance window in low-lighting zone.' },
      { atSecond: 12, title: 'Safety Verification Armed', description: 'Traveler phone pulses with audio reminder and 30s countdown.', telemetryDelta: { event: 'stationary_check' } },
      { atSecond: 18, title: 'Escalation Standby', description: 'Guardian notification packet queued pending timeout expiry.' },
    ],
    assertions: [
      { id: 'asst_02_stop', label: 'Sudden halt detected and isolated area weighted', expected: 'True' },
      { id: 'asst_02_timer', label: 'Stationary verification countdown armed', expected: 'True' },
      { id: 'asst_02_log', label: 'Stationary telemetry logged in journey events', expected: 'True' },
    ],
  },
  {
    id: 'drill_03',
    number: 3,
    name: 'Missing Heartbeat (>60s Offline Dead Zone)',
    category: 'Hardware & Connectivity',
    difficulty: 'Intermediate',
    description: 'Device loses internet connection in a subterranean underpass or dead zone.',
    initialConditions: 'Journey in progress; telemetry stream cuts out abruptly.',
    durationSeconds: 20,
    steps: [
      { atSecond: 0, title: 'Network Disconnect', description: 'Browser reports offline state; WebSocket connection drops.', telemetryDelta: { online: false } },
      { atSecond: 6, title: 'IndexedDB Breadcrumb Caching', description: 'Local PWA caches raw GPS fixes in IndexedDB storage.' },
      { atSecond: 12, title: 'Server Watchdog Alert', description: 'Server watchdog detects missing heartbeat > 60s window.' },
      { atSecond: 18, title: 'Offline SMS Template Ready', description: 'Client UI reveals one-tap emergency SMS button prefilled with GPS coordinates.' },
    ],
    assertions: [
      { id: 'asst_03_disc', label: 'Offline status detected cleanly', expected: 'True' },
      { id: 'asst_03_cache', label: 'GPS points cached in local IndexedDB', expected: 'True' },
      { id: 'asst_03_watchdog', label: 'Server watchdog triggers missing heartbeat alert', expected: 'True' },
    ],
  },
  {
    id: 'drill_04',
    number: 4,
    name: 'Speed Anomaly (Erratic Surge / Collision)',
    category: 'Deviation & Movement',
    difficulty: 'Intermediate',
    description: 'Traveler on foot experiences sudden vehicular speed surge to 70 km/h.',
    initialConditions: 'Walking mode selected; sudden rapid velocity spike.',
    durationSeconds: 18,
    steps: [
      { atSecond: 0, title: 'Walking Speed', description: 'Speed steady at 4.2 km/h.', telemetryDelta: { speed: 4.2 } },
      { atSecond: 5, title: 'Abrupt Velocity Surge', description: 'Speed jumps to 68.5 km/h over 3 seconds.', telemetryDelta: { speed: 68.5 } },
      { atSecond: 11, title: 'Mode Inconsistency Flag', description: 'Anomaly filter flags speed mismatch for walking profile.', telemetryDelta: { event: 'speed_anomaly' } },
      { atSecond: 16, title: 'Vehicle Mode Query', description: 'App prompts: "Did you board a vehicle? Update mode or confirm safety".' },
    ],
    assertions: [
      { id: 'asst_04_surge', label: 'Velocity anomaly detected against mode baseline', expected: 'True' },
      { id: 'asst_04_filt', label: 'Multipath filter confirms persistent high speed', expected: 'True' },
      { id: 'asst_04_prompt', label: 'Traveler prompted to update transport mode', expected: 'True' },
    ],
  },
  {
    id: 'drill_05',
    number: 5,
    name: 'Manual SOS Trigger (3-Second Hold)',
    category: 'Emergency & SOS',
    difficulty: 'Basic',
    description: 'Traveler presses and holds the raised SOS button for 3 seconds.',
    initialConditions: 'App on home or journey screen.',
    durationSeconds: 18,
    steps: [
      { atSecond: 0, title: 'Button Contact Initiated', description: 'User presses SOS button. Circular SVG progress ring begins filling.' },
      { atSecond: 3, title: '3-Second Threshold Reached', description: 'Haptic pulse fires; Level 3 emergency dispatch protocol initiates.', telemetryDelta: { event: 'sos_triggered' } },
      { atSecond: 5, title: 'Parallel Incident Broadcast', description: 'Emergency packet broadcast to nearest police (300ms) and hospital (350ms).' },
      { atSecond: 10, title: 'Simulated SMS Outbox', description: 'SMS outbox receives emergency broadcast with live tracking link.' },
      { atSecond: 15, title: 'Active Emergency Screen', description: 'Phone transitions to full emergency coordination display.' },
    ],
    assertions: [
      { id: 'asst_05_hold', label: '3-second hold filter prevents accidental tap', expected: 'True' },
      { id: 'asst_05_subsec', label: 'Incident broadcast latency < 800ms', expected: 'True' },
      { id: 'asst_05_outbox', label: 'Mock SMS outbox entries created with [DRILL] tag', expected: 'True' },
    ],
  },
  {
    id: 'drill_06',
    number: 6,
    name: 'Duress PIN SOS (Stealth Cancellation 4321)',
    category: 'Emergency & SOS',
    difficulty: 'Advanced',
    description: 'Traveler is coerced to dismiss SOS and enters stealth Duress PIN 4321.',
    initialConditions: 'Emergency countdown active; assailant demands PIN entry.',
    durationSeconds: 20,
    steps: [
      { atSecond: 0, title: 'Emergency Verification Display', description: 'PIN pad shown on screen demanding 4-digit code.' },
      { atSecond: 5, title: 'Duress PIN Entered (4321)', description: 'User types 4321. System immediately renders "SOS Cancelled" green banner.' },
      { atSecond: 8, title: 'Silent Escalation Dispatch', description: 'Behind the scenes, emergency incident is NOT cancelled; duress flag set to 1.', telemetryDelta: { event: 'duress_pin_entered' } },
      { atSecond: 13, title: 'Police Console Coercion Flag', description: 'Responder console flashes red: "COERCION DETECTED: Traveler entered duress PIN".' },
      { atSecond: 18, title: 'Stealth Telemetry Stream Continues', description: 'Location tracking continues transmitting silently.' },
    ],
    assertions: [
      { id: 'asst_06_decoy', label: 'UI shows realistic cancellation feedback to assailant', expected: 'True' },
      { id: 'asst_06_flag', label: 'Incident packet marked with duress = 1', expected: 'True' },
      { id: 'asst_06_resp', label: 'Responders alerted to silent coercion threat', expected: 'True' },
    ],
  },
  {
    id: 'drill_07',
    number: 7,
    name: 'Discreet SOS (Silent Emergency Trigger)',
    category: 'Emergency & SOS',
    difficulty: 'Intermediate',
    description: 'Traveler triggers discreet emergency without activating sirens or high-contrast screens.',
    initialConditions: 'Discreet mode toggle armed.',
    durationSeconds: 18,
    steps: [
      { atSecond: 0, title: 'Discreet SOS Action', description: 'Triggered via stealth shortcut or calculator decoy.' },
      { atSecond: 4, title: 'No Audible Siren', description: 'Audio output muted; screen brightness minimized.' },
      { atSecond: 8, title: 'Stealth Data Packet Broadcast', description: 'Emergency telemetry transmitted with discreet = true flag.' },
      { atSecond: 14, title: 'Guardian Push Notification', description: 'Guardians receive silent high-priority push notification.' },
    ],
    assertions: [
      { id: 'asst_07_silent', label: 'Audio alarms and loud feedback completely suppressed', expected: 'True' },
      { id: 'asst_07_data', label: 'Emergency incident created with discreet = 1', expected: 'True' },
      { id: 'asst_07_gstream', label: 'Guardian telemetry stream updates live', expected: 'True' },
    ],
  },
  {
    id: 'drill_08',
    number: 8,
    name: 'Sensor Shake SOS (Accelerometer Pattern)',
    category: 'Emergency & SOS',
    difficulty: 'Intermediate',
    description: 'User shakes phone violently with acceleration exceeding 24 m/s² threshold.',
    initialConditions: 'Motion sensor listener active in background/foreground.',
    durationSeconds: 18,
    steps: [
      { atSecond: 0, title: 'Shake Motion Detected', description: 'Accelerometer records 26.4 m/s² peak acceleration.' },
      { atSecond: 3, title: 'Pattern Filter Validated', description: 'Rejection filter verifies 3 directional reversals within 1.5s.' },
      { atSecond: 7, title: 'Safety Abort Window', description: '5-second pre-alert vibration warning allows accidental shake abort.' },
      { atSecond: 13, title: 'Emergency Dispatch', description: 'No abort received; Level 3 emergency packet generated.' },
    ],
    assertions: [
      { id: 'asst_08_accel', label: 'Acceleration peak > 24 m/s² detected', expected: 'True' },
      { id: 'asst_08_reversal', label: 'Directional reversal filter prevents single bump trigger', expected: 'True' },
      { id: 'asst_08_abort', label: 'Abort countdown provided before dispatch', expected: 'True' },
    ],
  },
  {
    id: 'drill_09',
    number: 9,
    name: 'Battery Low Escalation (<10% Battery Alert)',
    category: 'Hardware & Connectivity',
    difficulty: 'Basic',
    description: 'Phone battery drops below 10% during active night journey.',
    initialConditions: 'Active journey; battery level decaying.',
    durationSeconds: 18,
    steps: [
      { atSecond: 0, title: 'Battery Level 14%', description: 'Battery API reports 14% remaining.' },
      { atSecond: 5, title: 'First Advisory (<15%)', description: 'Soft notification to traveler to enable battery saver.' },
      { atSecond: 10, title: 'Critical Drop to 9%', description: 'Battery level reaches 9% critical threshold.', telemetryDelta: { battery: 9 } },
      { atSecond: 14, title: 'Pre-Shutoff Broadcast', description: 'Last known location and destination transmitted to guardians via SMS advisory.' },
    ],
    assertions: [
      { id: 'asst_09_thresh', label: 'Battery drop < 10% detected', expected: 'True' },
      { id: 'asst_09_sms', label: 'Low battery advisory SMS queued with coordinates', expected: 'True' },
      { id: 'asst_09_cache', label: 'Destination ETA preserved in guardian view', expected: 'True' },
    ],
  },
  {
    id: 'drill_10',
    number: 10,
    name: 'Geofence Boundary Breach',
    category: 'Deviation & Movement',
    difficulty: 'Intermediate',
    description: 'Traveler exits agreed safe zone boundary or enters flagged restricted polygon.',
    initialConditions: 'Geofence perimeter active with 500m radius around destination.',
    durationSeconds: 18,
    steps: [
      { atSecond: 0, title: 'Inside Safe Boundary', description: 'Distance to boundary center: 320 meters (inside).' },
      { atSecond: 6, title: 'Perimeter Boundary Reached', description: 'Coordinates cross perimeter line (dist: 510m).', telemetryDelta: { latOffset: 0.004 } },
      { atSecond: 11, title: 'Boundary Breach Event', description: 'Geofence engine creates "geofence_breach" journey event.', telemetryDelta: { event: 'geofence_breach' } },
      { atSecond: 16, title: 'Guardian Map Perimeter Warning', description: 'Guardian live map draws highlighted red excursion marker.' },
    ],
    assertions: [
      { id: 'asst_10_cross', label: 'Point-in-polygon / distance breach detected', expected: 'True' },
      { id: 'asst_10_evt', label: 'Geofence breach event recorded in DB', expected: 'True' },
      { id: 'asst_10_gview', label: 'Guardian stream displays perimeter alert', expected: 'True' },
    ],
  },
  {
    id: 'drill_11',
    number: 11,
    name: 'Fake Call Evasion',
    category: 'Emergency & SOS',
    difficulty: 'Basic',
    description: 'Traveler arms simulated call; phone triggers realistic incoming call with Web Audio and dialogue.',
    initialConditions: 'Traveler feels uncomfortable and wants an excuse to leave.',
    durationSeconds: 20,
    steps: [
      { atSecond: 0, title: 'Fake Call Scheduled', description: 'Caller: "Inspector Sharma (Police)"; delay: 5 seconds.' },
      { atSecond: 5, title: 'Incoming Ringtone Synthesized', description: 'Web Audio synthesizes classic digital bell ring tone.' },
      { atSecond: 9, title: 'Call Answered', description: 'Traveler slides to answer. In-call audio synthesizes realistic multi-turn voice prompt.' },
      { atSecond: 15, title: 'Stealth SOS from Keypad', description: 'Traveler presses keypad 4-3-2-1 to covertly verify duress trigger during fake call.' },
    ],
    assertions: [
      { id: 'asst_11_audio', label: 'Web Audio synthesizer generates tone without external audio files', expected: 'True' },
      { id: 'asst_11_screen', label: 'Realistic incoming call screen overlays UI', expected: 'True' },
      { id: 'asst_11_dtmf', label: 'DTMF keypad supports stealth duress entry', expected: 'True' },
    ],
  },
  {
    id: 'drill_12',
    number: 12,
    name: 'Guardian Acknowledgment & Escalation Stop',
    category: 'Coordination & Dispatch',
    difficulty: 'Basic',
    description: 'Guardian opens tracking link, acknowledges alert, stopping automated escalation.',
    initialConditions: 'Emergency incident active; 3-minute guardian timeout running.',
    durationSeconds: 18,
    steps: [
      { atSecond: 0, title: 'Incident Active', description: 'Guardian acknowledgement countdown ticking at 180 seconds.' },
      { atSecond: 5, title: 'Guardian Opens Stream', description: 'Guardian authenticates via secure URL token (/g/:token).' },
      { atSecond: 9, title: 'Guardian Taps Acknowledge', description: 'Guardian taps "I am in Contact / Responding".' },
      { atSecond: 14, title: 'Escalation Timer Cleared', description: 'Incident state updates to "acknowledged"; automated police escalation halted.' },
    ],
    assertions: [
      { id: 'asst_12_auth', label: 'Guardian token authenticated without login requirement', expected: 'True' },
      { id: 'asst_12_ack', label: 'Acknowledgment recorded with guardian timestamp', expected: 'True' },
      { id: 'asst_12_halt', label: 'Auto-escalation countdown cleared in database', expected: 'True' },
    ],
  },
  {
    id: 'drill_13',
    number: 13,
    name: 'Multi-Agency Simultaneous Dispatch',
    category: 'Coordination & Dispatch',
    difficulty: 'Advanced',
    description: 'Level 3 incident dispatches simultaneously to Police station and Trauma hospital.',
    initialConditions: 'High-severity incident created in central city zone.',
    durationSeconds: 20,
    steps: [
      { atSecond: 0, title: 'Parallel Broadcast Triggered', description: 'Dispatch engine queries nearest facilities within 3km radius.' },
      { atSecond: 4, title: 'Police Console Alerted', description: 'Police console receives incident packet, vehicle info, and last 5 GPS fixes.' },
      { atSecond: 8, title: 'Hospital ER Notified', description: 'Trauma hospital console receives medical telemetry ticket.' },
      { atSecond: 14, title: 'Responder Status Workflow', description: 'Police changes status from "Dispatched" to "En Route" (ETA 4 min).' },
    ],
    assertions: [
      { id: 'asst_13_multi', label: 'Both Police and Hospital consoles receive tickets in parallel', expected: 'True' },
      { id: 'asst_13_packet', label: 'Emergency packet includes cab, battery, and last 5 coordinates', expected: 'True' },
      { id: 'asst_13_workflow', label: 'Responder status transitions propagate over Socket.IO', expected: 'True' },
    ],
  },
  {
    id: 'drill_14',
    number: 14,
    name: 'Safe Arrival & Clean Session Closure',
    category: 'Deviation & Movement',
    difficulty: 'Basic',
    description: 'Traveler safely enters 30m radius of destination; journey completes smoothly.',
    initialConditions: 'Traveler approaching final 100 meters of planned route.',
    durationSeconds: 18,
    steps: [
      { atSecond: 0, title: 'Approaching Destination', description: 'Distance to destination: 85 meters.' },
      { atSecond: 6, title: 'Arrival Radius Entered (<30m)', description: 'GPS fix records distance: 22 meters to destination.' },
      { atSecond: 10, title: 'Journey Completed', description: 'Status transitions from "active" to "completed".' },
      { atSecond: 15, title: 'Guardians Notified of Arrival', description: 'SMS outbox receives "Arrived Safely" advisory; live tracking stream closed.' },
    ],
    assertions: [
      { id: 'asst_14_radius', label: 'Safe arrival detected within 30m radius', expected: 'True' },
      { id: 'asst_14_status', label: 'Journey status marked completed cleanly', expected: 'True' },
      { id: 'asst_14_cleanup', label: 'Tracking token expires safely', expected: 'True' },
    ],
  },
];
