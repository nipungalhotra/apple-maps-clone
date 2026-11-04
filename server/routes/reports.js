import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import { writeLimiter } from '../middleware/security.js';
import { storagePath, readJson, writeJson, toSafeMap, cleanString, sendServerError } from '../lib/storage.js';

const REPORTS_FILE = storagePath('reports.json');
const MAX_REPORTS_PER_ZONE = 50;

const SEED_REPORTS = {
  'candlestick-open-ground': [
    { id: 'rep-1', author: 'Marcus V.', createdAt: '2026-01-01T00:00:00.000Z', status: 'Gate Open', surface: 'Dry & Clear', notes: 'Completely empty right now. Only 1 other learner practicing manual.' },
    { id: 'rep-2', author: 'Elena R.', createdAt: '2026-01-01T00:00:00.000Z', status: 'Gate Open', surface: 'Clean', notes: 'Great breeze. Great for motorcycle counter-steering.' }
  ],
  'ccsf-lower-parking': [
    { id: 'rep-3', author: 'Sarah K.', createdAt: '2026-01-01T00:00:00.000Z', status: 'Open Weekend', surface: 'Paved', notes: 'No campus security. Painted bays make parallel parking super easy.' }
  ]
};
if (!fs.existsSync(REPORTS_FILE)) writeJson(REPORTS_FILE, SEED_REPORTS);

const router = express.Router();

// Get all reports or for a specific ground
router.get('/', (req, res) => {
  try {
    const reports = toSafeMap(readJson(REPORTS_FILE, {}));
    const zoneId = typeof req.query.zoneId === 'string' ? req.query.zoneId : null;
    if (zoneId) {
      return res.json(reports[zoneId] || []);
    }
    res.json({ ...reports });
  } catch (err) {
    sendServerError(res, 'Failed to read community reports', err);
  }
});

// Post new ground report (rate-limited & validated)
router.post('/', writeLimiter, (req, res) => {
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
    if (!/^[A-Za-z0-9_-]+$/.test(zoneId)) {
      return res.status(400).json({ error: 'Invalid zoneId' });
    }

    const reports = toSafeMap(readJson(REPORTS_FILE, {}));
    const list = Array.isArray(reports[zoneId]) ? reports[zoneId] : [];

    const newEntry = {
      id: `rep-${crypto.randomUUID()}`,
      author,
      createdAt: new Date().toISOString(),
      status,
      surface,
      notes
    };

    reports[zoneId] = [newEntry, ...list].slice(0, MAX_REPORTS_PER_ZONE);
    writeJson(REPORTS_FILE, { ...reports });

    res.status(201).json({ success: true, report: newEntry, count: reports[zoneId].length });
  } catch (err) {
    sendServerError(res, 'Failed to save community report', err);
  }
});

export default router;
