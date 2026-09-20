/**
 * Geometric and spatial utility functions for route analysis and spatial queries
 */

const EARTH_RADIUS_METERS = 6371000;

export interface LatLng {
  lat: number;
  lng: number;
}

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calculates great-circle distance between two points in meters using Haversine formula
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Computes bounding box for fast spatial filtering in SQLite
 */
export function getBoundingBox(
  lat: number,
  lng: number,
  radiusMeters: number
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const dLat = (radiusMeters / EARTH_RADIUS_METERS) * (180 / Math.PI);
  const dLng =
    ((radiusMeters / EARTH_RADIUS_METERS) * (180 / Math.PI)) /
    Math.cos(toRadians(lat));

  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLng: lng - dLng,
    maxLng: lng + dLng,
  };
}

/**
 * Distance from point P to line segment AB in meters
 */
export function pointToSegmentDistance(
  p: LatLng,
  a: LatLng,
  b: LatLng
): number {
  const segmentLength = haversineDistance(a.lat, a.lng, b.lat, b.lng);
  if (segmentLength === 0) {
    return haversineDistance(p.lat, p.lng, a.lat, a.lng);
  }

  // Equirectangular approximation for projecting onto segment
  const x = (toRadians(b.lng - a.lng) * Math.cos(toRadians((a.lat + b.lat) / 2)));
  const y = toRadians(b.lat - a.lat);
  const dx = (toRadians(p.lng - a.lng) * Math.cos(toRadians((a.lat + p.lat) / 2)));
  const dy = toRadians(p.lat - a.lat);

  const dot = dx * x + dy * y;
  const lenSq = x * x + y * y;
  let param = -1;
  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let nearestLat: number;
  let nearestLng: number;

  if (param < 0) {
    nearestLat = a.lat;
    nearestLng = a.lng;
  } else if (param > 1) {
    nearestLat = b.lat;
    nearestLng = b.lng;
  } else {
    nearestLat = a.lat + param * (b.lat - a.lat);
    nearestLng = a.lng + param * (b.lng - a.lng);
  }

  return haversineDistance(p.lat, p.lng, nearestLat, nearestLng);
}

/**
 * Computes shortest distance from point to a polyline (array of [lng, lat])
 */
export function pointToPolylineDistance(
  p: LatLng,
  coordinates: [number, number][]
): number {
  if (coordinates.length === 0) return Infinity;
  if (coordinates.length === 1) {
    return haversineDistance(p.lat, p.lng, coordinates[0][1], coordinates[0][0]);
  }

  let minDistance = Infinity;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const a: LatLng = { lat: coordinates[i][1], lng: coordinates[i][0] };
    const b: LatLng = { lat: coordinates[i + 1][1], lng: coordinates[i + 1][0] };
    const dist = pointToSegmentDistance(p, a, b);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  return minDistance;
}

/**
 * Total length of a polyline in meters
 */
export function polylineLength(coordinates: [number, number][]): number {
  let total = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    total += haversineDistance(
      coordinates[i][1],
      coordinates[i][0],
      coordinates[i + 1][1],
      coordinates[i + 1][0]
    );
  }
  return total;
}

/**
 * Samples a polyline every `intervalM` meters (default 100m)
 * Always includes the start point and the end point
 */
export function samplePolyline(
  coordinates: [number, number][],
  intervalM = 100
): LatLng[] {
  if (coordinates.length === 0) return [];
  if (coordinates.length === 1) {
    return [{ lat: coordinates[0][1], lng: coordinates[0][0] }];
  }

  const samples: LatLng[] = [{ lat: coordinates[0][1], lng: coordinates[0][0] }];
  let accumulatedDistance = 0;
  let targetDistance = intervalM;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const p1: LatLng = { lat: coordinates[i][1], lng: coordinates[i][0] };
    const p2: LatLng = { lat: coordinates[i + 1][1], lng: coordinates[i + 1][0] };
    const segmentDist = haversineDistance(p1.lat, p1.lng, p2.lat, p2.lng);

    if (segmentDist === 0) continue;

    while (accumulatedDistance + segmentDist >= targetDistance) {
      const remainingToTarget = targetDistance - accumulatedDistance;
      const ratio = remainingToTarget / segmentDist;
      const interpLat = p1.lat + ratio * (p2.lat - p1.lat);
      const interpLng = p1.lng + ratio * (p2.lng - p1.lng);

      samples.push({ lat: interpLat, lng: interpLng });
      targetDistance += intervalM;
    }

    accumulatedDistance += segmentDist;
  }

  // Ensure last point is included if not very close to previous sample
  const lastCoord = coordinates[coordinates.length - 1];
  const lastSample = samples[samples.length - 1];
  const endDist = haversineDistance(lastSample.lat, lastSample.lng, lastCoord[1], lastCoord[0]);
  if (endDist > 20) {
    samples.push({ lat: lastCoord[1], lng: lastCoord[0] });
  }

  return samples;
}
