/**
 * RoadReady Central Map & Spatial Configuration
 * Handles MapLibre & Mapbox styles, geocoding endpoints, and fallback styles.
 */

export const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

// If a Mapbox token is provided, uses custom Mapbox style; otherwise falls back to free CartoDB GL styles
export const MAP_STYLES = {
  light: MAPBOX_ACCESS_TOKEN
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=${MAPBOX_ACCESS_TOKEN}`
    : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  dark: MAPBOX_ACCESS_TOKEN
    ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11?access_token=${MAPBOX_ACCESS_TOKEN}`
    : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
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
