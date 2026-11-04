import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const STORAGE_DIR = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.join(__dirname, '../storage');

fs.mkdirSync(STORAGE_DIR, { recursive: true });

export const storagePath = (name) => path.join(STORAGE_DIR, name);

export function readJson(file, fallback) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

// Atomic write: write a temp file then rename, so a crash never leaves a half-written file.
export function writeJson(file, data) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

// Maps keyed by user-controlled strings use null-prototype objects so keys such as
// "__proto__" cannot pollute Object.prototype.
export function toSafeMap(obj) {
  const out = Object.create(null);
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) out[k] = v;
  }
  return out;
}

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

// Anonymous per-device identity. NOT authentication: it scopes passport and
// subscription data to one device instead of a single global record.
// Replace with real auth (sessions/JWT) before storing anything sensitive.
const CLIENT_ID_RE = /^[A-Za-z0-9_-]{16,64}$/;
export function requireClientId(req, res, next) {
  const id = req.get('X-Client-Id');
  if (!id || !CLIENT_ID_RE.test(id)) {
    return res.status(400).json({ error: 'Missing or invalid X-Client-Id header' });
  }
  req.clientId = id;
  next();
}

export function sendServerError(res, message, err) {
  console.error(`[api] ${message}:`, err);
  res.status(500).json({ error: message });
}
