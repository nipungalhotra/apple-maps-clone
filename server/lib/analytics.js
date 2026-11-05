import crypto from 'crypto';
import { query } from '../db/index.js';
import { PLANS } from './entitlements.js';

/**
 * First-party product analytics, stored in our own database.
 *
 * Only a short list of events is accepted, each with a fixed set of small props.
 * Nothing that identifies a person is stored: no IP address, no user agent string,
 * no email. The device id is one-way hashed (so an analytics row can never be used
 * to read that guest's data), and events are deleted after 13 months.
 */
export const RETENTION_DAYS = 395;

// event name -> allowed props (each a short string)
export const CLIENT_EVENTS = {
  app_open: [],
  paywall_view: ['feature'],
  checkout_start: ['plan'],
  signup_view: ['source'],
  install_prompt: ['result']
};

const DEVICES = new Set(['mobile', 'tablet', 'desktop']);
const short = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

export function hashVisitor(clientId) {
  return crypto.createHash('sha256').update(`roadready-analytics:${clientId}`).digest('hex').slice(0, 32);
}

function referrerHost(referrer, ownHost) {
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    return host && host !== ownHost ? host.slice(0, 100) : null;
  } catch {
    return null;
  }
}

/** Validates an event sent by the app. Returns null when it should be ignored. */
export function sanitizeClientEvent(body, { ownHost } = {}) {
  const name = body?.name;
  if (typeof name !== 'string' || !Object.hasOwn(CLIENT_EVENTS, name)) return null;

  const props = {};
  for (const key of CLIENT_EVENTS[name]) {
    const v = short(body?.props?.[key], 40);
    if (v) props[key] = v;
  }
  const path = short(typeof body?.path === 'string' ? body.path.split(/[?#]/)[0] : null, 200);
  const utm = body?.utm || {};
  return {
    name,
    props,
    path,
    referrerHost: typeof body?.referrer === 'string' ? referrerHost(body.referrer, ownHost) : null,
    utmSource: short(utm.source, 60)?.toLowerCase() || null,
    utmMedium: short(utm.medium, 60)?.toLowerCase() || null,
    utmCampaign: short(utm.campaign, 60)?.toLowerCase() || null,
    sessionId: typeof body?.sessionId === 'string' && /^[A-Za-z0-9_-]{8,40}$/.test(body.sessionId) ? body.sessionId : null,
    device: DEVICES.has(body?.device) ? body.device : null
  };
}

export async function recordEvent(event, { visitorId, userId = null }) {
  await query(
    `INSERT INTO roadready.analytics_events
       (id, name, visitor_id, user_id, session_id, path, referrer_host, utm_source, utm_medium, utm_campaign, device, props)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      crypto.randomUUID(), event.name, visitorId, userId, event.sessionId, event.path, event.referrerHost,
      event.utmSource, event.utmMedium, event.utmCampaign, event.device, JSON.stringify(event.props || {})
    ]
  );
}

export async function deleteOldEvents() {
  await query(`DELETE FROM roadready.analytics_events WHERE created_at < now() - ($1 || ' days')::interval`, [String(RETENTION_DAYS)]);
}

// ---------- Business metrics ----------

// Stripe's standard US pricing: 2.9% + 30¢ per card payment, plus 0.7% for Stripe Billing subscriptions.
const FEES = {
  percent: Number(process.env.PAYMENT_FEE_PERCENT ?? 0.036),
  fixed: Number(process.env.PAYMENT_FEE_FIXED ?? 0.30)
};
export const netPerPayment = (price) => Math.max(0, price - price * FEES.percent - FEES.fixed);

const pct = (num, den) => (den > 0 ? num / den : null);
const round = (n, d = 2) => (n === null || n === undefined || !Number.isFinite(n) ? null : Math.round(n * 10 ** d) / 10 ** d);

/**
 * Everything needed to answer "is this making money?" for the last `days` days.
 * includeSimulated counts test (simulated) purchases; leave it off for real numbers.
 */
export async function computeMetrics({ days = 30, includeSimulated = false, monthlyCosts } = {}) {
  const costs = Number.isFinite(monthlyCosts) ? monthlyCosts : Number(process.env.MONTHLY_COSTS_USD ?? 75);
  const since = new Date(Date.now() - days * 86_400_000);
  const providers = includeSimulated ? ['stripe', 'revenuecat', 'simulated'] : ['stripe', 'revenuecat'];
  const price = PLANS.monthly.price;
  const net = netPerPayment(price);

  const one = async (sql, params) => (await query(sql, params)).rows[0];

  const [visitors, paywall, checkout, signups, newPaid, active, churned, activeAtStart] = await Promise.all([
    one(`SELECT COUNT(DISTINCT visitor_id)::int AS n FROM roadready.analytics_events WHERE name = 'app_open' AND created_at >= $1`, [since]),
    one(`SELECT COUNT(DISTINCT visitor_id)::int AS n FROM roadready.analytics_events WHERE name = 'paywall_view' AND created_at >= $1`, [since]),
    one(`SELECT COUNT(DISTINCT visitor_id)::int AS n FROM roadready.analytics_events WHERE name = 'checkout_start' AND created_at >= $1`, [since]),
    one(`SELECT COUNT(*)::int AS n FROM roadready.profiles WHERE created_at >= $1`, [since]),
    one(`SELECT COUNT(DISTINCT owner_id)::int AS n FROM roadready.entitlements
          WHERE provider = ANY($2) AND unlocked_at >= $1`, [since, providers]),
    one(`SELECT COUNT(DISTINCT owner_id)::int AS total,
                COUNT(DISTINCT owner_id) FILTER (WHERE plan = 'monthly')::int AS monthly,
                COUNT(DISTINCT owner_id) FILTER (WHERE plan <> 'monthly')::int AS other
           FROM roadready.entitlements
          WHERE provider = ANY($1) AND (expires_at IS NULL OR expires_at > now())`, [providers]),
    one(`SELECT COUNT(DISTINCT owner_id)::int AS n FROM roadready.entitlements
          WHERE provider = ANY($2) AND plan = 'monthly' AND will_renew = false
            AND expires_at >= $1 AND expires_at <= now()`, [since, providers]),
    one(`SELECT COUNT(DISTINCT owner_id)::int AS n FROM roadready.entitlements
          WHERE provider = ANY($2) AND plan = 'monthly' AND unlocked_at < $1
            AND (expires_at IS NULL OR expires_at > $1)`, [since, providers])
  ]);

  // Where visitors and paying customers come from (first visit's source).
  const { rows: sources } = await query(
    `WITH first_open AS (
       SELECT DISTINCT ON (visitor_id) visitor_id,
              COALESCE(utm_source, referrer_host, 'direct') AS source
         FROM roadready.analytics_events
        WHERE name = 'app_open'
        ORDER BY visitor_id, created_at
     ),
     period_visitors AS (
       SELECT DISTINCT visitor_id FROM roadready.analytics_events WHERE name = 'app_open' AND created_at >= $1
     ),
     visitor_users AS (
       SELECT DISTINCT visitor_id, user_id FROM roadready.analytics_events WHERE user_id IS NOT NULL
     ),
     payers AS (
       SELECT DISTINCT substring(owner_id from 6)::uuid AS user_id FROM roadready.entitlements
        WHERE provider = ANY($2) AND owner_id LIKE 'user:%' AND unlocked_at >= $1
     )
     SELECT f.source,
            COUNT(DISTINCT pv.visitor_id)::int AS visitors,
            COUNT(DISTINCT p.user_id)::int AS paying
       FROM first_open f
       LEFT JOIN period_visitors pv ON pv.visitor_id = f.visitor_id
       LEFT JOIN visitor_users vu ON vu.visitor_id = f.visitor_id
       LEFT JOIN payers p ON p.user_id = vu.user_id
      GROUP BY f.source
     HAVING COUNT(DISTINCT pv.visitor_id) > 0 OR COUNT(DISTINCT p.user_id) > 0
      ORDER BY visitors DESC, paying DESC
      LIMIT 10`,
    [since, providers]
  );

  // Daily trend for the period.
  const { rows: daily } = await query(
    `WITH days AS (
       SELECT generate_series(date_trunc('day', $1::timestamptz), date_trunc('day', now()), interval '1 day') AS day
     )
     SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
            (SELECT COUNT(DISTINCT visitor_id) FROM roadready.analytics_events e
              WHERE e.name = 'app_open' AND e.created_at >= d.day AND e.created_at < d.day + interval '1 day')::int AS visitors,
            (SELECT COUNT(*) FROM roadready.profiles p
              WHERE p.created_at >= d.day AND p.created_at < d.day + interval '1 day')::int AS signups,
            (SELECT COUNT(DISTINCT owner_id) FROM roadready.entitlements en
              WHERE en.provider = ANY($2) AND en.unlocked_at >= d.day AND en.unlocked_at < d.day + interval '1 day')::int AS new_paying
       FROM days d ORDER BY d.day`,
    [since, providers]
  );

  // Monthly churn, scaled from the period length; average months a subscriber stays = 1 / churn.
  const periodChurn = pct(churned.n, activeAtStart.n);
  const monthlyChurn = periodChurn === null ? null : Math.min(1, periodChurn * (30 / days));
  const avgMonths = monthlyChurn ? Math.min(24, 1 / monthlyChurn) : null;
  const netMrr = active.monthly * net;

  return {
    period: { days, since: since.toISOString(), includeSimulated },
    funnel: {
      visitors: visitors.n,
      paywallViewers: paywall.n,
      checkoutStarts: checkout.n,
      signups: signups.n,
      newPaying: newPaid.n,
      visitorToSignup: round(pct(signups.n, visitors.n), 4),
      signupToPaid: round(pct(newPaid.n, signups.n), 4),
      visitorToPaid: round(pct(newPaid.n, visitors.n), 4),
      paywallToCheckout: round(pct(checkout.n, paywall.n), 4)
    },
    subscribers: {
      active: active.total,
      activeMonthly: active.monthly,
      activeOther: active.other,
      churnedInPeriod: churned.n,
      activeAtPeriodStart: activeAtStart.n,
      monthlyChurn: round(monthlyChurn, 4),
      avgMonthsRetained: round(avgMonths, 1)
    },
    money: {
      price,
      netPerPayment: round(net),
      grossMrr: round(active.monthly * price),
      netMrr: round(netMrr),
      monthlyCosts: round(costs),
      profitPerMonth: round(netMrr - costs),
      breakEvenSubscribers: net > 0 ? Math.ceil(costs / net) : null,
      lifetimeValue: avgMonths ? round(net * avgMonths) : null,
      // Paid ads only pay off if winning a customer costs less than a third of what they're worth.
      maxAcquisitionCost: avgMonths ? round((net * avgMonths) / 3) : null
    },
    sources,
    daily
  };
}
