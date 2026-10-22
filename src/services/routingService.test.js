import { describe, it, expect } from 'vitest';
import { calculateRoute } from './routingService';

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
});
