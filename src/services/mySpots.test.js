import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadMySpots, saveMySpots, createSpot, spotToZone, cleanSpotName, MY_SPOTS_LIMIT } from './mySpots';

const GANGANAGAR = [73.8772, 29.9038];

beforeEach(() => {
  const store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  });
});

describe('my practice spots', () => {
  it('creates a spot with a clean name and rounded coordinates', () => {
    const spot = createSpot('  School   ground  ', [73.87721234567, 29.90381234567]);
    expect(spot.id).toMatch(/^my-/);
    expect(spot.name).toBe('School ground');
    expect(spot.coordinates).toEqual([73.877212, 29.903812]);
  });

  it('rejects invalid coordinates and falls back to a default name', () => {
    expect(() => createSpot('x', [200, 10])).toThrow();
    expect(() => createSpot('x', ['a', 'b'])).toThrow();
    expect(cleanSpotName('   ')).toBe('My practice spot');
    expect(cleanSpotName('a'.repeat(100))).toHaveLength(60);
  });

  it('saves and loads spots on the device, dropping damaged entries', () => {
    const spot = createSpot('Stadium lot', GANGANAGAR);
    saveMySpots([spot]);
    expect(loadMySpots()).toEqual([spot]);

    localStorage.setItem('roadready_my_spots', JSON.stringify([spot, { id: 'bad', coordinates: [999, 999] }, null]));
    expect(loadMySpots()).toHaveLength(1);

    localStorage.setItem('roadready_my_spots', '{not json');
    expect(loadMySpots()).toEqual([]);
  });

  it(`keeps at most ${MY_SPOTS_LIMIT} spots`, () => {
    const many = Array.from({ length: MY_SPOTS_LIMIT + 5 }, (_, i) => createSpot(`Spot ${i}`, GANGANAGAR));
    saveMySpots(many);
    expect(loadMySpots()).toHaveLength(MY_SPOTS_LIMIT);
  });

  it('shapes a spot like a practice zone for the map and panel', () => {
    const zone = spotToZone(createSpot('Ground', GANGANAGAR));
    expect(zone).toMatchObject({ isUserSpot: true, difficulty: 'Your spot', coordinates: [73.8772, 29.9038] });
    expect(zone.vehicleTypes).toEqual(['car', 'bike']);
  });
});
