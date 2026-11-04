import express from 'express';
import crypto from 'crypto';
import { writeLimiter } from '../middleware/security.js';
import { storagePath, readJson, writeJson, cleanString, sendServerError } from '../lib/storage.js';

const INSURANCE_CLICKS_FILE = storagePath('insurance_clicks.json');
// Token required to read affiliate lead data. Unset = endpoint disabled.
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

const router = express.Router();

// Track insurance quote click
router.post('/insurance-click', writeLimiter, (req, res) => {
  try {
    const body = req.body || {};
    const partnerId = cleanString(body.partnerId, { max: 60, required: true });
    const partnerName = cleanString(body.partnerName, { max: 80, fallback: '' });
    if (!partnerId || partnerName === null) {
      return res.status(400).json({ error: 'partnerId is required' });
    }
    const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

    const clicks = readJson(INSURANCE_CLICKS_FILE, []);
    const record = {
      id: `aff-click-${crypto.randomUUID()}`,
      partnerId,
      partnerName,
      estimatedSavings: num(body.estimatedSavings),
      driverAge: num(body.driverAge),
      loggedHours: num(body.loggedHours),
      timestamp: new Date().toISOString()
    };

    const next = [record, ...(Array.isArray(clicks) ? clicks : [])].slice(0, 10_000);
    writeJson(INSURANCE_CLICKS_FILE, next);
    // Do not echo totals or other users' data back to the client.
    res.status(201).json({ success: true, id: record.id });
  } catch (err) {
    sendServerError(res, 'Failed to track insurance affiliate click', err);
  }
});

// Admin-only: lead data is not public.
router.get('/insurance-clicks', (req, res) => {
  const auth = req.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const valid = ADMIN_TOKEN && token.length === ADMIN_TOKEN.length &&
    crypto.timingSafeEqual(Buffer.from(token), Buffer.from(ADMIN_TOKEN));
  if (!valid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json(readJson(INSURANCE_CLICKS_FILE, []));
});

export default router;
