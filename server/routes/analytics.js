import express from 'express';
import rateLimit from 'express-rate-limit';
import { identify } from '../lib/auth.js';
import { requireAdmin } from '../lib/adminAuth.js';
import { CLIENT_ID_RE, sendServerError } from '../lib/validation.js';
import { sanitizeClientEvent, recordEvent, hashVisitor, computeMetrics } from '../lib/analytics.js';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Separate budget from the write limiter so analytics can never block real actions.
const eventsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX_EVENTS) || 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many events' }
});

// ---------- POST /api/events (from the app) ----------
export const eventsRouter = express.Router();

eventsRouter.post('/', eventsLimiter, identify, async (req, res) => {
  const clientId = req.get('X-Client-Id');
  if (!clientId || !CLIENT_ID_RE.test(clientId)) return res.status(204).end();

  const ownHost = (() => {
    try { return new URL(req.get('Origin') || '').hostname.replace(/^www\./, ''); } catch { return null; }
  })();
  const event = sanitizeClientEvent(req.body, { ownHost });
  if (!event) return res.status(204).end(); // unknown events are ignored, not errors

  try {
    await recordEvent(event, { visitorId: hashVisitor(clientId), userId: req.user?.id || null });
    res.status(204).end();
  } catch (err) {
    sendServerError(res, 'Failed to record event', err);
  }
});

// ---------- GET /api/admin/metrics (owner only) ----------
export const adminRouter = express.Router();
adminRouter.use(requireAdmin);

adminRouter.get('/metrics', async (req, res) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));
  // Test purchases are counted only when asked for (default: counted outside production).
  const includeSimulated = req.query.includeSimulated === undefined
    ? !IS_PRODUCTION
    : req.query.includeSimulated === '1' || req.query.includeSimulated === 'true';
  const monthlyCosts = req.query.costs === undefined ? undefined : Number(req.query.costs);
  if (monthlyCosts !== undefined && !(Number.isFinite(monthlyCosts) && monthlyCosts >= 0 && monthlyCosts < 1e7)) {
    return res.status(400).json({ error: 'costs must be a non-negative number' });
  }

  try {
    res.set('Cache-Control', 'no-store');
    res.json(await computeMetrics({ days, includeSimulated, monthlyCosts }));
  } catch (err) {
    sendServerError(res, 'Failed to compute metrics', err);
  }
});
