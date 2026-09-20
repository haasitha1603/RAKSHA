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
