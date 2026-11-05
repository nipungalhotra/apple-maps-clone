import crypto from 'crypto';

/**
 * Admin-only endpoints (lead export, business metrics) require
 * `Authorization: Bearer <ADMIN_TOKEN>`. With ADMIN_TOKEN unset they are disabled.
 */
export function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_TOKEN || '';
  const auth = req.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const valid = expected.length > 0 && token.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  if (!valid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
