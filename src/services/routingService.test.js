import { describe, it, expect } from 'vitest';
import { calculateRoute, getStepIndexForCoordinate } from './routingService';

describe('Routing Service', () => {
  const start = [-122.4194, 37.7749]; // SF Market St
  const end = [-122.4089, 37.7836];   // Union Square

  it('should calculate or synthesize route coordinates between two points', async () => {
    const route = await calculateRoute(start, end, 'driving');
    expect(route).toBeDefined();
    expect(Array.isArray(route.coordinates)).toBe(true);
    expect(route.coordinates.length).toBeGreaterThan(1);
    expect(route.distanceMeters).toBeGreaterThan(0);
    expect(route.durationSeconds).toBeGreaterThan(0);
    expect(route.mode).toBe('driving');
  });

  it('should support walking and cycling profiles', async () => {
    const walkRoute = await calculateRoute(start, end, 'walking');
    expect(walkRoute.mode).toBe('walking');
    expect(walkRoute.durationSeconds).toBeGreaterThan(0);

    const bikeRoute = await calculateRoute(start, end, 'cycling');
    expect(bikeRoute.mode).toBe('cycling');
  });

  it('should include turn-by-turn guidance steps', async () => {
    const route = await calculateRoute(start, end, 'driving');
    expect(Array.isArray(route.steps)).toBe(true);
    expect(route.steps.length).toBeGreaterThan(0);
    expect(route.steps[0]).toHaveProperty('instruction');
  });

  describe('getStepIndexForCoordinate', () => {
    // 101 evenly spaced points heading north; 4 steps covering 10/40/30/20 % of the distance.
    const coordinates = Array.from({ length: 101 }, (_, i) => [-122.4, 37.7 + i * 0.001]);
    const steps = [10, 40, 30, 20].map((distance, i) => ({ id: `s${i}`, distance }));
    const route = { coordinates, steps };

    it('maps GPS progress to the maneuver step, not the coordinate index', () => {
      expect(getStepIndexForCoordinate(route, 0)).toBe(0);
      expect(getStepIndexForCoordinate(route, 5)).toBe(0);
      expect(getStepIndexForCoordinate(route, 20)).toBe(1);
      expect(getStepIndexForCoordinate(route, 60)).toBe(2);
      expect(getStepIndexForCoordinate(route, 90)).toBe(3);
      expect(getStepIndexForCoordinate(route, 100)).toBe(3);
    });

    it('never returns an out-of-range step', () => {
      expect(getStepIndexForCoordinate(route, 5000)).toBe(3);
      expect(getStepIndexForCoordinate(route, -3)).toBe(0);
      expect(getStepIndexForCoordinate({ coordinates, steps: [] }, 50)).toBe(0);
      expect(getStepIndexForCoordinate(null, 10)).toBe(0);
    });
  });
});
