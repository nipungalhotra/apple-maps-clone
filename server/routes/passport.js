import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeLimiter } from '../middleware/security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, '../storage');
const PASSPORT_FILE = path.join(STORAGE_DIR, 'passport.json');

const router = express.Router();

// Get hours and badges
router.get('/', (req, res) => {
  try {
    const raw = fs.readFileSync(PASSPORT_FILE, 'utf-8');
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read passport data', details: err.message });
  }
});

// Log an hour (Rate-limited & validated)
router.post('/log', writeLimiter, (req, res) => {
  try {
    const hours = Math.max(1, Math.min(10, Number(req.body.hours) || 1));
    const isNight = Boolean(req.body.isNight);
    const isHighway = Boolean(req.body.isHighway);

    const raw = fs.readFileSync(PASSPORT_FILE, 'utf-8');
    const passport = JSON.parse(raw);

    passport.loggedHours = Math.min(passport.targetHours, passport.loggedHours + hours);
    if (isNight) passport.nightHours += hours;
    if (isHighway) passport.highwayHours += hours;

    const badgeMap = [
      { thresh: 5, name: 'First Ignition' },
      { thresh: 15, name: 'Friction Master' },
      { thresh: 25, name: 'Cone Wizard' },
      { thresh: 35, name: 'Highway Navigator' },
      { thresh: 50, name: 'Road Ready Master' }
    ];

    badgeMap.forEach(b => {
      if (passport.loggedHours >= b.thresh && !passport.badges.includes(b.name)) {
        passport.badges.push(b.name);
      }
    });

    fs.writeFileSync(PASSPORT_FILE, JSON.stringify(passport, null, 2));
    res.json({ success: true, passport });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update passport', details: err.message });
  }
});

export default router;
