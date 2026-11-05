import { getAccessToken } from './authService';

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

// Anonymous per-device identifier. Guests (no account) are identified by it; after
// sign-in it is used once to move the guest's data into the account.
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

export function resetClientId() {
  memoryClientId = null;
  try {
    localStorage.removeItem(CLIENT_ID_KEY);
  } catch {
    // ignore
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
 * fetch wrapper: resolves the API base URL, sends JSON, the device id and (when
 * signed in) the account's access token, enforces a timeout, and throws ApiError
 * on non-2xx or non-JSON responses.
 */
export async function apiFetch(endpoint, { method = 'GET', body, timeoutMs = 8000, headers = {} } = {}) {
  const token = await getAccessToken();
  const init = {
    method,
    headers: {
      'X-Client-Id': getClientId(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
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
    const err = new ApiError(data?.error || `Request failed (${res.status})`, res.status);
    err.code = data?.code;
    throw err;
  }
  return data;
}
