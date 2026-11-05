import { jwtVerify, createRemoteJWKSet, decodeProtectedHeader } from 'jose';
import { CLIENT_ID_RE } from './validation.js';

/**
 * Accounts are provided by Supabase Auth. The app signs users in with
 * supabase-js and sends the session's access token as `Authorization: Bearer`.
 * This server only verifies that token; it never sees passwords.
 *
 * Config (server env):
 *   SUPABASE_URL               e.g. https://abcd.supabase.co  (enables JWKS verification)
 *   SUPABASE_JWT_SECRET        legacy HS256 secret, only for projects not yet on signing keys
 *   SUPABASE_SERVICE_ROLE_KEY  secret key used only to delete auth users on account deletion
 */
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '';
const ISSUER = SUPABASE_URL ? `${SUPABASE_URL}/auth/v1` : undefined;

export const authConfigured = Boolean(SUPABASE_URL || JWT_SECRET);

let jwks = null;

export async function verifyAccessToken(token) {
  const options = { audience: 'authenticated', ...(ISSUER ? { issuer: ISSUER } : {}) };
  const { alg } = decodeProtectedHeader(token);

  let payload;
  if (alg === 'HS256') {
    if (!JWT_SECRET) throw new Error('HS256 tokens are not accepted (SUPABASE_JWT_SECRET not set)');
    ({ payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET), { ...options, algorithms: ['HS256'] }));
  } else {
    if (!SUPABASE_URL) throw new Error('Asymmetric tokens need SUPABASE_URL for key discovery');
    jwks ||= createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));
    ({ payload } = await jwtVerify(token, jwks, { ...options, algorithms: ['ES256', 'RS256', 'EdDSA'] }));
  }

  if (typeof payload.sub !== 'string' || !/^[0-9a-f-]{36}$/i.test(payload.sub)) {
    throw new Error('Token has no valid user id');
  }
  if (payload.is_anonymous === true) {
    throw new Error('Anonymous Supabase sessions are not accounts');
  }
  return { id: payload.sub.toLowerCase(), email: typeof payload.email === 'string' ? payload.email : null };
}

/**
 * Works out who is calling:
 *   - valid Bearer token  -> req.user = { id, email }, req.ownerId = "user:<id>"
 *   - else X-Client-Id    -> req.ownerId = "guest:<client id>"
 * An invalid or expired token is rejected (401) rather than silently treated as a guest,
 * so the app knows to refresh the session.
 */
export async function identify(req, res, next) {
  const header = req.get('Authorization') || '';
  if (header.startsWith('Bearer ')) {
    if (!authConfigured) {
      return res.status(401).json({ error: 'Accounts are not configured on this server' });
    }
    try {
      req.user = await verifyAccessToken(header.slice(7).trim());
      req.ownerId = `user:${req.user.id}`;
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
  }

  const clientId = req.get('X-Client-Id');
  if (clientId && CLIENT_ID_RE.test(clientId)) {
    req.guestOwnerId = `guest:${clientId}`;
    req.ownerId ||= req.guestOwnerId;
  }
  next();
}

export function requireOwner(req, res, next) {
  if (!req.ownerId) {
    return res.status(400).json({ error: 'Sign in, or send a valid X-Client-Id header' });
  }
  next();
}

export function requireUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Sign in required' });
  }
  next();
}

// Deletes the Supabase Auth user (needed for in-app account deletion).
export async function deleteAuthUser(userId) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) {
    throw new Error('Account deletion needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(10_000)
  });
  // 404 = already gone, which is the outcome we want.
  if (!res.ok && res.status !== 404) {
    throw new Error(`Supabase admin delete failed with status ${res.status}`);
  }
}
