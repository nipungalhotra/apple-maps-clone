import { PRESET_PLACES } from '../data/presetPlaces';
import { API_ENDPOINTS } from '../config/mapConfig';

/**
 * Searches places via local presets and public geocoding API
 */
export async function searchLocations(query) {
  if (!query || query.trim().length === 0) {
    return PRESET_PLACES.slice(0, 4);
  }

  const q = query.toLowerCase().trim();

  // Local preset matches first
  const localMatches = PRESET_PLACES.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    p.subtitle.toLowerCase().includes(q)
  );

  // If we already have strong local matches, return them
  if (localMatches.length > 0) {
    return localMatches;
  }

  // Fallback to online geocoder (Photon / Komoot API - free OSM geocoder)
  try {
    const res = await fetch(`${API_ENDPOINTS.photonGeocoding}/?q=${encodeURIComponent(query)}&limit=5`, {
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      const data = await res.json();
      const geocoded = data.features.map((f, i) => {
        const props = f.properties;
        const name = props.name || props.street || 'Location';
        const subtitle = [props.city, props.state, props.country].filter(Boolean).join(', ');
        return {
          id: `geo-${i}-${f.geometry.coordinates.join('-')}`,
          name,
          subtitle: subtitle || 'Search Result',
          category: props.osm_value ? props.osm_value.charAt(0).toUpperCase() + props.osm_value.slice(1) : 'Location',
          coordinates: f.geometry.coordinates,
          rating: 4.6,
          reviewsCount: 320,
          priceLevel: 'Free',
          isOpen: true,
          hours: 'Open today',
          photos: [
            'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=800&q=80'
          ],
          description: `Located in ${subtitle}.`,
          amenities: ['Public Access']
        };
      });
      if (geocoded.length > 0) {
        return geocoded;
      }
    }
  } catch (e) {
    console.warn('Geocoding fallback request failed:', e.message);
  }

  return localMatches;
}
