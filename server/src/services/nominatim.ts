import { config } from '../config.js';

interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
}

// 24-hour in-memory cache
const geocodeCache = new Map<string, { data: GeocodeResult[]; expiresAt: number }>();
const reverseCache = new Map<string, { label: string; expiresAt: number }>();

// 1 rps request queue
let lastRequestTime = 0;
async function rateLimitQueue(): Promise<void> {
  const now = Date.now();
  const waitMs = Math.max(0, 1000 - (now - lastRequestTime));
  lastRequestTime = now + waitMs;
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

export async function geocode(query: string): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const cacheKey = q.toLowerCase();
  const cached = geocodeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  await rateLimitQueue();

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=5`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': config.NOMINATIM_USER_AGENT,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Nominatim error: ${res.status}`);
    }

    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    const results: GeocodeResult[] = data.map((item) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      label: item.display_name,
    }));

    geocodeCache.set(cacheKey, {
      data: results,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    return results;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`Geocode failed for "${q}", returning fallback:`, (err as Error).message);

    // Fallback: return mock match around DEMO_CENTER
    return [
      {
        lat: config.DEMO_CENTER_LAT,
        lng: config.DEMO_CENTER_LNG,
        label: `${q} (Approximate area, offline fallback)`,
      },
    ];
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const roundedKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = reverseCache.get(roundedKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.label;
  }

  await rateLimitQueue();

  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': config.NOMINATIM_USER_AGENT,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Status ${res.status}`);

    const data = (await res.json()) as { display_name?: string };
    const label = data.display_name || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

    reverseCache.set(roundedKey, {
      label,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    return label;
  } catch {
    clearTimeout(timeoutId);
    return `Near (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }
}
