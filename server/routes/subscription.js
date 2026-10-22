import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeLimiter } from '../middleware/security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, '../storage');
const SUBSCRIPTION_FILE = path.join(STORAGE_DIR, 'subscriptions.json');

const router = express.Router();

// Get subscription status
router.get('/', (req, res) => {
  try {
    const raw = fs.readFileSync(SUBSCRIPTION_FILE, 'utf-8');
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read subscription', details: err.message });
  }
});

// Upgrade to Pro (Rate-limited & validated)
router.post('/upgrade', writeLimiter, (req, res) => {
  try {
    const { tier = 'lifetime', price = 29.99 } = req.body;
    const now = new Date();
    const updated = {
      isPro: true,
      tier: String(tier).slice(0, 20),
      price: Number(price) || 29.99,
      unlockedAt: now.toISOString(),
      expiresAt: tier === 'monthly' ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      transactionId: `TXN-MAPS-${Date.now()}`
    };
    fs.writeFileSync(SUBSCRIPTION_FILE, JSON.stringify(updated, null, 2));
    res.json({ success: true, subscription: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upgrade subscription', details: err.message });
  }
});

// Reset to Free (testing only)
router.post('/reset', writeLimiter, (req, res) => {
  try {
    const reset = {
      isPro: false,
      tier: 'free',
      unlockedAt: null,
      expiresAt: null
    };
    fs.writeFileSync(SUBSCRIPTION_FILE, JSON.stringify(reset, null, 2));
    res.json({ success: true, subscription: reset });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset subscription', details: err.message });
  }
});

export default router;
