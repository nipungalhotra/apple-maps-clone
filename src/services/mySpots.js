/**
 * "My practice spots": places a learner marks themselves (an empty school ground, a lot they
 * have permission to use...). Saved on this device, so RoadReady works anywhere, not only
 * where we have curated spots. Always free (never behind the Pro paywall).
 */
const KEY = 'roadready_my_spots';
const MAX_SPOTS = 50;

const isCoord = (c) =>
  Array.isArray(c) && c.length === 2 &&
  Number.isFinite(c[0]) && Number.isFinite(c[1]) &&
  Math.abs(c[0]) <= 180 && Math.abs(c[1]) <= 90;

export function cleanSpotName(name, fallback = 'My practice spot') {
  const n = typeof name === 'string' ? name.replace(/\s+/g, ' ').trim().slice(0, 60) : '';
  return n || fallback;
}

export function loadMySpots() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((s) => s && typeof s.id === 'string' && isCoord(s.coordinates))
      .map((s) => ({ id: s.id, name: cleanSpotName(s.name), coordinates: s.coordinates, createdAt: s.createdAt || null }))
      .slice(0, MAX_SPOTS);
  } catch {
    return [];
  }
}

export function saveMySpots(spots) {
  try {
    localStorage.setItem(KEY, JSON.stringify(spots.slice(0, MAX_SPOTS)));
  } catch {
    // storage unavailable: spots last for this visit only
  }
}

export function createSpot(name, coordinates) {
  if (!isCoord(coordinates)) throw new Error('Invalid coordinates');
  const id = `my-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)}`;
  return { id, name: cleanSpotName(name), coordinates: [Number(coordinates[0].toFixed(6)), Number(coordinates[1].toFixed(6))], createdAt: new Date().toISOString() };
}

/** Shape a saved spot like a practice zone so the map and panel can show it. */
export function spotToZone(spot) {
  return {
    id: spot.id,
    name: spot.name,
    subtitle: 'Your spot · saved on this device',
    coordinates: spot.coordinates,
    type: 'my_spot',
    vehicleTypes: ['car', 'bike'],
    difficulty: 'Your spot',
    isUserSpot: true
  };
}

export const MY_SPOTS_LIMIT = MAX_SPOTS;
