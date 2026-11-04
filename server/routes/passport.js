import express from 'express';
import crypto from 'crypto';
import { writeLimiter } from '../middleware/security.js';
import { identify, requireOwner } from '../lib/auth.js';
import { query } from '../db/index.js';
import { sendServerError } from '../lib/validation.js';

const TARGET_HOURS = 50;
const RECENT_SESSIONS = 50;

const BADGES = [
  { thresh: 5, name: 'First Ignition' },
  { thresh: 15, name: 'Friction Master' },
  { thresh: 25, name: 'Cone Wizard' },
  { thresh: 35, name: 'Highway Navigator' },
  { thresh: 50, name: 'Road Ready Master' }
];

const round = (n) => Math.round(n * 100) / 100;

// Totals and badges are derived from the individual drive logs, so there is
// no running counter that can drift or race.
export async function loadPassport(ownerId) {
  const [{ rows: [totals] }, { rows: sessions }] = await Promise.all([
    query(
      `SELECT COALESCE(SUM(hours), 0)::float8 AS total,
              COALESCE(SUM(hours) FILTER (WHERE is_night), 0)::float8 AS night,
              COALESCE(SUM(hours) FILTER (WHERE is_highway), 0)::float8 AS highway
         FROM roadready.drive_logs WHERE owner_id = $1`,
      [ownerId]
    ),
    query(
      `SELECT id, hours, is_night, is_highway, logged_at
         FROM roadready.drive_logs WHERE owner_id = $1
        ORDER BY logged_at DESC LIMIT ${RECENT_SESSIONS}`,
      [ownerId]
    )
  ]);

  const total = Number(totals.total);
  return {
    loggedHours: round(Math.min(TARGET_HOURS, total)),
    totalHours: round(total),
    targetHours: TARGET_HOURS,
    nightHours: round(Number(totals.night)),
    highwayHours: round(Number(totals.highway)),
    badges: BADGES.filter((b) => total >= b.thresh).map((b) => b.name),
    recentSessions: sessions.map((s) => ({
      id: s.id,
      hours: Number(s.hours),
      isNight: s.is_night,
      isHighway: s.is_highway,
      loggedAt: new Date(s.logged_at).toISOString()
    }))
  };
}

const router = express.Router();
router.use(identify, requireOwner);

// Get hours, badges and recent sessions for the caller
router.get('/', async (req, res) => {
  try {
    res.json(await loadPassport(req.ownerId));
  } catch (err) {
    sendServerError(res, 'Failed to read passport data', err);
  }
});

// Log a practice session (rate-limited & strictly validated)
router.post('/log', writeLimiter, async (req, res) => {
  try {
    const { hours = 1, isNight = false, isHighway = false } = req.body || {};
    if (typeof hours !== 'number' || !Number.isFinite(hours) || hours <= 0 || hours > 12) {
      return res.status(400).json({ error: 'hours must be a number between 0 and 12' });
    }
    if (typeof isNight !== 'boolean' || typeof isHighway !== 'boolean') {
      return res.status(400).json({ error: 'isNight and isHighway must be booleans' });
    }

    await query(
      'INSERT INTO roadready.drive_logs (id, owner_id, hours, is_night, is_highway) VALUES ($1, $2, $3, $4, $5)',
      [crypto.randomUUID(), req.ownerId, hours, isNight, isHighway]
    );
    res.json({ success: true, passport: await loadPassport(req.ownerId) });
  } catch (err) {
    sendServerError(res, 'Failed to update passport', err);
  }
});

export default router;
