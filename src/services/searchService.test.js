import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchLocations, SearchUnavailableError, boxAround } from './searchService';

const GANGANAGAR = [73.8772, 29.9038];
const SF = [-122.4194, 37.7749];

afterEach(() => vi.restoreAllMocks());

const json = (features) => new Response(JSON.stringify({ features }), { status: 200, headers: { 'Content-Type': 'application/json' } });
const feature = (name, coords, city, state = 'Rajasthan', country = 'India') =>
  ({ geometry: { coordinates: coords }, properties: { name, city, state, country, osm_value: 'stadium' } });

const STADIUM = feature('Maharaja Ganga Singh Stadium', [73.8823, 29.9197], 'Sri Ganganagar');
const FAR = feature('Stadium', [74.98, 30.11], 'Bhirdana', 'Haryana');

// Route each mocked request by its search area: 25 km box, 100 km box, or no box.
function mockByArea({ near25 = [], near100 = [], anywhere = [], fail = [] } = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    const u = new URL(String(url));
    const bbox = u.searchParams.get('bbox');
    const area = !bbox ? 'anywhere' : (Number(bbox.split(',')[2]) - Number(bbox.split(',')[0]) < 1 ? 'near25' : 'near100');
    if (fail.includes(area)) throw new TypeError('Failed to fetch');
    return json({ near25, near100, anywhere }[area]);
  });
}

describe('place search', () => {
  it('looks within about 25 km of the person first', async () => {
    const spy = mockByArea({ near25: [STADIUM], near100: [FAR, STADIUM] });
    const results = await searchLocations('stadium', { near: GANGANAGAR });
    expect(results.map((r) => r.name)).toEqual(['Maharaja Ganga Singh Stadium']);
    const boxes = spy.mock.calls.map(([u]) => new URL(String(u)).searchParams.get('bbox'));
    expect(boxes).toContain(boxAround(GANGANAGAR, 25).join(','));
  });

  it('says how far away each result is, nearest first', async () => {
    mockByArea({ near25: [FAR, STADIUM] });
    const results = await searchLocations('stadium', { near: GANGANAGAR });
    expect(results[0].name).toBe('Maharaja Ganga Singh Stadium');
    expect(results[0].distanceKm).toBeLessThan(3);
    expect(results[0].subtitle).toMatch(/away · Sri Ganganagar, Rajasthan, India$/);
  });

  it('widens to 100 km, then everywhere, only when nothing closer matches', async () => {
    mockByArea({ near25: [], near100: [FAR] });
    expect((await searchLocations('stadium', { near: GANGANAGAR }))[0].subtitle).toContain('Bhirdana');

    vi.restoreAllMocks();
    mockByArea({ near25: [], near100: [], anywhere: [FAR] });
    expect(await searchLocations('stadium', { near: GANGANAGAR })).toHaveLength(1);
  });

  it('still answers if one of the nearby searches fails', async () => {
    mockByArea({ near100: [STADIUM], fail: ['near25'] });
    expect((await searchLocations('stadium', { near: GANGANAGAR }))[0].name).toBe('Maharaja Ganga Singh Stadium');
  });

  it('says so when search is unavailable instead of showing other places', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(searchLocations('stadium', { near: GANGANAGAR })).rejects.toBeInstanceOf(SearchUnavailableError);
  });

  it('returns an empty list when nothing matches anywhere', async () => {
    mockByArea({});
    expect(await searchLocations('zzzz', { near: GANGANAGAR })).toEqual([]);
  });

  it('only suggests San Francisco places to people near San Francisco', async () => {
    expect(await searchLocations('', { near: GANGANAGAR })).toEqual([]);
    const sf = await searchLocations('', { near: SF });
    expect(sf.some((p) => p.name === 'Golden Gate Bridge')).toBe(true);
  });

  it('builds a box of the right size', () => {
    const [minLon, minLat, maxLon, maxLat] = boxAround(GANGANAGAR, 25);
    expect((maxLat - minLat) * 111.32 / 2).toBeCloseTo(25, 0);
    expect(minLon).toBeLessThan(GANGANAGAR[0]);
    expect(maxLon).toBeGreaterThan(GANGANAGAR[0]);
  });
});
