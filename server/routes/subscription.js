import express from 'express';
import crypto from 'crypto';
import { writeLimiter } from '../middleware/security.js';
import { identify, requireOwner, authConfigured } from '../lib/auth.js';
import { sendServerError } from '../lib/validation.js';
import { PLANS, isPlan, loadSubscription, upsertEntitlement, deleteEntitlement } from '../lib/entitlements.js';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
// Simulated checkout for development and demos only. Real purchases go through
// /api/payments (Stripe on the web, RevenueCat in the mobile apps).
const ALLOW_SIMULATED_PAYMENTS = !IS_PRODUCTION || process.env.ALLOW_SIMULATED_PAYMENTS === 'true';

export { loadSubscription };

const router = express.Router();
router.use(identify, requireOwner);

// Current plan for the caller, across every payment provider
router.get('/', async (req, res) => {
  try {
    res.json(await loadSubscription(req.ownerId));
  } catch (err) {
    sendServerError(res, 'Failed to read subscription', err);
  }
});

// Simulated upgrade (no money moves). Disabled in production unless explicitly opted in.
router.post('/upgrade', writeLimiter, async (req, res) => {
  if (!ALLOW_SIMULATED_PAYMENTS) {
    return res.status(501).json({ error: 'Simulated checkout is disabled on this server' });
  }
  // Purchases belong to an account so they can be restored on another device.
  if (authConfigured && !req.user) {
    return res.status(401).json({ error: 'Sign in to upgrade', code: 'sign_in_required' });
  }
  try {
    const tier = req.body?.tier;
    if (!isPlan(tier)) {
      return res.status(400).json({ error: `tier must be one of: ${Object.keys(PLANS).join(', ')}` });
    }
    const now = new Date();
    await upsertEntitlement({
      ownerId: req.ownerId,
      provider: 'simulated',
      plan: tier,
      price: PLANS[tier].price, // price is decided by the server, never the client
      currency: PLANS[tier].currency,
      unlockedAt: now,
      expiresAt: tier === 'monthly' ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) : null,
      willRenew: false,
      externalRef: `SIM-${crypto.randomUUID()}`
    });
    res.json({ success: true, subscription: await loadSubscription(req.ownerId) });
  } catch (err) {
    sendServerError(res, 'Failed to upgrade subscription', err);
  }
});

// Remove a simulated plan (development/testing only). Real purchases are never touched here.
router.post('/reset', writeLimiter, async (req, res) => {
  if (IS_PRODUCTION) {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    await deleteEntitlement(req.ownerId, 'simulated');
    res.json({ success: true, subscription: await loadSubscription(req.ownerId) });
  } catch (err) {
    sendServerError(res, 'Failed to reset subscription', err);
  }
});

export default router;
