import express from 'express';
import { writeLimiter } from '../middleware/security.js';
import { storagePath, readJson, writeJson, toSafeMap, requireClientId, sendServerError } from '../lib/storage.js';

const PASSPORT_FILE = storagePath('passport.json');

const DEFAULT_PASSPORT = () => ({
  loggedHours: 0,
  targetHours: 50,
  nightHours: 0,
  highwayHours: 0,
  badges: []
});

const BADGES = [
  { thresh: 5, name: 'First Ignition' },
  { thresh: 15, name: 'Friction Master' },
  { thresh: 25, name: 'Cone Wizard' },
  { thresh: 35, name: 'Highway Navigator' },
  { thresh: 50, name: 'Road Ready Master' }
];

const router = express.Router();
router.use(requireClientId);

// Get hours and badges for this client
router.get('/', (req, res) => {
  try {
    const all = toSafeMap(readJson(PASSPORT_FILE, {}));
    res.json(all[req.clientId] || DEFAULT_PASSPORT());
  } catch (err) {
    sendServerError(res, 'Failed to read passport data', err);
  }
});

// Log practice hours for this client (rate-limited & strictly validated)
router.post('/log', writeLimiter, (req, res) => {
  try {
    const { hours = 1, isNight = false, isHighway = false } = req.body || {};
    if (typeof hours !== 'number' || !Number.isFinite(hours) || hours <= 0 || hours > 12) {
      return res.status(400).json({ error: 'hours must be a number between 0 and 12' });
    }
    if (typeof isNight !== 'boolean' || typeof isHighway !== 'boolean') {
      return res.status(400).json({ error: 'isNight and isHighway must be booleans' });
    }

    const all = toSafeMap(readJson(PASSPORT_FILE, {}));
    const passport = { ...DEFAULT_PASSPORT(), ...(all[req.clientId] || {}) };

    passport.loggedHours = Math.min(passport.targetHours, passport.loggedHours + hours);
    if (isNight) passport.nightHours += hours;
    if (isHighway) passport.highwayHours += hours;

    BADGES.forEach(b => {
      if (passport.loggedHours >= b.thresh && !passport.badges.includes(b.name)) {
        passport.badges.push(b.name);
      }
    });

    all[req.clientId] = passport;
    writeJson(PASSPORT_FILE, { ...all });
    res.json({ success: true, passport });
  } catch (err) {
    sendServerError(res, 'Failed to update passport', err);
  }
});

export default router;
