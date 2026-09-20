import { db } from '../db/index.js';
import { haversineDistance, getBoundingBox } from '../db/geo.js';
import { FacilityRow } from '@raksha/shared';

const overpassCache = new Map<string, { facilities: FacilityRow[]; expiresAt: number }>();

export async function fetchNearbyFacilities(
  lat: number,
  lng: number,
  radiusMeters = 8000,
  types: string[] = ['police', 'hospital', 'safe_place']
): Promise<FacilityRow[]> {
  const cellKey = `${(Math.round(lat * 50) / 50).toFixed(2)},${(Math.round(lng * 50) / 50).toFixed(2)}`;
  const cached = overpassCache.get(cellKey);
  if (cached && cached.expiresAt > Date.now()) {
    return filterFacilities(cached.facilities, lat, lng, radiusMeters, types);
  }

  // First query seeded / cached facilities from SQLite
  const bbox = getBoundingBox(lat, lng, radiusMeters);
  const localFacilities = db.prepare(`
    SELECT * FROM facilities
    WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
  `).all(bbox.minLat, bbox.maxLat, bbox.minLng, bbox.maxLng) as FacilityRow[];

  // If we already have seeded facilities in range, use them
  if (localFacilities.length >= 10) {
    overpassCache.set(cellKey, {
      facilities: localFacilities,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });
    return filterFacilities(localFacilities, lat, lng, radiusMeters, types);
  }

  // Try Overpass API with 5-second timeout
  const query = `[out:json][timeout:5];(
    nwr["amenity"="police"](around:${radiusMeters},${lat},${lng});
    nwr["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
    nwr["amenity"="pharmacy"]["opening_hours"="24/7"](around:${radiusMeters},${lat},${lng});
    nwr["amenity"="fuel"](around:${radiusMeters},${lat},${lng});
    nwr["railway"="station"](around:${radiusMeters},${lat},${lng});
  );out center 50;`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = (await res.json()) as any;
      const parsedFacilities: FacilityRow[] = [];

      for (const el of data.elements || []) {
        const itemLat = el.lat || el.center?.lat;
        const itemLng = el.lon || el.center?.lon;
        if (!itemLat || !itemLng) continue;

        let type: 'police' | 'hospital' | 'safe_place' = 'safe_place';
        if (el.tags?.amenity === 'police') type = 'police';
        else if (el.tags?.amenity === 'hospital') type = 'hospital';

        const name = el.tags?.name || (type === 'police' ? 'Police Station' : type === 'hospital' ? 'Hospital' : 'Safe Haven');
        const phone = el.tags?.phone || (type === 'police' ? '112' : type === 'hospital' ? '108' : '112');

        parsedFacilities.push({
          id: `op_${el.id}`,
          type,
          name,
          lat: itemLat,
          lng: itemLng,
          phone,
          is_24x7: el.tags?.opening_hours === '24/7' ? 1 : 0,
          is_demo: 0,
          source: 'overpass',
        });
      }

      if (parsedFacilities.length > 0) {
        overpassCache.set(cellKey, {
          facilities: parsedFacilities,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        });
        return filterFacilities(parsedFacilities, lat, lng, radiusMeters, types);
      }
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('Overpass fetch failed, falling back to local seeded facilities:', (err as Error).message);
  }

  // Fallback: Return all seeded facilities in SQLite
  const allFacilities = db.prepare(`SELECT * FROM facilities`).all() as FacilityRow[];
  return filterFacilities(allFacilities, lat, lng, radiusMeters, types);
}

function filterFacilities(
  facilities: FacilityRow[],
  lat: number,
  lng: number,
  radiusMeters: number,
  types: string[]
): FacilityRow[] {
  return facilities
    .map((fac) => ({
      ...fac,
      distanceM: haversineDistance(lat, lng, fac.lat, fac.lng),
    }))
    .filter((fac) => fac.distanceM <= radiusMeters && types.includes(fac.type))
    .sort((a, b) => a.distanceM - b.distanceM);
}
