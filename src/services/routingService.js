import { API_ENDPOINTS } from '../config/mapConfig';

/**
 * RoadReady routing, via the Open Source Routing Machine (OSRM) API.
 *
 * There is deliberately NO offline "simulated" route: drawing invented turns in a driving
 * app is dangerous. If the routing service can't be reached, these functions throw a
 * RouteUnavailableError and the app tells the person instead.
 */

export class RouteUnavailableError extends Error {
  constructor(message = 'Directions are not available right now. Check your connection and try again.') {
    super(message);
    this.name = 'RouteUnavailableError';
  }
}

const PROFILE = { walking: 'foot', cycling: 'bike', driving: 'car' };

async function requestRoute(points, mode, { timeoutMs = 10000 } = {}) {
  const path = points.map(([lng, lat]) => `${lng.toFixed(6)},${lat.toFixed(6)}`).join(';');
  const url = `${API_ENDPOINTS.osrmRouting}/${PROFILE[mode] || 'car'}/${path}?overview=full&geometries=geojson&steps=true`;

  let data;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) throw new Error(`routing service returned ${res.status}`);
    data = await res.json();
  } catch (err) {
    console.warn('Routing request failed:', err.message);
    throw new RouteUnavailableError();
  }
  const primary = data?.routes?.[0];
  if (data?.code !== 'Ok' || !primary) {
    throw new RouteUnavailableError('No drivable route was found between these points.');
  }

  // Multi-stop routes (practice loops) contain an "arrive" + "depart" pair at every stop.
  // Drop those in-between steps, adding their distance and time to the previous step.
  const lastLeg = primary.legs.length - 1;
  const rawSteps = [];
  primary.legs.forEach((leg, li) => {
    leg.steps.forEach((st) => {
      const inBetween = (st.maneuver.type === 'arrive' && li < lastLeg) || (st.maneuver.type === 'depart' && li > 0);
      if (inBetween && rawSteps.length > 0) {
        const prev = rawSteps[rawSteps.length - 1];
        prev.distance += st.distance;
        prev.duration += st.duration;
      } else {
        rawSteps.push({ ...st });
      }
    });
  });

  const steps = rawSteps.map((st, i) => ({
    id: `step-${i}`,
    instruction: st.maneuver.instruction || formatManeuver(st.maneuver.type, st.maneuver.modifier, st.name),
    maneuverType: st.maneuver.type,
    modifier: st.maneuver.modifier,
    distance: st.distance, // meters
    duration: st.duration, // seconds
    name: st.name || '',
    location: st.maneuver.location
  }));

  return {
    coordinates: primary.geometry.coordinates,
    distanceMeters: primary.distance,
    durationSeconds: primary.duration,
    steps,
    mode
  };
}

export async function calculateRoute(startCoord, endCoord, mode = 'driving') {
  return requestRoute([startCoord, endCoord], mode);
}

/** Point `meters` away from `[lng, lat]` in direction `bearingDeg` (0 = north). */
export function offsetPoint([lng, lat], meters, bearingDeg) {
  const R = 6371000;
  const b = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  const d = meters / R;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b));
  const lng2 = lng1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return [(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
}

/**
 * A short practice circuit on real roads that starts and ends at `center`:
 * the routing service joins three points spaced around it. It is a suggestion only;
 * it is NOT checked for traffic or safety, and the app says so.
 */
export async function calculatePracticeLoop(center, { radiusMeters = 500, mode = 'driving', rotationDeg = 0 } = {}) {
  const waypoints = [0, 120, 240].map((b) => offsetPoint(center, radiusMeters, b + rotationDeg));
  const route = await requestRoute([center, ...waypoints, center], mode, { timeoutMs: 12000 });
  const steps = route.steps.map((s, i, all) => {
    if (i === 0 && s.maneuverType === 'depart') return { ...s, instruction: 'Start the practice loop' };
    if (i === all.length - 1 && s.maneuverType === 'arrive') return { ...s, instruction: 'You\u2019re back at the start' };
    return s;
  });
  return { ...route, steps, isPracticeLoop: true, loopRadiusMeters: radiusMeters };
}

function formatManeuver(type, modifier, streetName) {
  const street = streetName ? ` onto ${streetName}` : '';
  if (type === 'depart') return `Head towards your destination`;
  if (type === 'arrive') return `You have arrived at your destination`;
  if (type === 'turn') {
    if (modifier?.includes('right')) return `Turn right${street}`;
    if (modifier?.includes('left')) return `Turn left${street}`;
    return `Continue straight${street}`;
  }
  if (type === 'roundabout') return `Take roundabout${street}`;
  return `Continue on ${streetName || 'the road'}`;
}

// Countries that use miles on the road (US, UK, Liberia, Myanmar). Everyone else gets km.
const IMPERIAL_REGIONS = new Set(['US', 'GB', 'LR', 'MM']);

export function usesImperialUnits(locales) {
  const list = locales || (typeof navigator !== 'undefined' ? (navigator.languages?.length ? navigator.languages : [navigator.language]) : []);
  const first = (list || []).find(Boolean) || 'en-US';
  try {
    const region = new Intl.Locale(first).maximize().region;
    return IMPERIAL_REGIONS.has(region);
  } catch {
    return /-(US|GB|LR|MM)\b/i.test(first);
  }
}

export function formatDistance(meters, { imperial = usesImperialUnits() } = {}) {
  const m = Math.max(0, Number(meters) || 0);
  if (imperial) {
    if (m < 160) return `${Math.round((m * 3.28084) / 10) * 10} ft`;
    return `${(m / 1609.34).toFixed(1)} mi`;
  }
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds) {
  const mins = Math.round(seconds / 60);
  if (mins < 60) {
    return `${mins} min`;
  }
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs} hr ${remMins} min`;
}

export function calculateETA(seconds) {
  const date = new Date(Date.now() + seconds * 1000);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function haversineMeters([lng1, lat1], [lng2, lat2]) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Maps a position along the route geometry (an index into routeData.coordinates)
 * to the index of the maneuver step the driver is currently on.
 *
 * The simulated GPS advances one coordinate at a time, but a route has far fewer
 * maneuver steps than coordinates, so the two indexes must not be confused.
 * We measure the fraction of the route driven so far and find the step whose
 * cumulative distance covers that fraction.
 */
export function getStepIndexForCoordinate(routeData, coordIndex) {
  const steps = routeData?.steps || [];
  const coords = routeData?.coordinates || [];
  if (steps.length <= 1 || coords.length < 2) return 0;

  const idx = Math.max(0, Math.min(coords.length - 1, Math.floor(coordIndex) || 0));
  if (idx >= coords.length - 1) return steps.length - 1;

  let travelled = 0;
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const seg = haversineMeters(coords[i - 1], coords[i]);
    total += seg;
    if (i <= idx) travelled += seg;
  }
  const progress = total > 0 ? travelled / total : idx / (coords.length - 1);

  const stepTotal = steps.reduce((sum, st) => sum + (Number(st.distance) || 0), 0);
  if (stepTotal <= 0) {
    return Math.min(steps.length - 1, Math.floor(progress * steps.length));
  }

  let cumulative = 0;
  for (let i = 0; i < steps.length; i++) {
    cumulative += (Number(steps[i].distance) || 0) / stepTotal;
    if (progress < cumulative) return i;
  }
  return steps.length - 1;
}
