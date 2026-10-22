import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeLimiter } from '../middleware/security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, '../storage');
const REPORTS_FILE = path.join(STORAGE_DIR, 'reports.json');

const router = express.Router();

// Get all reports or for a specific ground
router.get('/', (req, res) => {
  try {
    const raw = fs.readFileSync(REPORTS_FILE, 'utf-8');
    const reports = JSON.parse(raw);
    const { zoneId } = req.query;
    if (zoneId) {
      return res.json(reports[zoneId] || []);
    }
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read community reports', details: err.message });
  }
});

// Post new ground report (Rate-limited & sanitized)
router.post('/', writeLimiter, (req, res) => {
  try {
    let { zoneId, author = 'Anonymous Learner', status = 'Gate Open', surface = 'Clean', notes } = req.body;
    if (!zoneId || !notes || typeof notes !== 'string') {
      return res.status(400).json({ error: 'zoneId and string notes are required' });
    }

    author = String(author).slice(0, 50).trim();
    status = String(status).slice(0, 40).trim();
    surface = String(surface).slice(0, 40).trim();
    notes = String(notes).slice(0, 500).trim();

    const raw = fs.readFileSync(REPORTS_FILE, 'utf-8');
    const reports = JSON.parse(raw);

    if (!reports[zoneId]) {
      reports[zoneId] = [];
    }

    const newEntry = {
      id: `rep-${Date.now()}`,
      author,
      timeAgo: 'Just now',
      status,
      surface,
      notes
    };

    reports[zoneId].unshift(newEntry);
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2));

    res.status(201).json({ success: true, report: newEntry, count: reports[zoneId].length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save community report', details: err.message });
  }
});

export default router;
