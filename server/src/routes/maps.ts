import { Router, Request, Response } from 'express';
import { geocode, reverseGeocode } from '../services/nominatim.js';
import { fetchRoutes } from '../services/routing.js';
import { fetchNearbyFacilities } from '../services/overpass.js';
import { scoreAndRankRoutes } from '../engine/routeRisk.js';
import { validateBody } from '../middleware/validate.js';
import { geocodeRateLimiter } from '../middleware/rateLimit.js';
import { planRouteSchema } from '@raksha/shared';
import { db } from '../db/index.js';

export const mapsRouter = Router();

mapsRouter.get('/geocode', geocodeRateLimiter, async (req: Request, res: Response) => {
  const q = req.query.q as string;
  if (!q || q.length < 2) {
    res.json({ results: [] });
    return;
  }
  const results = await geocode(q);
  res.json({ results });
});

mapsRouter.get('/reverse', geocodeRateLimiter, async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: { code: 'INVALID_COORDS', message: 'Valid lat and lng required' } });
    return;
  }
  const label = await reverseGeocode(lat, lng);
  res.json({ label });
});

mapsRouter.post('/routes/plan', validateBody(planRouteSchema), async (req: Request, res: Response) => {
  const { origin, destination, mode, departAt, safetyPriority } = req.body;

  const rawRoutes = await fetchRoutes(
    { lat: origin.lat, lng: origin.lng },
    { lat: destination.lat, lng: destination.lng },
    mode
  );

  const departDate = departAt ? new Date(departAt) : new Date();
  const scoredRoutes = scoreAndRankRoutes(rawRoutes, departDate, safetyPriority);

  res.json({ routes: scoredRoutes });
});

mapsRouter.get('/facilities/nearby', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radius = req.query.radius ? parseInt(req.query.radius as string) : 5000;
  const types = req.query.types ? (req.query.types as string).split(',') : ['police', 'hospital', 'safe_place'];

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: { code: 'INVALID_COORDS', message: 'Valid lat and lng required' } });
    return;
  }

  const facilities = await fetchNearbyFacilities(lat, lng, radius, types);
  res.json({ facilities });
});

mapsRouter.get('/safety/layers', (req: Request, res: Response) => {
  // Query incident zones, lighting zones, activity zones, and verified reports
  const riskZones = db.prepare(`SELECT * FROM risk_zones`).all();
  const lightingZones = db.prepare(`SELECT * FROM lighting_zones`).all();
  const activityZones = db.prepare(`SELECT * FROM activity_zones`).all();
  const reports = db.prepare(`SELECT * FROM reports WHERE status != 'expired' AND status != 'removed'`).all();
  const facilities = db.prepare(`SELECT * FROM facilities`).all();

  res.json({
    riskZones,
    lightingZones,
    activityZones,
    reports,
    facilities,
  });
});

mapsRouter.get('/safety/point', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: { code: 'INVALID_COORDS', message: 'Valid lat and lng required' } });
    return;
  }

  // Find nearby facilities within 1500m
  const facilities = await fetchNearbyFacilities(lat, lng, 1500, ['police', 'hospital', 'safe_place']);
  const openFacilities = facilities.filter(f => f.is_24x7);

  // Lighting zones near point
  const lightingZones = db.prepare(`
    SELECT level, (
      (lat - ?) * (lat - ?) + (lng - ?) * (lng - ?)
    ) as dist_sq FROM lighting_zones ORDER BY dist_sq ASC LIMIT 3
  `).all(lat, lat, lng, lng) as { level: number; dist_sq: number }[];

  const avgLighting = lightingZones.length > 0
    ? lightingZones.reduce((acc, z) => acc + z.level, 0) / lightingZones.length
    : 0.6;

  // Nearby risk zones
  const nearbyRisks = db.prepare(`
    SELECT category, severity, (
      (lat - ?) * (lat - ?) + (lng - ?) * (lng - ?)
    ) as dist_sq FROM risk_zones WHERE dist_sq < 0.0001 ORDER BY severity DESC LIMIT 2
  `).all(lat, lat, lng, lng) as { category: string; severity: number }[];

  // Calculate score
  let score = 80;
  if (avgLighting > 0.7) score += 8;
  else if (avgLighting < 0.4) score -= 15;

  if (openFacilities.length >= 2) score += 6;
  else if (openFacilities.length === 1) score += 3;

  if (nearbyRisks.length > 0) score -= (nearbyRisks[0].severity * 5);

  score = Math.max(20, Math.min(96, Math.round(score)));

  let label: 'High' | 'Moderate' | 'Low' = 'Moderate';
  if (score >= 75) label = 'High';
  else if (score < 50) label = 'Low';

  const lightDesc = avgLighting >= 0.65 ? 'Well-lit' : avgLighting >= 0.4 ? 'Moderate lighting' : 'Dim lighting';
  const facDesc = openFacilities.length > 0 ? `${openFacilities.length} open safe place${openFacilities.length > 1 ? 's' : ''} nearby` : 'Limited nearby facilities';
  const summary = `${lightDesc}, ${facDesc}`;

  res.json({
    score,
    label,
    lighting: avgLighting,
    lightingDesc: lightDesc,
    openFacilitiesCount: openFacilities.length,
    summary,
  });
});
