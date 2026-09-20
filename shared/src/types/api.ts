import { RiskLevel, TravelMode, ReportCategory, ReportStatus, NotificationStatus, NotificationChannel, RecipientType, IncidentStatus, GuardianStatus } from './database.js';
import { EmergencyContextPacket, LocationConfidence } from './emergency.js';

export interface RouteGeometry {
  type: 'LineString';
  coordinates: [number, number][]; // [lng, lat]
}

export interface RouteSegmentRisk {
  startIdx: number;
  endIdx: number;
  riskLevel: 'safe' | 'caution' | 'danger'; // green, amber, red
  riskScore: number; // 0 to 1
  dominantFactor: string;
}

export interface RiskyStretch {
  distanceM: number;
  description: string;
  factor: string;
  startCoordinate: [number, number];
}

export interface RouteFactors {
  incidentRisk: number;
  lightingRisk: number;
  isolationRisk: number;
  reportRisk: number;
  coverage: number;
  nightFactor: number;
}

export interface RouteOption {
  id: string;
  name: string;
  geometry: RouteGeometry;
  distanceM: number;
  durationS: number;
  safetyScore: number; // 0 to 100
  badges: ('Fastest' | 'Safest' | 'Recommended')[];
  factors: RouteFactors;
  riskySegments: RiskyStretch[];
  segmentRisks: RouteSegmentRisk[];
  dataConfidence: number; // 0 to 1
  isLowDataConfidence: boolean;
}

export interface RiskExplanationItem {
  component: string;
  points: number;
  plainText: string;
}

export interface PositionBatchItem {
  lat: number;
  lng: number;
  acc: number;
  speed: number | null;
  heading: number | null;
  ts: string;
  battery: number | null;
  online: boolean;
}

export interface PositionBatchResponse {
  riskScore: number;
  level: RiskLevel;
  explanations: RiskExplanationItem[];
  prompts: {
    type: 'safety_check' | 'checkpoint';
    id: string;
    dueAt: string;
  }[];
}

export interface GuardianSnapshot {
  guardian: {
    id: string;
    name: string;
    phone: string;
    relation: string;
    status: GuardianStatus;
  };
  user: {
    displayName: string;
  };
  journey: {
    id: string;
    status: string;
    mode: TravelMode;
    origin: { label: string; lat: number; lng: number };
    destination: { label: string; lat: number; lng: number };
    routeGeometry?: RouteGeometry;
    startedAt: string | null;
    plannedEta: string;
    level: RiskLevel;
    riskScore: number;
    riskSummary: string;
    lastLocation: {
      lat: number;
      lng: number;
      accuracyM: number;
      confidence: LocationConfidence;
      lastFixAt: string;
    } | null;
    battery: number | null;
    online: boolean;
    cab?: {
      vehicleNumber?: string;
      driverName?: string;
      company?: string;
    };
  } | null;
  incident: {
    id: string;
    status: IncidentStatus;
    trigger: string;
    duress: boolean;
    createdAt: string;
    packet?: EmergencyContextPacket;
  } | null;
  timeline: {
    id: string;
    ts: string;
    type: string;
    title: string;
    description: string;
  }[];
}

export interface ResponderIncidentItem {
  id: string;
  incidentId: string;
  status: IncidentStatus;
  createdAt: string;
  duress: boolean;
  trigger: string;
  userDisplayName: string;
  notificationStatus: NotificationStatus;
  packet: EmergencyContextPacket;
}
