// Returns a trimmed string, the fallback when empty, or null when invalid
// (wrong type, too long, or required-but-missing).
export function cleanString(value, { max, required = false, fallback = '' } = {}) {
  if (value === undefined || value === null || value === '') {
    return required ? null : fallback;
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (required && trimmed.length === 0) return null;
  if (trimmed.length > max) return null;
  return trimmed;
}

// Anonymous per-device identifier sent as X-Client-Id by people without an account.
export const CLIENT_ID_RE = /^[A-Za-z0-9_-]{16,64}$/;

export function sendServerError(res, message, err) {
  console.error(`[api] ${message}:`, err);
  res.status(500).json({ error: message });
}
