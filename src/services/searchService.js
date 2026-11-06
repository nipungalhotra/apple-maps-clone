import { PRESET_PLACES } from '../data/presetPlaces';
import { API_ENDPOINTS } from '../config/mapConfig';

import { calculateDistanceKm, distanceMeters } from './learnerEngine';
import { formatDistance } from './routingService';

const SF = [-122.4194, 37.7749];
const nearSanFrancisco = (coord) => !coord || calculateDistanceKm(coord, SF) <= 60;

export class SearchUnavailableError extends Error {
  constructor() {
    super('Search isn\u2019t available right now. Check your connection and try again.');
    this.name = 'SearchUnavailableError';
  }
}

// Search areas around the person, tried in order: nearby first, wider only if nothing is found.
export const SEARCH_RADII_KM = [25, 100];

/** [minLon, minLat, maxLon, maxLat] box roughly `km` around `[lng, lat]`. */
export function boxAround([lng, lat], km) {
  const dLat = km / 111.32;
  const dLng = km / (111.32 * Math.max(0.1, Math.cos((lat * Math.PI) / 180)));
  return [lng - dLng, lat - dLat, lng + dLng, lat + dLat].map((n) => Number(n.toFixed(4)));
}

async function photon(query, { near, bbox }) {
  const params = new URLSearchParams({ q: query, limit: '8' });
  if (near) {
    params.set('lat', String(near[1]));
    params.set('lon', String(near[0]));
  }
  if (bbox) params.set('bbox', bbox.join(','));
  const res = await fetch(`${API_ENDPOINTS.photonGeocoding}/?${params}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`geocoder returned ${res.status}`);
  const data = await res.json();
  return data.features || [];
}

function toPlace(f, i, near) {
  const props = f.properties || {};
  const name = props.name || props.street || 'Location';
  const area = [props.city || props.district || props.county, props.state, props.country].filter(Boolean).join(', ');
  const distanceKm = near ? distanceMeters(near, f.geometry.coordinates) / 1000 : null;
  return {
    id: `geo-${i}-${f.geometry.coordinates.join('-')}`,
    name,
    subtitle: distanceKm === null ? (area || 'Search result') : `${formatDistance(distanceKm * 1000)} away \u00b7 ${area || 'Search result'}`,
    category: props.osm_value ? props.osm_value.charAt(0).toUpperCase() + props.osm_value.slice(1) : 'Location',
    coordinates: f.geometry.coordinates,
    distanceKm,
    priceLevel: 'Free',
    description: area ? `Located in ${area}.` : ''
  };
}

/**
 * Searches places. With the person's location (`near`), it looks within 25 km first and only
 * widens to 100 km, then everywhere, when nothing closer is found; results are sorted nearest
 * first and say how far away they are. The curated San Francisco places are only offered near
 * San Francisco. Throws SearchUnavailableError when the geocoder can't be reached.
 */
export async function searchLocations(query, { near = null } = {}) {
  const presets = nearSanFrancisco(near) ? PRESET_PLACES : [];
  if (!query || query.trim().length === 0) {
    return presets.slice(0, 4);
  }

  const q = query.toLowerCase().trim();
  const localMatches = presets.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    p.subtitle.toLowerCase().includes(q)
  );
  if (localMatches.length > 0) {
    return localMatches;
  }

  const text = query.trim();
  let features = [];
  try {
    if (Array.isArray(near)) {
      // Ask for both areas at once so widening costs no extra waiting.
      const settled = await Promise.allSettled(SEARCH_RADII_KM.map((km) => photon(text, { near, bbox: boxAround(near, km) })));
      if (settled.every((s) => s.status === 'rejected')) throw settled[0].reason;
      features = settled.find((s) => s.status === 'fulfilled' && s.value.length > 0)?.value || [];
      if (features.length === 0) features = await photon(text, { near });
    } else {
      features = await photon(text, {});
    }
  } catch (e) {
    console.warn('Place search failed:', e.message);
    throw new SearchUnavailableError();
  }

  const places = features.map((f, i) => toPlace(f, i, near));
  if (near) places.sort((a, b) => a.distanceKm - b.distanceKm);
  return places;
}
