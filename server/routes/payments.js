import express from 'express';
import crypto from 'crypto';
import { writeLimiter } from '../middleware/security.js';
import { identify, requireUser } from '../lib/auth.js';
import { sendServerError } from '../lib/validation.js';
import { PLANS, isPlan, loadSubscription, eventSeen, markEventProcessed } from '../lib/entitlements.js';
import {
  stripeConfigured, getStripe, createCheckoutSession, createPortalSession,
  applyCheckoutSession, applySubscription, applyRefund
} from '../lib/stripe.js';
import { revenueCatConfigured, syncRevenueCatUser, accountIdsInEvent } from '../lib/revenuecat.js';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ALLOW_SIMULATED_PAYMENTS = !IS_PRODUCTION || process.env.ALLOW_SIMULATED_PAYMENTS === 'true';

// Where Stripe sends people back to. Production must set APP_URL; dev falls back to the caller's origin.
function appUrlFor(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, '');
  if (IS_PRODUCTION) return null;
  const origin = req.get('Origin');
  return origin && /^https?:\/\//.test(origin) ? origin : 'http://localhost:3000';
}

const router = express.Router();

// What the paywall can offer on this server.
router.get('/config', (req, res) => {
  res.json({
    plans: Object.values(PLANS),
    web: { stripe: stripeConfigured },
    native: { revenuecat: revenueCatConfigured },
    simulated: ALLOW_SIMULATED_PAYMENTS
  });
});

// ---------- Stripe (web) ----------

router.post('/stripe/checkout', writeLimiter, identify, requireUser, async (req, res) => {
  if (!stripeConfigured) return res.status(501).json({ error: 'Web payments are not configured' });
  const plan = req.body?.plan;
  if (!isPlan(plan)) return res.status(400).json({ error: 'plan must be "lifetime" or "monthly"' });
  const appUrl = appUrlFor(req);
  if (!appUrl) return res.status(500).json({ error: 'APP_URL is not configured' });

  try {
    const current = await loadSubscription(req.ownerId);
    if (current.isPro && (current.tier === 'lifetime' || plan === current.tier)) {
      return res.status(409).json({ error: 'You already have this plan', code: 'already_owned' });
    }
    const url = await createCheckoutSession({ user: req.user, plan, appUrl });
    res.json({ url });
  } catch (err) {
    sendServerError(res, 'Could not start checkout', err);
  }
});

// Called by the return page so access shows up even if the webhook is a few seconds behind.
router.post('/stripe/confirm', writeLimiter, identify, requireUser, async (req, res) => {
  if (!stripeConfigured) return res.status(501).json({ error: 'Web payments are not configured' });
  const sessionId = req.body?.sessionId;
  if (typeof sessionId !== 'string' || !/^cs_[A-Za-z0-9_]{10,200}$/.test(sessionId)) {
    return res.status(400).json({ error: 'Invalid session id' });
  }
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    // Only the person who started the checkout can apply it.
    if (session.client_reference_id !== req.user.id) {
      return res.status(403).json({ error: 'This checkout belongs to another account' });
    }
    await applyCheckoutSession(session);
    res.json({ subscription: await loadSubscription(req.ownerId) });
  } catch (err) {
    sendServerError(res, 'Could not confirm checkout', err);
  }
});

// Stripe-hosted page to cancel the monthly plan, update the card or download receipts.
router.post('/stripe/portal', writeLimiter, identify, requireUser, async (req, res) => {
  if (!stripeConfigured) return res.status(501).json({ error: 'Web payments are not configured' });
  const appUrl = appUrlFor(req);
  if (!appUrl) return res.status(500).json({ error: 'APP_URL is not configured' });
  try {
    const url = await createPortalSession({ user: req.user, appUrl });
    if (!url) return res.status(404).json({ error: 'No web purchase found for this account' });
    res.json({ url });
  } catch (err) {
    sendServerError(res, 'Could not open billing portal', err);
  }
});

// ---------- RevenueCat (App Store / Google Play) ----------

// The app calls this after a purchase or "Restore purchases"; the server re-checks with RevenueCat.
router.post('/revenuecat/sync', writeLimiter, identify, requireUser, async (req, res) => {
  if (!revenueCatConfigured) return res.status(501).json({ error: 'In-app purchases are not configured' });
  try {
    await syncRevenueCatUser(req.user.id);
    res.json({ subscription: await loadSubscription(req.ownerId) });
  } catch (err) {
    sendServerError(res, 'Could not check your purchases', err);
  }
});

export default router;

// ---------- Webhooks (mounted in index.js before the JSON body parser) ----------

/** Stripe needs the raw body to verify the signature. */
export async function stripeWebhook(req, res) {
  if (!stripeConfigured) return res.status(501).json({ error: 'Not configured' });
  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      req.body,
      req.get('Stripe-Signature') || '',
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    if (await eventSeen('stripe', event.id)) return res.json({ received: true, duplicate: true });
    const obj = event.data.object;
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await applyCheckoutSession(obj);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await applySubscription(obj);
        break;
      case 'charge.refunded':
        await applyRefund(obj);
        break;
      default:
        break; // other events are acknowledged and ignored
    }
    await markEventProcessed('stripe', event.id, event.type);
    res.json({ received: true });
  } catch (err) {
    // 500 makes Stripe retry later.
    sendServerError(res, 'Failed to process Stripe event', err);
  }
}

export async function revenueCatWebhook(req, res) {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH || '';
  const got = req.get('Authorization') || '';
  const ok = expected && got.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
  if (!ok || !revenueCatConfigured) return res.status(401).json({ error: 'Unauthorized' });

  const event = req.body?.event;
  if (!event || typeof event.id !== 'string') return res.status(400).json({ error: 'Missing event' });

  try {
    if (await eventSeen('revenuecat', event.id)) return res.json({ received: true, duplicate: true });
    // The event only says "something changed"; the current state always comes from RevenueCat's API.
    for (const userId of accountIdsInEvent(event)) {
      await syncRevenueCatUser(userId);
    }
    await markEventProcessed('revenuecat', event.id, event.type || 'unknown');
    res.json({ received: true });
  } catch (err) {
    sendServerError(res, 'Failed to process RevenueCat event', err);
  }
}
