export type LocationConfidence = 'high' | 'medium' | 'low';
export type LocationSource = 'gps' | 'network' | 'last_known';

export interface LocationPoint {
  lat: number;
  lng: number;
  ts: string;
}

export interface EmergencyPacketLocation {
  lat: number;
  lng: number;
  accuracyM: number;
  confidence: LocationConfidence;
  lastFixAt: string;
  source: LocationSource;
}

export interface EmergencyPacketMovement {
  speedMps: number;
  headingDeg: number;
  last5Points: LocationPoint[];
}

export interface EmergencyPacketJourney {
  id: string;
  mode: string;
  origin: {
    label: string;
    lat: number;
    lng: number;
  };
  destination: {
    label: string;
    lat: number;
    lng: number;
  };
  plannedEta: string;
  level: number;
  riskScore: number;
  riskExplain: string[];
}

export interface EmergencyPacketCab {
  vehicleNumber?: string;
  driverName?: string;
  company?: string;
}

export interface EmergencyPacketDevice {
  battery: number | null;
  online: boolean;
}

export interface EmergencyPacketFacilityRef {
  id: string;
  name: string;
  distanceKm: number;
  phone?: string;
}

export interface EmergencyPacketRecipients {
  guardians: string[];
  police: EmergencyPacketFacilityRef | null;
  hospital: EmergencyPacketFacilityRef | null;
}

export interface SafetyCheckHistoryItem {
  sentAt: string;
  response: string;
}

export interface EmergencyContextPacket {
  incidentId: string;
  createdAt: string;
  trigger: string;
  duress: boolean;
  discreet: boolean;
  person: {
    displayName: string;
    phoneKnown: boolean;
  };
  location: EmergencyPacketLocation;
  movement: EmergencyPacketMovement;
  journey?: EmergencyPacketJourney;
  cab?: EmergencyPacketCab;
  device: EmergencyPacketDevice;
  recipients: EmergencyPacketRecipients;
  safetyCheckHistory: SafetyCheckHistoryItem[];
  disclaimer: string;
}
