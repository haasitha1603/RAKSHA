import { db } from '../db/index.js';
import {
  haversineDistance,
  pointToPolylineDistance,
} from '../db/geo.js';
import {
  JourneyRow,
  JourneyPointRow,
  RiskLevel,
  RiskExplanationItem,
  TIMING_PROFILES,
  TimingProfileKey,
  PositionBatchItem,
  FacilityRow,
} from '@raksha/shared';
import { evaluatePointRisk, calculateNightFactor } from './routeRisk.js';

export interface JourneyRiskEvaluation {
  riskScore: number;
  level: RiskLevel;
  explanations: RiskExplanationItem[];
  shouldTriggerSafetyCheck: boolean;
  shouldEscalateToEmergency: boolean;
  prompts: {
    type: 'safety_check' | 'checkpoint';
    id: string;
    dueAt: string;
  }[];
}

export function filterPositions(positions: PositionBatchItem[]): PositionBatchItem[] {
  if (positions.length === 0) return [];

  // Drop points with accuracy > 200m
  const accFiltered = positions.filter((p) => p.acc <= 200);
  if (accFiltered.length === 0) return [];

  // Filter impossible speed glitches > 70 m/s (~250 km/h)
  const speedFiltered: PositionBatchItem[] = [accFiltered[0]];
  for (let i = 1; i < accFiltered.length; i++) {
    const prev = speedFiltered[speedFiltered.length - 1];
    const curr = accFiltered[i];
    const timeSec = Math.max(0.1, (new Date(curr.ts).getTime() - new Date(prev.ts).getTime()) / 1000);
    const distM = haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);
    const impliedSpeed = distM / timeSec;

    if (impliedSpeed <= 70) {
      speedFiltered.push(curr);
    }
  }

  return speedFiltered;
}

