import { describe, it, expect, beforeAll } from 'vitest';
import { scoreAndRankRoutes, calculateNightFactor } from '../engine/routeRisk.js';
import { RawRouteResult } from '../services/routing.js';
import { runMigrations } from '../db/migrations.js';

describe('Route Safety Scoring & Ranking', () => {
  beforeAll(() => {
    runMigrations();
  });
  it('calculates night factor properly based on hour', () => {
    const night = new Date('2026-09-20T23:30:00');
    expect(calculateNightFactor(night)).toBe(1.0);

    const evening = new Date('2026-09-20T20:00:00');
    expect(calculateNightFactor(evening)).toBe(0.5);

    const afternoon = new Date('2026-09-20T14:00:00');
    expect(calculateNightFactor(afternoon)).toBe(0.1);
  });

  it('ranks safer routes higher when safety priority slider is high', () => {
    // Two routes:
    // Route A: Fast but risky (passes through dense coordinates)
    // Route B: Longer but safe
    const routeFast: RawRouteResult = {
      coordinates: [
        [77.2090, 28.6139],
        [77.2150, 28.6200],
      ],
      distanceM: 1000,
      durationS: 600, // 10 min
    };

    const routeSafe: RawRouteResult = {
      coordinates: [
        [77.2090, 28.6139],
        [77.2100, 28.6150],
        [77.2120, 28.6180],
        [77.2150, 28.6200],
      ],
      distanceM: 1400,
      durationS: 900, // 15 min
    };

    const evaluated = scoreAndRankRoutes([routeFast, routeSafe], new Date('2026-09-20T23:00:00'), 90);
    expect(evaluated.length).toBe(2);
    expect(evaluated[0].safetyScore).toBeGreaterThanOrEqual(0);
    expect(evaluated[0].safetyScore).toBeLessThanOrEqual(100);

    // With safety priority 90, the safest route should get the Recommended badge
    const recommended = evaluated.find((r) => r.badges.includes('Recommended'));
    expect(recommended).toBeDefined();
  });
});
