import Stripe from 'stripe';
import { PLANS, getEntitlement, upsertEntitlement, expireEntitlement } from './entitlements.js';
import { query } from '../db/index.js';

/**
 * Web payments via Stripe Checkout. Mobile apps must use in-app purchases
 * (RevenueCat) instead; the app never offers Stripe inside the iOS/Android build.
 *
 * Env:
 *   STRIPE_SECRET_KEY        sk_live_... / sk_test_...
 *   STRIPE_WEBHOOK_SECRET    whsec_... for POST /api/payments/stripe/webhook
 *   STRIPE_PRICE_MONTHLY     price_... recurring $4.99/month price
 *   STRIPE_PRICE_LIFETIME    optional; only if a one-time plan is added back to PLANS
 *   APP_URL                  web app origin for the return pages, e.g. https://roadready.app
 */
const PRICE_IDS = {
  lifetime: process.env.STRIPE_PRICE_LIFETIME || '',
  monthly: process.env.STRIPE_PRICE_MONTHLY || ''
};

// Every plan on sale needs a Stripe price id.
export const stripeConfigured = Boolean(
  process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET &&
  Object.keys(PLANS).every((plan) => PRICE_IDS[plan])
);

let client = null;
export function getStripe() {
  if (!client) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set');
    client = new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2, timeout: 15_000 });
  }
  return client;
}

// Tests swap in a fake client.
export function setStripeClient(fake) {
  client = fake;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ownerFor = (userId) => (typeof userId === 'string' && UUID_RE.test(userId) ? `user:${userId.toLowerCase()}` : null);
const fromUnix = (s) => (typeof s === 'number' ? new Date(s * 1000) : null);
const idOf = (v) => (typeof v === 'string' ? v : v?.id || null);

export async function createCheckoutSession({ user, plan, appUrl }) {
  const existing = await getEntitlement(`user:${user.id}`, 'stripe');
  const base = appUrl.replace(/\/+$/, '');
  const metadata = { user_id: user.id, plan };

  const recurring = Boolean(PLANS[plan]?.interval);
  const params = {
    mode: recurring ? 'subscription' : 'payment',
    line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
    client_reference_id: user.id,
    metadata,
    success_url: `${base}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/?checkout=cancelled`,
    allow_promotion_codes: true
  };
  if (existing?.external_customer_id) {
    params.customer = existing.external_customer_id;
  } else if (user.email) {
    params.customer_email = user.email;
  }
  if (recurring) {
    params.subscription_data = { metadata };
  } else {
    params.payment_intent_data = { metadata };
    // One-time payments only create a Stripe customer when asked; we need one for receipts and the billing portal.
    if (!params.customer) params.customer_creation = 'always';
  }

  const session = await getStripe().checkout.sessions.create(params);
  return session.url;
}

export async function createPortalSession({ user, appUrl }) {
  const existing = await getEntitlement(`user:${user.id}`, 'stripe');
  if (!existing?.external_customer_id) return null;
  const session = await getStripe().billingPortal.sessions.create({
    customer: existing.external_customer_id,
    return_url: appUrl
  });
  return session.url;
}

/** Grants access from a completed Checkout Session (webhook, or the return page as a fallback). */
export async function applyCheckoutSession(session) {
  if (!['paid', 'no_payment_required'].includes(session.payment_status)) return false;
  const userId = session.client_reference_id || session.metadata?.user_id;
  const owner = ownerFor(userId);
  if (!owner) return false;

  if (session.mode === 'subscription') {
    const sub = await getStripe().subscriptions.retrieve(idOf(session.subscription));
    return applySubscription(sub, userId);
  }

  // One-time payments grant permanent access (no one-time plan is on sale today,
  // but earlier lifetime purchases and manual payment links are still honoured).
  const plan = 'lifetime';
  await upsertEntitlement({
    ownerId: owner,
    provider: 'stripe',
    plan,
    price: typeof session.amount_total === 'number' ? session.amount_total / 100 : null,
    currency: (session.currency || 'usd').toUpperCase(),
    unlockedAt: new Date(),
    expiresAt: null,
    willRenew: false,
    store: 'stripe',
    externalCustomerId: idOf(session.customer),
    externalRef: idOf(session.payment_intent) || session.id
  });
  return true;
}

/** Keeps a monthly plan in step with its Stripe subscription (renewals, cancellations, failures). */
export async function applySubscription(sub, userIdHint) {
  const userId = sub.metadata?.user_id || userIdHint;
  const owner = ownerFor(userId);
  if (!owner) return false;

  // A lifetime purchase is never replaced by a subscription change.
  const current = await getEntitlement(owner, 'stripe');
  if (current && current.plan === 'lifetime' && !current.expires_at) return false;

  // Recent API versions put the billing period on the subscription item.
  const periodEnd = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
  const ended = ['canceled', 'unpaid', 'incomplete_expired'].includes(sub.status);
  const notStarted = sub.status === 'incomplete';
  if (notStarted) return false;

  const item = sub.items?.data?.[0];
  await upsertEntitlement({
    ownerId: owner,
    provider: 'stripe',
    plan: 'monthly',
    price: typeof item?.price?.unit_amount === 'number' ? item.price.unit_amount / 100 : PLANS.monthly.price,
    currency: (item?.price?.currency || 'usd').toUpperCase(),
    unlockedAt: fromUnix(sub.start_date) || new Date(),
    expiresAt: ended ? (fromUnix(sub.ended_at) || new Date()) : fromUnix(periodEnd),
    willRenew: !ended && !sub.cancel_at_period_end,
    store: 'stripe',
    externalCustomerId: idOf(sub.customer),
    externalRef: sub.id
  });
  return true;
}

/** A fully refunded one-time purchase loses access. */
export async function applyRefund(charge) {
  if (!charge.refunded) return false;
  const paymentIntent = idOf(charge.payment_intent);
  if (!paymentIntent) return false;
  const { rows } = await query(
    `SELECT owner_id FROM roadready.entitlements
      WHERE provider = 'stripe' AND external_ref = $1 AND plan = 'lifetime'`,
    [paymentIntent]
  );
  for (const r of rows) await expireEntitlement(r.owner_id, 'stripe');
  return rows.length > 0;
}

/** On account deletion: stop future monthly charges. */
export async function cancelSubscriptionFor(ownerId) {
  const e = await getEntitlement(ownerId, 'stripe');
  if (!e || e.plan !== 'monthly' || !e.external_ref?.startsWith('sub_') || !e.will_renew) return;
  await getStripe().subscriptions.cancel(e.external_ref);
}