export async function evaluateJourneyRisk(
  journey: JourneyRow,
  currentPoint: PositionBatchItem,
  allRecentPoints: JourneyPointRow[],
  activeCheckMissed = false,
  guardianCheckMissed = false
): Promise<JourneyRiskEvaluation> {
  const profileKey = (journey.timing_profile as TimingProfileKey) || 'production';
  const profile = TIMING_PROFILES[profileKey] || TIMING_PROFILES.production;

  let totalScore = 0;
  const explanations: RiskExplanationItem[] = [];

  // Parse planned route polyline coordinates
  let routeCoords: [number, number][] = [];
  try {
    const routeObj = JSON.parse(journey.route_json);
    routeCoords = routeObj.coordinates || routeObj.geometry?.coordinates || [];
  } catch {}

  // Parse destination coordinates
  let destLat = 0;
  let destLng = 0;
  try {
    const destObj = JSON.parse(journey.dest_json);
    destLat = destObj.lat || 0;
    destLng = destObj.lng || 0;
  } catch {}

  // 1. Route Deviation
  if (routeCoords.length > 0) {
    const distToPolyline = pointToPolylineDistance(
      { lat: currentPoint.lat, lng: currentPoint.lng },
      routeCoords
    );

    let deviationPoints = 0;
    if (distToPolyline > 400) {
      deviationPoints = 40;
    } else if (distToPolyline >= 150) {
      deviationPoints = 25;
    } else if (distToPolyline >= 50) {
      deviationPoints = 10;
    }

    if (deviationPoints > 0) {
      totalScore += deviationPoints;
      explanations.push({
        component: 'Route deviation',
        points: deviationPoints,
        plainText: `Off planned route by ~${Math.round(distToPolyline)} m`,
      });
    }
  }

  // 2. Unexpected Stop Detection
  // Check if stationary (speed < 0.5 m/s)
  const isSpeedStationary = (currentPoint.speed != null && currentPoint.speed < 0.5);
  const distToDest = destLat ? haversineDistance(currentPoint.lat, currentPoint.lng, destLat, destLng) : Infinity;

  // Check if near a planned stop
  const nowTs = new Date(currentPoint.ts).getTime();
  const plannedStops = await db.prepare(`
    SELECT * FROM planned_stops
    WHERE journey_id = ? AND datetime(until_ts) >= datetime(?)
  `).all<{ lat: number; lng: number; radius_m: number }>(journey.id, currentPoint.ts);

  const inPlannedStop = plannedStops.some(
    (ps) => haversineDistance(currentPoint.lat, currentPoint.lng, ps.lat, ps.lng) <= ps.radius_m
  );

  // Check if near safe place (< 100m)
  const safePlaces = await db.prepare(`
    SELECT * FROM facilities WHERE type = 'safe_place'
  `).all<FacilityRow>();
  const nearSafePlace = safePlaces.some(
    (sp) => haversineDistance(currentPoint.lat, currentPoint.lng, sp.lat, sp.lng) <= 100
  );

  const stopSuppressed = inPlannedStop || nearSafePlace || distToDest < 100;

  if (isSpeedStationary && !stopSuppressed) {
    // Count stationary points in recent history
    let stationaryDurationMs = 0;
    for (let i = allRecentPoints.length - 1; i >= 0; i--) {
      const pt = allRecentPoints[i];
      if (pt.speed != null && pt.speed < 0.5) {
        stationaryDurationMs = nowTs - new Date(pt.ts).getTime();
      } else {
        break;
      }
    }

    let stopPoints = 0;
    if (stationaryDurationMs >= profile.stopDetect * 3) {
      stopPoints = 30;
    } else if (stationaryDurationMs >= profile.stopDetect * 2) {
      stopPoints = 20;
    } else if (stationaryDurationMs >= profile.stopDetect) {
      stopPoints = 10;
    }

    if (stopPoints > 0) {
      totalScore += stopPoints;
      explanations.push({
        component: 'Unexpected stop',
        points: stopPoints,
        plainText: `Stationary for ${Math.round(stationaryDurationMs / 1000)}s away from safe places`,
      });
    }
  }

  // 3. Delay / Planned ETA exceeded
  if (journey.planned_eta_ts) {
    const plannedEtaMs = new Date(journey.planned_eta_ts).getTime();
    if (nowTs > plannedEtaMs) {
      const delayMs = nowTs - plannedEtaMs;
      const startedMs = journey.started_at ? new Date(journey.started_at).getTime() : plannedEtaMs - 1800000;
      const totalPlannedDuration = Math.max(60000, plannedEtaMs - startedMs);
      const delayPercent = delayMs / totalPlannedDuration;

      let delayPoints = 0;
      if (delayPercent > 0.6) {
        delayPoints = 25;
      } else if (delayPercent > 0.3) {
        delayPoints = 15;
      } else if (delayPercent > 0.15) {
        delayPoints = 5;
      }

      if (delayPoints > 0) {
        totalScore += delayPoints;
        explanations.push({
          component: 'Delay',
          points: delayPoints,
          plainText: `Exceeded planned ETA by ${Math.round(delayMs / 60000)} minutes`,
        });
      }
    }
  }

  // 4. Area Risk
  const nightFactor = calculateNightFactor(new Date(currentPoint.ts));
  const riskZones = await db.prepare(`SELECT * FROM risk_zones`).all();
  const lightingZones = await db.prepare(`SELECT * FROM lighting_zones`).all();
  const activityZones = await db.prepare(`SELECT * FROM activity_zones`).all();
  const reports = await db.prepare(`SELECT * FROM reports WHERE status != 'expired' AND status != 'removed'`).all();
  const facilities = await db.prepare(`SELECT * FROM facilities`).all();

  const pointDetail = evaluatePointRisk(
    { lat: currentPoint.lat, lng: currentPoint.lng },
    nightFactor,
    riskZones,
    lightingZones,
    activityZones,
    reports,
    facilities
  );

  const areaRiskScore = Math.round(pointDetail.pointRisk * 20);
  if (areaRiskScore > 0) {
    totalScore += areaRiskScore;
    explanations.push({
      component: 'Area risk',
      points: areaRiskScore,
      plainText: `Current segment: ${pointDetail.dominantFactor}`,
    });
  }

  // 5. Time of day
  const hours = new Date(currentPoint.ts).getHours();
  if (hours >= 22 || hours < 5) {
    totalScore += 10;
    explanations.push({ component: 'Night travel', points: 10, plainText: 'Late night travel (22:00–05:00)' });
  } else if ((hours >= 19 && hours < 22) || (hours >= 5 && hours < 7)) {
    totalScore += 5;
    explanations.push({ component: 'Night travel', points: 5, plainText: 'Evening / dawn travel' });
  }

  // 6. Connectivity Heartbeat check (checked by watchdog, but factor in if offline)
  if (!currentPoint.online) {
    totalScore += 15;
    explanations.push({ component: 'Connectivity', points: 15, plainText: 'Device currently offline' });
  }

  // 7. Speed Anomaly (Walking mode jump > 6 m/s & > 5x median)
  if (journey.mode === 'walk' && currentPoint.speed && currentPoint.speed > 6) {
    const recentSpeeds = allRecentPoints.map((p) => p.speed || 0).filter((s) => s > 0);
    const medianSpeed = recentSpeeds.length > 0 ? recentSpeeds[Math.floor(recentSpeeds.length / 2)] : 1.3;
    if (currentPoint.speed > medianSpeed * 5) {
      totalScore += 15;
      explanations.push({
        component: 'Speed anomaly',
        points: 15,
        plainText: 'Sudden high speed jump while walking (possible vehicle entry)',
      });
    }
  }

  // 8. Missed Safety Checks
  if (activeCheckMissed) {
    totalScore += 30;
    explanations.push({ component: 'Safety check', points: 30, plainText: 'No response to Safety Check prompt' });
  }

  if (guardianCheckMissed) {
    totalScore += 30;
    explanations.push({ component: 'Guardian check-in', points: 30, plainText: 'Guardian check-in request timed out' });
  }

  // 9. Low Battery
  if (currentPoint.battery != null && currentPoint.battery <= 10) {
    totalScore += 5;
    explanations.push({ component: 'Low battery', points: 5, plainText: `Battery critically low (${currentPoint.battery}%)` });
  }

  // Clamp score
  const finalScore = Math.min(100, Math.max(0, totalScore));

  // Determine Level: 0-24 -> L0, 25-49 -> L1, 50-74 -> L2, >=75 -> L3
  let computedLevel: RiskLevel = 0;
  if (finalScore >= 75 || (activeCheckMissed && finalScore >= 60)) {
    computedLevel = 3;
  } else if (finalScore >= 50) {
    computedLevel = 2;
  } else if (finalScore >= 25) {
    computedLevel = 1;
  }

  // Hysteresis check: lower level only after hysteresis delay
  let targetLevel = computedLevel;
  if (computedLevel < journey.level) {
    // Check if score has been consistently lower for hysteresisMs
    // If not, keep current level
    const lastSeen = journey.last_seen_ts ? new Date(journey.last_seen_ts).getTime() : nowTs;
    if (nowTs - lastSeen < profile.hysteresisMs) {
      targetLevel = journey.level;
    }
  }

  const shouldTriggerSafetyCheck = targetLevel === 2 && journey.level < 2;
  const shouldEscalateToEmergency = targetLevel === 3 && journey.level < 3;

  const prompts: { type: 'safety_check' | 'checkpoint'; id: string; dueAt: string }[] = [];

  return {
    riskScore: finalScore,
    level: targetLevel,
    explanations,
    shouldTriggerSafetyCheck,
    shouldEscalateToEmergency,
    prompts,
  };
}
