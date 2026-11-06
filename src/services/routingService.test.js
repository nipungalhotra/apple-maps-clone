import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  calculateRoute, calculatePracticeLoop, getStepIndexForCoordinate, formatDistance,
  usesImperialUnits, offsetPoint, RouteUnavailableError
} from './routingService';

const loopResponse = () => new Response(JSON.stringify({
  code: 'Ok',
  routes: [{
    distance: 4500, duration: 600,
    geometry: { type: 'LineString', coordinates: [[0, 0], [0.01, 0], [0, 0]] },
    legs: [0, 1, 2, 3].map((l) => ({
      steps: [
        { distance: 100, duration: 10, name: '', maneuver: { type: 'depart', location: [0, 0] } },
        { distance: 900, duration: 120, name: '', maneuver: { type: 'turn', modifier: 'right', location: [0, 0] } },
        { distance: 0, duration: 0, name: '', maneuver: { type: 'arrive', location: [0, 0] } }
      ]
    }))
  }]
}), { status: 200, headers: { 'Content-Type': 'application/json' } });

const osrmResponse = (legs = 1) => new Response(JSON.stringify({
  code: 'Ok',
  routes: [{
    distance: 3300, duration: 360,
    geometry: { type: 'LineString', coordinates: [[73.877, 29.904], [73.88, 29.91], [73.87, 29.93]] },
    legs: Array.from({ length: legs }, (_, l) => ({
      steps: [
        { distance: 170, duration: 20, name: 'Medical College Road', maneuver: { type: 'depart', location: [73.877, 29.904] } },
        { distance: 980, duration: 90, name: '', maneuver: { type: 'turn', modifier: 'right', location: [73.88, 29.91] } }
      ].map((s) => ({ ...s, name: s.name || '' }))
    }))
  }]
}), { status: 200, headers: { 'Content-Type': 'application/json' } });

afterEach(() => vi.restoreAllMocks());

describe('Routing Service', () => {
  const start = [73.8772, 29.9038]; // Sri Ganganagar
  const end = [73.86, 29.93];

  it('returns the routing service route with turn-by-turn steps', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(osrmResponse());
    const route = await calculateRoute(start, end, 'driving');
    expect(String(spy.mock.calls[0][0])).toContain('/car/73.877200,29.903800;73.860000,29.930000');
    expect(route.distanceMeters).toBe(3300);
    expect(route.steps[0].instruction).toBe('Head towards your destination');
    expect(route.steps[1].instruction).toBe('Turn right');
  });

  it('uses the walking and cycling profiles', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => osrmResponse());
    expect((await calculateRoute(start, end, 'walking')).mode).toBe('walking');
    expect(String(spy.mock.calls[0][0])).toContain('/foot/');
    await calculateRoute(start, end, 'cycling');
    expect(String(spy.mock.calls[1][0])).toContain('/bike/');
  });

  it('never invents a route when the routing service is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(calculateRoute(start, end)).rejects.toBeInstanceOf(RouteUnavailableError);
  });

  it('reports when no drivable route exists', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ code: 'NoRoute', routes: [] }), { status: 200 }));
    await expect(calculateRoute(start, end)).rejects.toThrow('No drivable route');
  });

  it('builds a practice loop that starts and ends at the spot, without in-between "arrived" steps', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(loopResponse());
    const loop = await calculatePracticeLoop(start, { radiusMeters: 500 });
    const points = String(spy.mock.calls[0][0]).split('/car/')[1].split('?')[0].split(';');
    expect(points).toHaveLength(5);
    expect(points[0]).toBe(points[4]); // back to the start
    expect(loop.isPracticeLoop).toBe(true);

    const kinds = loop.steps.map((s) => s.maneuverType);
    expect(kinds.filter((k) => k === 'depart')).toHaveLength(1);
    expect(kinds.filter((k) => k === 'arrive')).toHaveLength(1);
    expect(loop.steps[0].instruction).toBe('Start the practice loop');
    expect(loop.steps.at(-1).instruction).toBe('You\u2019re back at the start');
    // merged steps keep the total distance
    expect(loop.steps.reduce((sum, s) => sum + s.distance, 0)).toBe(4 * 1000);
  });

  it('offsets points by the requested distance', () => {
    const north = offsetPoint(start, 500, 0);
    expect(north[0]).toBeCloseTo(start[0], 6);
    expect((north[1] - start[1]) * 111_195).toBeCloseTo(500, 0);
  });

  it('formats distances in km/m outside mile-using countries', () => {
    expect(usesImperialUnits(['en-IN'])).toBe(false);
    expect(usesImperialUnits(['hi-IN'])).toBe(false);
    expect(usesImperialUnits(['en-US'])).toBe(true);
    expect(usesImperialUnits(['en-GB'])).toBe(true);
    expect(formatDistance(3300, { imperial: false })).toBe('3.3 km');
    expect(formatDistance(170, { imperial: false })).toBe('170 m');
    expect(formatDistance(5310, { imperial: true })).toBe('3.3 mi');
    expect(formatDistance(100, { imperial: true })).toBe('330 ft');
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
