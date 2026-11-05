import { query } from '../db/index.js';

/**
 * Plans on sale. RoadReady is sold on the website through Stripe as a single
 * $4.99/month subscription. The paywall reads this list from /api/payments/config,
 * so adding a plan here (plus its Stripe price id) is all it takes to offer it.
 *
 * Existing "lifetime" entitlements (from earlier one-time purchases) keep working;
 * lifetime is simply no longer offered.
 */
export const PLANS = {
  monthly: { id: 'monthly', price: 4.99, currency: 'USD', interval: 'month', label: 'Learner PRO Monthly' }
};

export const isPlan = (plan) => typeof plan === 'string' && Object.hasOwn(PLANS, plan);

const FREE = () => ({ isPro: false, tier: 'free', unlockedAt: null, expiresAt: null });

const iso = (d) => (d ? new Date(d).toISOString() : null);
const isActive = (row, now = Date.now()) => !row.expires_at || new Date(row.expires_at).getTime() > now;

/**
 * Current plan for an owner, combining every provider: lifetime beats anything
 * that expires; otherwise the latest expiry wins.
 */
export async function loadSubscription(ownerId) {
  const { rows } = await query('SELECT * FROM roadready.entitlements WHERE owner_id = $1', [ownerId]);
  const active = rows.filter((r) => isActive(r));
  if (active.length === 0) return FREE();

  active.sort((a, b) => {
    if (!a.expires_at) return -1;
    if (!b.expires_at) return 1;
    return new Date(b.expires_at) - new Date(a.expires_at);
  });
  const best = active[0];
  return {
    isPro: true,
    tier: best.plan,
    price: best.price === null ? null : Number(best.price),
    currency: best.currency,
    unlockedAt: iso(best.unlocked_at),
    expiresAt: iso(best.expires_at),
    willRenew: best.will_renew,
    provider: best.provider,
    store: best.store,
    simulated: best.provider === 'simulated',
    // Where the person manages or cancels it.
    manageVia: best.provider === 'stripe' ? 'web' : best.provider === 'revenuecat' ? 'store' : null
  };
}

export async function getEntitlement(ownerId, provider) {
  const { rows } = await query(
    'SELECT * FROM roadready.entitlements WHERE owner_id = $1 AND provider = $2',
    [ownerId, provider]
  );
  return rows[0] || null;
}

export async function upsertEntitlement(e, q = { query }) {
  await q.query(
    `INSERT INTO roadready.entitlements
       (owner_id, provider, plan, price, currency, unlocked_at, expires_at, will_renew, store,
        external_customer_id, external_ref, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
     ON CONFLICT (owner_id, provider) DO UPDATE SET
       plan = EXCLUDED.plan, price = EXCLUDED.price, currency = EXCLUDED.currency,
       unlocked_at = EXCLUDED.unlocked_at, expires_at = EXCLUDED.expires_at,
       will_renew = EXCLUDED.will_renew, store = EXCLUDED.store,
       external_customer_id = COALESCE(EXCLUDED.external_customer_id, roadready.entitlements.external_customer_id),
       external_ref = EXCLUDED.external_ref, updated_at = now()`,
    [
      e.ownerId, e.provider, e.plan, e.price ?? null, e.currency ?? null,
      e.unlockedAt ?? null, e.expiresAt ?? null, Boolean(e.willRenew), e.store ?? null,
      e.externalCustomerId ?? null, e.externalRef ?? null
    ]
  );
}

/** Ends access now but keeps the row (and its customer id) for history and re-purchase. */
export async function expireEntitlement(ownerId, provider) {
  await query(
    `UPDATE roadready.entitlements SET expires_at = now(), will_renew = false, updated_at = now()
      WHERE owner_id = $1 AND provider = $2 AND (expires_at IS NULL OR expires_at > now())`,
    [ownerId, provider]
  );
}

export async function deleteEntitlement(ownerId, provider) {
  await query('DELETE FROM roadready.entitlements WHERE owner_id = $1 AND provider = $2', [ownerId, provider]);
}

/** True if this webhook event was already processed. */
export async function eventSeen(provider, eventId) {
  const { rows } = await query(
    'SELECT 1 FROM roadready.payment_events WHERE provider = $1 AND event_id = $2',
    [provider, eventId]
  );
  return rows.length > 0;
}

export async function markEventProcessed(provider, eventId, eventType) {
  await query(
    `INSERT INTO roadready.payment_events (provider, event_id, event_type) VALUES ($1, $2, $3)
     ON CONFLICT (provider, event_id) DO NOTHING`,
    [provider, eventId, String(eventType).slice(0, 100)]
  );
}
