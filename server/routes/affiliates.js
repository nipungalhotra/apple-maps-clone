import express from 'express';
import crypto from 'crypto';
import { writeLimiter } from '../middleware/security.js';
import { query } from '../db/index.js';
import { cleanString, sendServerError } from '../lib/validation.js';

// Token required to read affiliate lead data. Unset = endpoint disabled.
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

const router = express.Router();

// Track insurance quote click. Not linked to any account or device.
router.post('/insurance-click', writeLimiter, async (req, res) => {
  try {
    const body = req.body || {};
    const partnerId = cleanString(body.partnerId, { max: 60, required: true });
    const partnerName = cleanString(body.partnerName, { max: 80, fallback: '' });
    if (!partnerId || partnerName === null) {
      return res.status(400).json({ error: 'partnerId is required' });
    }
    const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

    const id = crypto.randomUUID();
    await query(
      `INSERT INTO roadready.insurance_clicks (id, partner_id, partner_name, estimated_savings, driver_age, logged_hours)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, partnerId, partnerName, num(body.estimatedSavings), num(body.driverAge), num(body.loggedHours)]
    );
    // Do not echo totals or other users' data back to the client.
    res.status(201).json({ success: true, id });
  } catch (err) {
    sendServerError(res, 'Failed to track insurance affiliate click', err);
  }
});

// Admin-only: lead data is not public.
router.get('/insurance-clicks', async (req, res) => {
  const auth = req.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const valid = ADMIN_TOKEN && token.length === ADMIN_TOKEN.length &&
    crypto.timingSafeEqual(Buffer.from(token), Buffer.from(ADMIN_TOKEN));
  if (!valid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { rows } = await query(
      'SELECT * FROM roadready.insurance_clicks ORDER BY created_at DESC LIMIT 1000'
    );
    res.json(rows.map((r) => ({
      id: r.id,
      partnerId: r.partner_id,
      partnerName: r.partner_name,
      estimatedSavings: r.estimated_savings,
      driverAge: r.driver_age,
      loggedHours: r.logged_hours,
      timestamp: new Date(r.created_at).toISOString()
    })));
  } catch (err) {
    sendServerError(res, 'Failed to read insurance clicks', err);
  }
});

export default router;
