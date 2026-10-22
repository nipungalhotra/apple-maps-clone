import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeLimiter } from '../middleware/security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, '../storage');
const INSURANCE_CLICKS_FILE = path.join(STORAGE_DIR, 'insurance_clicks.json');

const router = express.Router();

// Initialize clicks store
if (!fs.existsSync(INSURANCE_CLICKS_FILE)) {
  fs.writeFileSync(INSURANCE_CLICKS_FILE, JSON.stringify([], null, 2));
}

// Track insurance quote click
router.post('/insurance-click', writeLimiter, (req, res) => {
  try {
    const clickData = req.body;
    const raw = fs.readFileSync(INSURANCE_CLICKS_FILE, 'utf-8');
    const clicks = JSON.parse(raw);

    const record = {
      id: `aff-click-${Date.now()}`,
      partnerId: String(clickData.partnerId || 'partner').slice(0, 50),
      partnerName: String(clickData.partnerName || 'Partner').slice(0, 80),
      cpaPayout: Number(clickData.cpaPayout) || 75.00,
      estimatedSavings: Number(clickData.estimatedSavings) || 450,
      driverAge: Number(clickData.driverAge) || 17,
      loggedHours: Number(clickData.loggedHours) || 0,
      timestamp: new Date().toISOString()
    };

    clicks.unshift(record);
    fs.writeFileSync(INSURANCE_CLICKS_FILE, JSON.stringify(clicks, null, 2));
    res.json({ success: true, trackingRecord: record, totalDispatchedLeads: clicks.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to track insurance affiliate click', details: err.message });
  }
});

// Get insurance click records
router.get('/insurance-clicks', (req, res) => {
  try {
    const raw = fs.readFileSync(INSURANCE_CLICKS_FILE, 'utf-8');
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read insurance clicks', details: err.message });
  }
});

export default router;
