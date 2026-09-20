export type UserRole = 'user' | 'admin';

export interface UserRow {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  safety_pin_hash: string | null;
  duress_pin_hash: string | null;
  age_confirmed_at: string;
  settings_json: string;
  false_alarm_count: number;
  created_at: string;
}

export interface ConsentRow {
  id: string;
  user_id: string;
  type: string;
  granted: number;
  policy_version: string;
  created_at: string;
}

export type GuardianStatus = 'pending' | 'accepted' | 'left';

export interface GuardianRow {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relation: string;
  priority: number;
  status: GuardianStatus;
  token: string;
  told_confirmed: number;
  last_viewed_at: string | null;
  created_at: string;
}

export type JourneyStatus = 'planned' | 'active' | 'completed' | 'cancelled' | 'emergency';
export type TravelMode = 'walk' | 'two-wheeler' | 'car' | 'transit';
export type RiskLevel = 0 | 1 | 2 | 3;

export interface JourneyRow {
  id: string;
  user_id: string;
  status: JourneyStatus;
  mode: TravelMode;
  origin_json: string;
  dest_json: string;
  route_json: string;
  planned_eta_ts: string;
  started_at: string | null;
  ended_at: string | null;
  timing_profile: 'production' | 'demo';
  simulated: number;
  level: RiskLevel;
  risk_score: number;
  risk_explain_json: string;
  cab_json: string | null;
  checkpoint_rule_json: string | null;
  guardian_ids_json: string;
  last_seen_ts: string | null;
  last_lat: number | null;
  last_lng: number | null;
  last_acc: number | null;
  battery: number | null;
  online: number;
  share_expires_at: string | null;
}

export interface JourneyPointRow {
  id?: number;
  journey_id: string;
  ts: string;
  lat: number;
  lng: number;
  acc: number;
  speed: number | null;
  heading: number | null;
  battery: number | null;
}

export interface JourneyEventRow {
  id: string;
  journey_id: string;
  ts: string;
  type: string;
  payload_json: string;
}

export interface PlannedStopRow {
  id: string;
  journey_id: string;
  label: string;
  lat: number;
  lng: number;
  radius_m: number;
  until_ts: string;
}

export interface SafetyCheckRow {
  id: string;
  journey_id: string;
  kind: 'risk' | 'checkpoint' | 'guardian_request';
  sent_at: string;
  due_at: string;
  responded_at: string | null;
  response: 'safe' | 'help' | null;
}

export type SosStatus = 'pending' | 'cancelled' | 'escalated' | 'duress_escalated';

export interface SosEventRow {
  id: string;
  user_id: string;
  journey_id: string | null;
  trigger: string;
  discreet: number;
  status: SosStatus;
  created_at: string;
  cancel_until: string;
  lat: number;
  lng: number;
  acc: number;
}

export type IncidentStatus = 'open' | 'acknowledged' | 'resolved' | 'false_alarm';

export interface IncidentRow {
  id: string;
  user_id: string;
  journey_id: string | null;
  sos_id: string | null;
  level: number;
  status: IncidentStatus;
  trigger: string;
  duress: number;
  created_at: string;
  resolved_at: string | null;
  packet_json: string;
  guardian_ack_deadline: string | null;
}

export type RecipientType = 'police' | 'hospital' | 'guardian';
export type NotificationChannel = 'socket' | 'push' | 'sms_mock' | 'sms_twilio';
export type NotificationStatus = 'queued' | 'sent' | 'delivered' | 'acknowledged' | 'failed';

export interface NotificationRow {
  id: string;
  incident_id: string;
  recipient_type: RecipientType;
  recipient_id: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  queued_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  acknowledged_at: string | null;
  meta_json: string;
}

export type FacilityType = 'police' | 'hospital' | 'safe_place';

export interface FacilityRow {
  id: string;
  type: FacilityType;
  name: string;
  lat: number;
  lng: number;
  phone: string;
  is_24x7: number;
  is_demo: number;
  source: string;
}

export interface RiskZoneRow {
  id: string;
  lat: number;
  lng: number;
  radius_m: number;
  severity: number;
  category: string;
  occurred_at: string;
  is_demo: number;
}

export interface LightingZoneRow {
  id: string;
  lat: number;
  lng: number;
  radius_m: number;
  level: number;
}

export interface ActivityZoneRow {
  id: string;
  lat: number;
  lng: number;
  radius_m: number;
  level: number;
}

export type ReportCategory =
  | 'lighting'
  | 'unsafe_road'
  | 'suspicious'
  | 'harassment'
  | 'accident'
  | 'hazard'
  | 'crowd'
  | 'other';

export type ReportStatus = 'unverified' | 'likely' | 'verified' | 'expired' | 'removed';

export interface ReportRow {
  id: string;
  reporter_hash: string;
  category: ReportCategory;
  severity: number;
  text: string;
  lat: number;
  lng: number;
  created_at: string;
  expires_at: string;
  confirmations: number;
  denials: number;
  flags: number;
  confidence: number;
  status: ReportStatus;
  is_demo: number;
}

export interface ReportVoteRow {
  id: string;
  report_id: string;
  voter_hash: string;
  vote: 'confirm' | 'deny';
  created_at: string;
}

export type FakeCallStatus =
  | 'scheduled'
  | 'armed'
  | 'ringing'
  | 'answered'
  | 'declined'
  | 'missed'
  | 'cancelled';

export interface FakeCallRow {
  id: string;
  user_id: string;
  caller_name: string;
  caller_number: string;
  avatar_color: string;
  ringtone: string;
  ui_style: 'classic' | 'modern';
  script_json: string;
  use_recording: number;
  scheduled_for: string;
  ring_seconds: number;
  notify_guardian: number;
  status: FakeCallStatus;
  created_at: string;
}

export interface PushSubscriptionRow {
  id: string;
  owner_type: 'user' | 'guardian';
  owner_id: string;
  endpoint: string;
  keys_json: string;
  created_at: string;
}

export interface OutboxRow {
  id: string;
  to_phone: string;
  body: string;
  kind: string;
  incident_id: string | null;
  journey_id: string | null;
  created_at: string;
}

export interface GuardianAccessLogRow {
  id: string;
  guardian_id: string;
  journey_id: string;
  ts: string;
}

export interface AppConfigRow {
  key: string;
  value: string;
}
