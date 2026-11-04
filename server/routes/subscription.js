import express from 'express';
import crypto from 'crypto';
import { writeLimiter } from '../middleware/security.js';
import { storagePath, readJson, writeJson, toSafeMap, requireClientId, sendServerError } from '../lib/storage.js';

const SUBSCRIPTION_FILE = storagePath('subscriptions.json');
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
// Simulated checkout is only allowed outside production, or when explicitly opted in.
// Real payments (Stripe / StoreKit / Play Billing) must replace this before launch.
const ALLOW_SIMULATED_PAYMENTS = !IS_PRODUCTION || process.env.ALLOW_SIMULATED_PAYMENTS === 'true';

const PLAN_PRICES = { lifetime: 29.99, monthly: 4.99 };
const DEFAULT_SUBSCRIPTION = () => ({ isPro: false, tier: 'free', unlockedAt: null, expiresAt: null });

const router = express.Router();
router.use(requireClientId);

// Get subscription status for this client
router.get('/', (req, res) => {
  try {
    const all = toSafeMap(readJson(SUBSCRIPTION_FILE, {}));
    res.json(all[req.clientId] || DEFAULT_SUBSCRIPTION());
  } catch (err) {
    sendServerError(res, 'Failed to read subscription', err);
  }
});

// Upgrade to Pro (SIMULATED — disabled in production unless opted in)
router.post('/upgrade', writeLimiter, (req, res) => {
  if (!ALLOW_SIMULATED_PAYMENTS) {
    return res.status(501).json({ error: 'Payments are not configured on this server' });
  }
  try {
    const tier = req.body?.tier;
    if (!Object.hasOwn(PLAN_PRICES, tier)) {
      return res.status(400).json({ error: 'tier must be "lifetime" or "monthly"' });
    }
    const now = new Date();
    const updated = {
      isPro: true,
      tier,
      price: PLAN_PRICES[tier], // price is decided by the server, never the client
      unlockedAt: now.toISOString(),
      expiresAt: tier === 'monthly' ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      transactionId: `SIM-${crypto.randomUUID()}`,
      simulated: true
    };
    const all = toSafeMap(readJson(SUBSCRIPTION_FILE, {}));
    all[req.clientId] = updated;
    writeJson(SUBSCRIPTION_FILE, { ...all });
    res.json({ success: true, subscription: updated });
  } catch (err) {
    sendServerError(res, 'Failed to upgrade subscription', err);
  }
});

// Reset to Free (development/testing only)
router.post('/reset', writeLimiter, (req, res) => {
  if (IS_PRODUCTION) {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    const all = toSafeMap(readJson(SUBSCRIPTION_FILE, {}));
    all[req.clientId] = DEFAULT_SUBSCRIPTION();
    writeJson(SUBSCRIPTION_FILE, { ...all });
    res.json({ success: true, subscription: all[req.clientId] });
  } catch (err) {
    sendServerError(res, 'Failed to reset subscription', err);
  }
});

export default router;
