// Centralized API Base URL Configuration
// Uses relative /api by default (proxied by Vite in dev and Vercel in production),
// or reads VITE_API_BASE_URL if the backend is hosted on a separate custom domain.

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const apiUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};
