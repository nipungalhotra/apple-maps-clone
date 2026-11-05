import express from 'express';
import crypto from 'crypto';
import { writeLimiter } from '../middleware/security.js';
import { identify, requireOwner, authConfigured } from '../lib/auth.js';
import { query } from '../db/index.js';
import { sendServerError } from '../lib/validation.js';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
// Simulated checkout is only allowed outside production, or when explicitly opted in.
// Real payments (Stripe / StoreKit / Play Billing) must replace this before launch.
const ALLOW_SIMULATED_PAYMENTS = !IS_PRODUCTION || process.env.ALLOW_SIMULATED_PAYMENTS === 'true';

const PLAN_PRICES = { lifetime: 29.99, monthly: 4.99 };
const FREE = () => ({ isPro: false, tier: 'free', unlockedAt: null, expiresAt: null });

function toSubscription(row) {
  if (!row || row.tier === 'free') return FREE();
  const expiresAt = row.expires_at ? new Date(row.expires_at).toISOString() : null;
  if (expiresAt && Date.parse(expiresAt) <= Date.now()) return FREE();
  return {
    isPro: true,
    tier: row.tier,
    price: row.price === null ? null : Number(row.price),
    unlockedAt: row.unlocked_at ? new Date(row.unlocked_at).toISOString() : null,
    expiresAt,
    transactionId: row.transaction_id,
    simulated: row.simulated
  };
}

export async function loadSubscription(ownerId) {
  const { rows } = await query('SELECT * FROM roadready.subscriptions WHERE owner_id = $1', [ownerId]);
  return toSubscription(rows[0]);
}

const router = express.Router();
router.use(identify, requireOwner);

// Get subscription status for the caller
router.get('/', async (req, res) => {
  try {
    res.json(await loadSubscription(req.ownerId));
  } catch (err) {
    sendServerError(res, 'Failed to read subscription', err);
  }
});

// Upgrade to Pro (SIMULATED — disabled in production unless opted in)
router.post('/upgrade', writeLimiter, async (req, res) => {
  if (!ALLOW_SIMULATED_PAYMENTS) {
    return res.status(501).json({ error: 'Payments are not configured on this server' });
  }
  // Purchases belong to an account so they can be restored on another device.
  if (authConfigured && !req.user) {
    return res.status(401).json({ error: 'Sign in to upgrade', code: 'sign_in_required' });
  }
  try {
    const tier = req.body?.tier;
    if (!Object.hasOwn(PLAN_PRICES, tier)) {
      return res.status(400).json({ error: 'tier must be "lifetime" or "monthly"' });
    }
    const now = new Date();
    const expiresAt = tier === 'monthly' ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
    const { rows } = await query(
      `INSERT INTO roadready.subscriptions (owner_id, tier, price, unlocked_at, expires_at, transaction_id, simulated, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, now())
       ON CONFLICT (owner_id) DO UPDATE SET
         tier = EXCLUDED.tier, price = EXCLUDED.price, unlocked_at = EXCLUDED.unlocked_at,
         expires_at = EXCLUDED.expires_at, transaction_id = EXCLUDED.transaction_id,
         simulated = true, updated_at = now()
       RETURNING *`,
      // price is decided by the server, never the client
      [req.ownerId, tier, PLAN_PRICES[tier], now, expiresAt, `SIM-${crypto.randomUUID()}`]
    );
    res.json({ success: true, subscription: toSubscription(rows[0]) });
  } catch (err) {
    sendServerError(res, 'Failed to upgrade subscription', err);
  }
});

// Reset to Free (development/testing only)
router.post('/reset', writeLimiter, async (req, res) => {
  if (IS_PRODUCTION) {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    await query('DELETE FROM roadready.subscriptions WHERE owner_id = $1', [req.ownerId]);
    res.json({ success: true, subscription: FREE() });
  } catch (err) {
    sendServerError(res, 'Failed to reset subscription', err);
  }
});

export default router;
