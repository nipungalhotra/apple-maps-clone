/**
 * RoadReady Central Map & Spatial Configuration
 * Handles MapLibre & Mapbox styles, geocoding endpoints, and fallback styles.
 */

export const MAPBOX_ACCESS_TOKEN =
  (typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ||
      import.meta.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
      import.meta.env.MAPBOX_ACCESS_TOKEN
    : '') || '';

export const FALLBACK_STYLES = {
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
};

// Validates Mapbox public token format (pk.eyJ...)
export const isMapboxTokenFormat = (token) => {
  return typeof token === 'string' && token.startsWith('pk.') && token.length >= 50;
};

// If a valid Mapbox token is provided, uses Mapbox styles; otherwise uses high-availability open vector styles
export const MAP_STYLES = {
  light: isMapboxTokenFormat(MAPBOX_ACCESS_TOKEN)
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=${MAPBOX_ACCESS_TOKEN}`
    : FALLBACK_STYLES.light,
  dark: isMapboxTokenFormat(MAPBOX_ACCESS_TOKEN)
    ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11?access_token=${MAPBOX_ACCESS_TOKEN}`
    : FALLBACK_STYLES.dark
};

export const DEFAULT_REGION = {
  center: [-122.4194, 37.7749], // San Francisco, CA
  zoom: 13,
  pitch: 0,
  bearing: 0
};

export const API_ENDPOINTS = {
  osrmRouting: 'https://router.project-osrm.org/route/v1',
  photonGeocoding: 'https://photon.komoot.io/api'
};
