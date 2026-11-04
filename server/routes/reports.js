import express from 'express';
import crypto from 'crypto';
import { writeLimiter } from '../middleware/security.js';
import { identify } from '../lib/auth.js';
import { query } from '../db/index.js';
import { cleanString, sendServerError } from '../lib/validation.js';

const MAX_REPORTS_PER_ZONE = 50;
const ZONE_ID_RE = /^[A-Za-z0-9_-]+$/;

const toReport = (r) => ({
  id: r.id,
  author: r.author,
  createdAt: new Date(r.created_at).toISOString(),
  status: r.status,
  surface: r.surface,
  notes: r.notes
});

const router = express.Router();

// Reports for one zone (?zoneId=) or the latest reports for every zone, grouped by zone id.
router.get('/', async (req, res) => {
  try {
    const zoneId = typeof req.query.zoneId === 'string' ? req.query.zoneId : null;
    if (zoneId) {
      if (!ZONE_ID_RE.test(zoneId) || zoneId.length > 100) return res.json([]);
      const { rows } = await query(
        `SELECT * FROM roadready.community_reports WHERE zone_id = $1
          ORDER BY created_at DESC LIMIT ${MAX_REPORTS_PER_ZONE}`,
        [zoneId]
      );
      return res.json(rows.map(toReport));
    }

    const { rows } = await query(
      `SELECT * FROM (
         SELECT r.*, ROW_NUMBER() OVER (PARTITION BY zone_id ORDER BY created_at DESC) AS rn
           FROM roadready.community_reports r
       ) ranked
       WHERE rn <= ${MAX_REPORTS_PER_ZONE}
       ORDER BY zone_id, created_at DESC`
    );
    // Null-prototype map: zone ids such as "__proto__" cannot pollute Object.prototype.
    const grouped = Object.create(null);
    for (const r of rows) {
      (grouped[r.zone_id] ||= []).push(toReport(r));
    }
    res.json({ ...grouped });
  } catch (err) {
    sendServerError(res, 'Failed to read community reports', err);
  }
});

// Post new ground report (rate-limited & validated). Signed-in users are recorded as the
// owner so their reports are removed if they delete their account.
router.post('/', writeLimiter, identify, async (req, res) => {
  try {
    const body = req.body || {};
    const zoneId = cleanString(body.zoneId, { max: 100, required: true });
    const notes = cleanString(body.notes, { max: 500, required: true });
    const author = cleanString(body.author, { max: 40, fallback: 'Anonymous Learner' });
    const status = cleanString(body.status, { max: 40, fallback: 'Gate Open' });
    const surface = cleanString(body.surface, { max: 40, fallback: 'Clean' });

    if (!zoneId || !notes || author === null || status === null || surface === null) {
      return res.status(400).json({ error: 'zoneId (≤100 chars) and notes (≤500 chars) are required; author/status/surface must be short strings' });
    }
    if (!ZONE_ID_RE.test(zoneId)) {
      return res.status(400).json({ error: 'Invalid zoneId' });
    }

    const { rows } = await query(
      `INSERT INTO roadready.community_reports (id, zone_id, owner_id, author, status, surface, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [crypto.randomUUID(), zoneId, req.ownerId || null, author, status, surface, notes]
    );
    const { rows: [{ count }] } = await query(
      'SELECT LEAST(COUNT(*), $2)::int AS count FROM roadready.community_reports WHERE zone_id = $1',
      [zoneId, MAX_REPORTS_PER_ZONE]
    );

    res.status(201).json({ success: true, report: toReport(rows[0]), count });
  } catch (err) {
    sendServerError(res, 'Failed to save community report', err);
  }
});

export default router;
