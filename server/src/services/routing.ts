import { TravelMode } from '@raksha/shared';
import { haversineDistance, toRadians } from '../db/geo.js';

export interface RawRouteResult {
  coordinates: [number, number][]; // [lng, lat]
  distanceM: number;
  durationS: number;
}

const routeCache = new Map<string, { routes: RawRouteResult[]; expiresAt: number }>();

function calculateSharedGeometryPercent(
  coordsA: [number, number][],
  coordsB: [number, number][]
): number {
  if (coordsA.length === 0 || coordsB.length === 0) return 0;
  let sharedCount = 0;
  const sampleA = coordsA.filter((_, i) => i % 3 === 0);

  for (const ptA of sampleA) {
    const isClose = coordsB.some(
      (ptB) => haversineDistance(ptA[1], ptA[0], ptB[1], ptB[0]) < 35
    );
    if (isClose) sharedCount++;
  }
  return sharedCount / sampleA.length;
}

function generateCurvedFallbackRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  arcFactor: number,
  mode: TravelMode
): RawRouteResult {
  const steps = 40;
  const coords: [number, number][] = [];

  const dx = end.lng - start.lng;
  const dy = end.lat - start.lat;
  const perpX = -dy * arcFactor;
  const perpY = dx * arcFactor;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Quadratic Bezier interpolation with midpoint offset
    const bump = 4 * t * (1 - t);
    const lng = start.lng + t * dx + bump * perpX;
    const lat = start.lat + t * dy + bump * perpY;
    coords.push([Number(lng.toFixed(6)), Number(lat.toFixed(6))]);
  }

  let totalDist = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    totalDist += haversineDistance(coords[i][1], coords[i][0], coords[i + 1][1], coords[i + 1][0]);
  }

  const speedMps = mode === 'walk' ? 1.3 : mode === 'two-wheeler' ? 4.5 : 9.0;
  const durationS = Math.round(totalDist / speedMps);

  return {
    coordinates: coords,
    distanceM: Math.round(totalDist),
    durationS,
  };
}

export async function fetchRoutes(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  mode: TravelMode = 'walk'
): Promise<RawRouteResult[]> {
  const cacheKey = `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}-${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}-${mode}`;
  const cached = routeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.routes;
  }

  const modeEndpointMap: Record<TravelMode, { server: string; profile: string }> = {
    walk: { server: 'https://routing.openstreetmap.de/routed-foot', profile: 'foot' },
    'two-wheeler': { server: 'https://routing.openstreetmap.de/routed-bike', profile: 'bike' },
    car: { server: 'https://routing.openstreetmap.de/routed-car', profile: 'driving' },
    transit: { server: 'https://routing.openstreetmap.de/routed-foot', profile: 'foot' },
  };

  const primaryConfig = modeEndpointMap[mode] || modeEndpointMap.walk;
  const coordString = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;

  let routes: RawRouteResult[] = [];

  // Attempt 1: Primary routing server
  try {
    const primaryUrl = `${primaryConfig.server}/route/v1/${primaryConfig.profile}/${coordString}?alternatives=true&overview=full&geometries=geojson&steps=true`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(primaryUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = (await res.json()) as any;
      if (data.routes && data.routes.length > 0) {
        routes = data.routes.map((r: any) => ({
          coordinates: r.geometry.coordinates,
          distanceM: Math.round(r.distance),
          durationS: Math.round(r.duration),
        }));
      }
    }
  } catch (err) {
    // Attempt 2: Fallback to router.project-osrm.org
    try {
      const fallbackUrl = `https://router.project-osrm.org/route/v1/driving/${coordString}?alternatives=true&overview=full&geometries=geojson&steps=true`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(fallbackUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.routes && data.routes.length > 0) {
          routes = data.routes.map((r: any) => {
            const speed = mode === 'walk' ? 1.3 : mode === 'two-wheeler' ? 4.5 : r.distance / r.duration;
            return {
              coordinates: r.geometry.coordinates,
              distanceM: Math.round(r.distance),
              durationS: Math.round(r.distance / speed),
            };
          });
        }
      }
    } catch {}
  }

  // Attempt via-point helper if < 3 routes found
  if (routes.length > 0 && routes.length < 3) {
    const midLat = (origin.lat + destination.lat) / 2;
    const midLng = (origin.lng + destination.lng) / 2;
    const dLat = destination.lat - origin.lat;
    const dLng = destination.lng - origin.lng;

    // Perpendicular offsets ~600m
    const perpLat1 = midLat - (dLng * 600) / 111320;
    const perpLng1 = midLng + (dLat * 600) / (111320 * Math.cos(toRadians(midLat)));
    const perpLat2 = midLat + (dLng * 600) / 111320;
    const perpLng2 = midLng - (dLat * 600) / (111320 * Math.cos(toRadians(midLat)));

    const viaPoints = [
      { lat: perpLat1, lng: perpLng1 },
      { lat: perpLat2, lng: perpLng2 },
    ];

    for (const via of viaPoints) {
      if (routes.length >= 3) break;
      try {
        const viaCoordString = `${origin.lng},${origin.lat};${via.lng.toFixed(6)},${via.lat.toFixed(6)};${destination.lng},${destination.lat}`;
        const viaUrl = `${primaryConfig.server}/route/v1/${primaryConfig.profile}/${viaCoordString}?overview=full&geometries=geojson`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(viaUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const data = (await res.json()) as any;
          if (data.routes && data.routes[0]) {
            const candidate: RawRouteResult = {
              coordinates: data.routes[0].geometry.coordinates,
              distanceM: Math.round(data.routes[0].distance),
              durationS: Math.round(data.routes[0].duration),
            };

            // Deduplicate if shared geometry > 85%
            const isDuplicate = routes.some(
              (existing) => calculateSharedGeometryPercent(existing.coordinates, candidate.coordinates) > 0.85
            );
            if (!isDuplicate) {
              routes.push(candidate);
            }
          }
        }
      } catch {}
    }
  }

  // Final fallback: If external routing is completely unavailable, generate 3 clean, curved paths
  if (routes.length === 0) {
    routes = [
      generateCurvedFallbackRoute(origin, destination, 0.05, mode),
      generateCurvedFallbackRoute(origin, destination, 0.35, mode),
      generateCurvedFallbackRoute(origin, destination, -0.30, mode),
    ];
  } else while (routes.length < 3) {
    // Fill up to 3 candidate routes with distinct arc variants
    const arc = routes.length === 1 ? 0.35 : -0.35;
    routes.push(generateCurvedFallbackRoute(origin, destination, arc, mode));
  }

  // Cache valid routes for 24h
  routeCache.set(cacheKey, {
    routes,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });

  return routes;
}
