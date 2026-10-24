import { API_ENDPOINTS } from '../config/mapConfig';

/**
 * Apple Maps Routing Engine Service
 * Connects to Open Source Routing Machine (OSRM) public API with simulated route fallback
 */

export async function calculateRoute(startCoord, endCoord, mode = 'driving') {
  // mode: 'driving' | 'walking' | 'cycling'
  const osrmProfile = mode === 'walking' ? 'foot' : mode === 'cycling' ? 'bike' : 'car';
  const url = `${API_ENDPOINTS.osrmRouting}/${osrmProfile}/${startCoord[0]},${startCoord[1]};${endCoord[0]},${endCoord[1]}?overview=full&geometries=geojson&steps=true`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error('OSRM API returned non-200');
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      const primary = data.routes[0];
      const steps = primary.legs[0].steps.map((st, i) => ({
        id: `step-${i}`,
        instruction: st.maneuver.instruction || formatManeuver(st.maneuver.type, st.maneuver.modifier, st.name),
        maneuverType: st.maneuver.type,
        modifier: st.maneuver.modifier,
        distance: st.distance, // meters
        duration: st.duration, // seconds
        name: st.name || 'Unnamed Road',
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
  } catch (err) {
    console.warn('Real-time OSRM route fetch failed, using fallback interpolated path:', err.message);
  }

  // Realistic Fallback Route Synthesizer (e.g. offline / network sandbox)
  return generateSimulatedRoute(startCoord, endCoord, mode);
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

function generateSimulatedRoute(start, end, mode) {
  const [lng1, lat1] = start;
  const [lng2, lat2] = end;
  const numWaypoints = 24;
  const coordinates = [];

  // Generate a slightly curved realistic path
  for (let i = 0; i <= numWaypoints; i++) {
    const t = i / numWaypoints;
    const curve = Math.sin(t * Math.PI) * 0.004;
    const lng = lng1 + (lng2 - lng1) * t + curve;
    const lat = lat1 + (lat2 - lat1) * t + (i % 2 === 0 ? curve * 0.5 : -curve * 0.5);
    coordinates.push([lng, lat]);
  }

  // Calculate approximate distance
  const dLat = (lat2 - lat1) * 111000;
  const dLng = (lng2 - lng1) * 111000 * Math.cos((lat1 * Math.PI) / 180);
  const totalDist = Math.sqrt(dLat * dLat + dLng * dLng) * 1.25;

  const speedKmh = mode === 'walking' ? 4.5 : mode === 'cycling' ? 18 : 45;
  const durationSec = (totalDist / (speedKmh * 1000)) * 3600;

  const steps = [
    { id: 'step-0', instruction: 'Start route heading north', maneuverType: 'depart', distance: totalDist * 0.15, duration: durationSec * 0.15, name: 'Main St' },
    { id: 'step-1', instruction: 'In 500 ft, turn right onto Avenue Boulevard', maneuverType: 'turn', modifier: 'right', distance: totalDist * 0.45, duration: durationSec * 0.45, name: 'Avenue Blvd' },
    { id: 'step-2', instruction: 'Continue straight for 1.2 miles', maneuverType: 'continue', modifier: 'straight', distance: totalDist * 0.3, duration: durationSec * 0.3, name: 'Grand Way' },
    { id: 'step-3', instruction: 'You have arrived at your destination on the right', maneuverType: 'arrive', distance: totalDist * 0.1, duration: durationSec * 0.1, name: 'Destination' }
  ];

  return {
    coordinates,
    distanceMeters: totalDist,
    durationSeconds: durationSec,
    steps,
    mode
  };
}

export function formatDistance(meters) {
  if (meters < 1000) {
    const feet = Math.round(meters * 3.28084);
    return `${feet} ft`;
  }
  const miles = (meters / 1609.34).toFixed(1);
  return `${miles} mi`;
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
