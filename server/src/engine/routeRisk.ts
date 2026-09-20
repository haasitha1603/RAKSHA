import { db } from '../db/index.js';
import {
  haversineDistance,
  getBoundingBox,
  samplePolyline,
  LatLng,
} from '../db/geo.js';
import {
  RiskZoneRow,
  LightingZoneRow,
  ActivityZoneRow,
  ReportRow,
  FacilityRow,
  RouteOption,
  RouteSegmentRisk,
  RiskyStretch,
  RouteFactors,
} from '@raksha/shared';
import { RawRouteResult } from '../services/routing.js';

export function calculateNightFactor(departAtDate: Date = new Date()): number {
  const hours = departAtDate.getHours();
  if (hours >= 22 || hours < 5) {
    return 1.0;
  }
  if ((hours >= 19 && hours < 22) || (hours >= 5 && hours < 7)) {
    return 0.5;
  }
  return 0.1;
}

interface PointRiskDetail {
  pointRisk: number;
  incidentRisk: number;
  lightingRisk: number;
  isolationRisk: number;
  reportRisk: number;
  coverage: number;
  dominantFactor: string;
  hasData: boolean;
}

export function evaluatePointRisk(
  p: LatLng,
  nightFactor: number,
  riskZones: RiskZoneRow[],
  lightingZones: LightingZoneRow[],
  activityZones: ActivityZoneRow[],
  reports: ReportRow[],
  facilities: FacilityRow[]
): PointRiskDetail {
  let hasData = false;

  // 1. Incident Risk (within 300m)
  let incidentSum = 0;
  for (const rz of riskZones) {
    const dist = haversineDistance(p.lat, p.lng, rz.lat, rz.lng);
    if (dist <= 300) {
      hasData = true;
      const ageDays = Math.max(
        0,
        (Date.now() - new Date(rz.occurred_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      const recencyW = Math.exp(-ageDays / 90);
      const weight = (rz.severity / 5) * recencyW * (1 - dist / 300);
      incidentSum += weight;
    }
  }
  const incidentRisk = Math.min(1, incidentSum);

  // 2. Lighting Risk
  let lightingLevel = 0.5; // default
  let nearestLightingDist = Infinity;
  for (const lz of lightingZones) {
    const dist = haversineDistance(p.lat, p.lng, lz.lat, lz.lng);
    if (dist <= lz.radius_m && dist < nearestLightingDist) {
      hasData = true;
      nearestLightingDist = dist;
      lightingLevel = lz.level;
    }
  }
  const lightingRisk = (1 - lightingLevel) * nightFactor;

  // 3. Isolation Risk
  let activityLevel = 0.5; // default
  let nearestActivityDist = Infinity;
  for (const az of activityZones) {
    const dist = haversineDistance(p.lat, p.lng, az.lat, az.lng);
    if (dist <= az.radius_m && dist < nearestActivityDist) {
      hasData = true;
      nearestActivityDist = dist;
      activityLevel = az.level;
    }
  }
  const isolationRisk = (1 - activityLevel) * (0.3 + 0.7 * nightFactor);

  // 4. Report Risk (within 150m)
  let reportSum = 0;
  const statusWeights: Record<string, number> = {
    unverified: 0.3,
    likely: 0.7,
    verified: 1.0,
  };
  for (const rep of reports) {
    const dist = haversineDistance(p.lat, p.lng, rep.lat, rep.lng);
    if (dist <= 150) {
      hasData = true;
      const w = statusWeights[rep.status] ?? 0.5;
      reportSum += (w * rep.severity) / 5;
    }
  }
  const reportRisk = Math.min(1, reportSum);

  // 5. Emergency Facility Coverage
  let minDistToFacility = Infinity;
  for (const fac of facilities) {
    const dist = haversineDistance(p.lat, p.lng, fac.lat, fac.lng);
    if (dist < minDistToFacility) {
      minDistToFacility = dist;
      hasData = true;
    }
  }
  const coverage = Math.max(0, Math.min(1, 1 - minDistToFacility / 1500));

  // Point Risk Composite
  const weightedPointRisk =
    0.35 * incidentRisk +
    0.20 * lightingRisk +
    0.20 * isolationRisk +
    0.15 * reportRisk +
    0.10 * (1 - coverage);

  const pointRisk = Math.max(0, Math.min(1, weightedPointRisk));

  // Find dominant factor for risky stretches
  const factorMap = [
    { name: 'past incident hotspot', val: incidentRisk * 0.35 },
    { name: 'poorly lit', val: lightingRisk * 0.20 },
    { name: 'isolated', val: isolationRisk * 0.20 },
    { name: 'community-reported issue', val: reportRisk * 0.15 },
    { name: 'low emergency facility coverage', val: (1 - coverage) * 0.10 },
  ];
  factorMap.sort((a, b) => b.val - a.val);
  const dominantFactor = factorMap[0].name;

  return {
    pointRisk,
    incidentRisk,
    lightingRisk,
    isolationRisk,
    reportRisk,
    coverage,
    dominantFactor,
    hasData,
  };
}

export function scoreAndRankRoutes(
  rawRoutes: RawRouteResult[],
  departAtDate: Date = new Date(),
  safetyPriority = 60
): RouteOption[] {
  if (rawRoutes.length === 0) return [];

  const nightFactor = calculateNightFactor(departAtDate);

  // Pull candidate safety layers once for bounding area
  const allRiskZones = db.prepare(`SELECT * FROM risk_zones`).all() as RiskZoneRow[];
  const allLightingZones = db.prepare(`SELECT * FROM lighting_zones`).all() as LightingZoneRow[];
  const allActivityZones = db.prepare(`SELECT * FROM activity_zones`).all() as ActivityZoneRow[];
  const allReports = db.prepare(`SELECT * FROM reports WHERE status != 'expired' AND status != 'removed'`).all() as ReportRow[];
  const allFacilities = db.prepare(`SELECT * FROM facilities`).all() as FacilityRow[];

  interface EvaluatedCandidate {
    raw: RawRouteResult;
    safetyScore: number;
    routeRisk: number;
    factors: RouteFactors;
    riskySegments: RiskyStretch[];
    segmentRisks: RouteSegmentRisk[];
    dataConfidence: number;
  }

  const evaluated: EvaluatedCandidate[] = rawRoutes.map((route) => {
    const samples = samplePolyline(route.coordinates, 100);
    const pointDetails = samples.map((p) =>
      evaluatePointRisk(
        p,
        nightFactor,
        allRiskZones,
        allLightingZones,
        allActivityZones,
        allReports,
        allFacilities
      )
    );

    const pointRisks = pointDetails.map((d) => d.pointRisk);
    const meanRisk = pointRisks.reduce((a, b) => a + b, 0) / (pointRisks.length || 1);

    // 90th percentile
    const sortedRisks = [...pointRisks].sort((a, b) => a - b);
    const p90Idx = Math.floor(sortedRisks.length * 0.9);
    const p90Risk = sortedRisks[p90Idx] ?? meanRisk;

    const routeRisk = 0.6 * meanRisk + 0.4 * p90Risk;
    const safetyScore = Math.round(100 * (1 - routeRisk));

    // Data confidence: fraction of points with nearby data
    const dataPointsCount = pointDetails.filter((d) => d.hasData).length;
    const dataConfidence = Number((dataPointsCount / (pointDetails.length || 1)).toFixed(2));

    // Averages for factors
    const factors: RouteFactors = {
      incidentRisk: Number((pointDetails.reduce((s, d) => s + d.incidentRisk, 0) / (pointDetails.length || 1)).toFixed(2)),
      lightingRisk: Number((pointDetails.reduce((s, d) => s + d.lightingRisk, 0) / (pointDetails.length || 1)).toFixed(2)),
      isolationRisk: Number((pointDetails.reduce((s, d) => s + d.isolationRisk, 0) / (pointDetails.length || 1)).toFixed(2)),
      reportRisk: Number((pointDetails.reduce((s, d) => s + d.reportRisk, 0) / (pointDetails.length || 1)).toFixed(2)),
      coverage: Number((pointDetails.reduce((s, d) => s + d.coverage, 0) / (pointDetails.length || 1)).toFixed(2)),
      nightFactor,
    };

    // Build coloured polyline segment risks (split into segments of 3 samples ~ 300m)
    const segmentRisks: RouteSegmentRisk[] = [];
    const stepSize = Math.max(2, Math.floor(route.coordinates.length / 10));

    for (let i = 0; i < route.coordinates.length - 1; i += stepSize) {
      const endIdx = Math.min(i + stepSize, route.coordinates.length - 1);
      const midCoordIdx = Math.floor((i + endIdx) / 2);
      const midCoord = route.coordinates[midCoordIdx];
      const detail = evaluatePointRisk(
        { lat: midCoord[1], lng: midCoord[0] },
        nightFactor,
        allRiskZones,
        allLightingZones,
        allActivityZones,
        allReports,
        allFacilities
      );

      const riskLevel = detail.pointRisk >= 0.55 ? 'danger' : detail.pointRisk >= 0.3 ? 'caution' : 'safe';
      segmentRisks.push({
        startIdx: i,
        endIdx,
        riskLevel,
        riskScore: Number(detail.pointRisk.toFixed(2)),
        dominantFactor: detail.dominantFactor,
      });
    }

    // Risky stretches: any 200m+ window (2 consecutive samples) whose mean pointRisk >= 0.6
    const riskySegments: RiskyStretch[] = [];
    let curStretchLen = 0;
    let curFactor = '';
    let stretchStartCoord: [number, number] = [0, 0];

    for (let i = 0; i < pointDetails.length; i++) {
      if (pointDetails[i].pointRisk >= 0.58) {
        if (curStretchLen === 0) {
          stretchStartCoord = [samples[i].lng, samples[i].lat];
          curFactor = pointDetails[i].dominantFactor;
        }
        curStretchLen += 100;
      } else {
        if (curStretchLen >= 200) {
          riskySegments.push({
            distanceM: curStretchLen,
            description: `~${curStretchLen} m ${curFactor} stretch`,
            factor: curFactor,
            startCoordinate: stretchStartCoord,
          });
        }
        curStretchLen = 0;
      }
    }
    if (curStretchLen >= 200) {
      riskySegments.push({
        distanceM: curStretchLen,
        description: `~${curStretchLen} m ${curFactor} stretch`,
        factor: curFactor,
        startCoordinate: stretchStartCoord,
      });
    }

    return {
      raw: route,
      safetyScore,
      routeRisk,
      factors,
      riskySegments: riskySegments.slice(0, 3),
      segmentRisks,
      dataConfidence,
    };
  });

  // Ranking calculation:
  // composite = w * normTime + (1 - w) * routeRisk_norm
  // w = 1 - safetyPriority / 100 (slider default 60 -> w = 0.4)
  const w = 1 - safetyPriority / 100;

  const minDuration = Math.min(...evaluated.map((r) => r.raw.durationS));
  const maxDuration = Math.max(...evaluated.map((r) => r.raw.durationS));
  const minRisk = Math.min(...evaluated.map((r) => r.routeRisk));
  const maxRisk = Math.max(...evaluated.map((r) => r.routeRisk));

  // Determine Fastest and Safest
  let fastestIdx = 0;
  let safestIdx = 0;
  let minComposite = Infinity;
  let recommendedIdx = 0;

  const composites: number[] = [];

  for (let i = 0; i < evaluated.length; i++) {
    const dur = evaluated[i].raw.durationS;
    const risk = evaluated[i].routeRisk;

    if (dur < evaluated[fastestIdx].raw.durationS) fastestIdx = i;
    if (evaluated[i].safetyScore > evaluated[safestIdx].safetyScore) safestIdx = i;

    const normTime = maxDuration === minDuration ? 0 : (dur - minDuration) / (maxDuration - minDuration);
    const normRisk = maxRisk === minRisk ? 0 : (risk - minRisk) / (maxRisk - minRisk);

    const composite = w * normTime + (1 - w) * normRisk;
    composites.push(composite);

    if (composite < minComposite) {
      minComposite = composite;
      recommendedIdx = i;
    }
  }

  // Construct final RouteOption list
  return evaluated.map((cand, idx) => {
    const badges: ('Fastest' | 'Safest' | 'Recommended')[] = [];
    if (idx === recommendedIdx) badges.push('Recommended');
    if (idx === safestIdx && !badges.includes('Safest')) badges.push('Safest');
    if (idx === fastestIdx && !badges.includes('Fastest')) badges.push('Fastest');

    return {
      id: `route_${idx + 1}`,
      name: idx === 0 ? 'Main Route' : idx === 1 ? 'Alternate Route A' : 'Alternate Route B',
      geometry: {
        type: 'LineString',
        coordinates: cand.raw.coordinates,
      },
      distanceM: cand.raw.distanceM,
      durationS: cand.raw.durationS,
      safetyScore: cand.safetyScore,
      badges,
      factors: cand.factors,
      riskySegments: cand.riskySegments,
      segmentRisks: cand.segmentRisks,
      dataConfidence: cand.dataConfidence,
      isLowDataConfidence: cand.dataConfidence < 0.4,
    };
  });
}
