import { describe, it, expect } from 'vitest';
import {
  haversineDistance,
  getBoundingBox,
  pointToSegmentDistance,
  pointToPolylineDistance,
  samplePolyline,
  polylineLength
} from '../db/geo.js';

describe('Geo Helpers', () => {
  it('calculates accurate Haversine distance between known coordinates', () => {
    // Delhi Connaught Place to India Gate (~2.1 km)
    const cp = { lat: 28.6315, lng: 77.2167 };
    const indiaGate = { lat: 28.6129, lng: 77.2295 };
    const distance = haversineDistance(cp.lat, cp.lng, indiaGate.lat, indiaGate.lng);

    expect(distance).toBeGreaterThan(2000);
    expect(distance).toBeLessThan(2500);
  });

  it('computes bounding box containing target radius', () => {
    const center = { lat: 28.6139, lng: 77.2090 };
    const bbox = getBoundingBox(center.lat, center.lng, 1000);

    expect(bbox.minLat).toBeLessThan(center.lat);
    expect(bbox.maxLat).toBeGreaterThan(center.lat);
    expect(bbox.minLng).toBeLessThan(center.lng);
    expect(bbox.maxLng).toBeGreaterThan(center.lng);

    // Distance to north boundary should be ~1000m
    const northDist = haversineDistance(center.lat, center.lng, bbox.maxLat, center.lng);
    expect(Math.abs(northDist - 1000)).toBeLessThan(10);
  });

  it('measures point-to-polyline minimum distance correctly', () => {
    const polyline: [number, number][] = [
      [77.2000, 28.6000],
      [77.2000, 28.6100],
      [77.2000, 28.6200],
    ];

    // Point directly on the line
    const onLine = { lat: 28.6050, lng: 77.2000 };
    const distOnLine = pointToPolylineDistance(onLine, polyline);
    expect(distOnLine).toBeLessThan(1);

    // Point 100m east
    const offLine = { lat: 28.6050, lng: 77.2010 };
    const distOffLine = pointToPolylineDistance(offLine, polyline);
    expect(distOffLine).toBeGreaterThan(80);
    expect(distOffLine).toBeLessThan(120);
  });

  it('samples a polyline every 100 meters', () => {
    const polyline: [number, number][] = [
      [77.2000, 28.6000],
      [77.2000, 28.6050], // ~556 meters north
    ];
    const totalLen = polylineLength(polyline);
    expect(totalLen).toBeGreaterThan(500);

    const samples = samplePolyline(polyline, 100);
    expect(samples.length).toBeGreaterThanOrEqual(6);

    // Check that distance between consecutive samples is approximately 100m
    for (let i = 0; i < samples.length - 2; i++) {
      const step = haversineDistance(
        samples[i].lat,
        samples[i].lng,
        samples[i + 1].lat,
        samples[i + 1].lng
      );
      expect(Math.abs(step - 100)).toBeLessThan(15);
    }
  });
});
