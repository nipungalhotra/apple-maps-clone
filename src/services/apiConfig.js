// Centralized API configuration.
// - Web dev: relative /api (proxied by Vite to the local server).
// - Production web & native apps: set VITE_API_BASE_URL to the deployed API origin
//   (e.g. https://roadready-api.onrender.com). Native Capacitor builds MUST set it,
//   because relative /api resolves to the WebView's local origin.

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export const apiUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};

// Anonymous per-device identifier used to scope passport/subscription data.
// This is NOT authentication; replace with real auth before handling sensitive data.
const CLIENT_ID_KEY = 'roadready_client_id';
let memoryClientId = null;

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export function getClientId() {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id || !/^[A-Za-z0-9_-]{16,64}$/.test(id)) {
      id = generateId();
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    if (!memoryClientId) memoryClientId = generateId();
    return memoryClientId;
  }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * fetch wrapper: resolves the API base URL, sends JSON + client id,
 * enforces a timeout, and throws ApiError on non-2xx or non-JSON responses.
 */
export async function apiFetch(endpoint, { method = 'GET', body, timeoutMs = 8000, headers = {} } = {}) {
  const init = {
    method,
    headers: { 'X-Client-Id': getClientId(), ...headers },
    signal: AbortSignal.timeout(timeoutMs)
  };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const res = await fetch(apiUrl(endpoint), init);
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new ApiError(`API returned non-JSON response (${res.status})`, res.status);
  }
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }
  return data;
}
