import { upsertEntitlement, deleteEntitlement } from './entitlements.js';

/**
 * In-app purchases (App Store, Google Play) via RevenueCat.
 * The app uses the RevenueCat SDK with the Supabase user id as its app user id.
 * The server never trusts the app's claim: it always asks RevenueCat's REST API.
 *
 * Env:
 *   REVENUECAT_SECRET_KEY      secret API key (sk_...) for the REST API
 *   REVENUECAT_WEBHOOK_AUTH    value RevenueCat sends in the Authorization header of webhooks
 *   REVENUECAT_ENTITLEMENT_ID  entitlement that unlocks Pro (default "pro")
 */
const API = 'https://api.revenuecat.com/v1';
const ENTITLEMENT = process.env.REVENUECAT_ENTITLEMENT_ID || 'pro';

export const revenueCatConfigured = Boolean(process.env.REVENUECAT_SECRET_KEY);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isAccountId = (id) => typeof id === 'string' && UUID_RE.test(id);

const STORE_NAMES = { app_store: 'app_store', mac_app_store: 'app_store', play_store: 'play_store', stripe: 'stripe', promotional: 'promotional', amazon: 'amazon' };

async function rcFetch(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.REVENUECAT_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {})
    },
    signal: AbortSignal.timeout(10_000)
  });
  return res;
}

/** Reads the subscriber from RevenueCat and mirrors the Pro entitlement into our database. */
export async function syncRevenueCatUser(userId) {
  if (!revenueCatConfigured) throw new Error('RevenueCat is not configured');
  if (!isAccountId(userId)) return false;
  const owner = `user:${userId.toLowerCase()}`;

  const res = await rcFetch(`/subscribers/${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error(`RevenueCat returned ${res.status}`);
  const { subscriber } = await res.json();

  const ent = subscriber?.entitlements?.[ENTITLEMENT];
  if (!ent) {
    await deleteEntitlement(owner, 'revenuecat');
    return false;
  }

  const productId = ent.product_identifier;
  const sub = subscriber.subscriptions?.[productId];
  const oneTime = subscriber.non_subscriptions?.[productId];
  const purchase = sub || (Array.isArray(oneTime) ? oneTime[oneTime.length - 1] : null);

  // Grace periods (billing retry) still count as access.
  const expiry = [ent.expires_date, ent.grace_period_expires_date, sub?.grace_period_expires_date]
    .filter(Boolean)
    .map((d) => new Date(d))
    .sort((a, b) => b - a)[0] || null;
  const isLifetime = !ent.expires_date;
  const price = sub?.price?.amount ?? purchase?.price?.amount ?? null;

  await upsertEntitlement({
    ownerId: owner,
    provider: 'revenuecat',
    plan: isLifetime ? 'lifetime' : 'monthly',
    price,
    currency: sub?.price?.currency ?? purchase?.price?.currency ?? null,
    unlockedAt: ent.purchase_date ? new Date(ent.purchase_date) : new Date(),
    expiresAt: isLifetime ? null : expiry,
    willRenew: Boolean(sub && !sub.unsubscribe_detected_at && !sub.billing_issues_detected_at && !isLifetime),
    store: STORE_NAMES[purchase?.store] || purchase?.store || null,
    externalCustomerId: userId,
    externalRef: productId
  });
  return true;
}

/** Every account id a webhook event refers to (purchases, renewals, transfers between users). */
export function accountIdsInEvent(event) {
  const ids = new Set();
  const add = (v) => { if (isAccountId(v)) ids.add(v.toLowerCase()); };
  add(event?.app_user_id);
  add(event?.original_app_user_id);
  for (const list of [event?.aliases, event?.transferred_from, event?.transferred_to]) {
    if (Array.isArray(list)) list.forEach(add);
  }
  return [...ids];
}

/** On account deletion: remove the customer's data from RevenueCat too (best effort). */
export async function deleteRevenueCatUser(userId) {
  if (!revenueCatConfigured || !isAccountId(userId)) return;
  const res = await rcFetch(`/subscribers/${encodeURIComponent(userId)}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error(`RevenueCat delete returned ${res.status}`);
}
