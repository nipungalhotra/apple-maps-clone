import { describe, it, expect } from 'vitest';
import { generateLearnerZonesForLocation, calculateDistanceKm } from './learnerEngine';

describe('Learner Engine Service', () => {
  const sfCenter = [-122.4194, 37.7749];

  it('should generate localized practice zones around coordinate', () => {
    const zones = generateLearnerZonesForLocation(sfCenter);
    expect(Array.isArray(zones)).toBe(true);
    expect(zones.length).toBeGreaterThan(0);

    const first = zones[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('safetyScore');
    expect(first.safetyScore).toBeGreaterThanOrEqual(80);
    expect(Array.isArray(first.coordinates)).toBe(true);
  });

  it('should calculate geographic distance in km between coordinates', () => {
    const coordA = [-122.4194, 37.7749];
    const coordB = [-122.4194, 37.7849]; // approx 1.11 km north
    const dist = calculateDistanceKm(coordA, coordB);
    expect(dist).toBeGreaterThan(1.0);
    expect(dist).toBeLessThan(1.3);
  });
});
