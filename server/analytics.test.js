import crypto from 'crypto';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { SignJWT } from 'jose';

const SUPABASE_URL = 'https://test-project.supabase.co';
const JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters';
delete process.env.DATABASE_URL;
Object.assign(process.env, {
  SUPABASE_URL,
  SUPABASE_JWT_SECRET: JWT_SECRET,
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  ADMIN_TOKEN: 'analytics-admin-token',
  MONTHLY_COSTS_USD: '75'
});

let app;
let db;
let analytics;
beforeAll(async () => {
  ({ default: app } = await import('./index.js'));
  db = await import('./db/index.js');
  analytics = await import('./lib/analytics.js');
});
afterAll(async () => {
  await db?.closeDb();
});

const ADMIN = { Authorization: 'Bearer analytics-admin-token' };
const device = () => `dev${crypto.randomBytes(10).toString('hex')}`;

async function newUser(email = 'parent@example.com') {
  const sub = crypto.randomUUID();
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuer(`${SUPABASE_URL}/auth/v1`)
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(JWT_SECRET));
  return { id: sub, auth: { Authorization: `Bearer ${token}` } };
}

const send = (clientId, body, headers = {}) =>
  request(app).post('/api/events').set('X-Client-Id', clientId).set(headers).send(body);

const metrics = (query = '') => request(app).get(`/api/admin/metrics${query}`).set(ADMIN);

describe('event collection', () => {
  it('ignores unknown events and calls without a device id', async () => {
    const before = (await db.query('SELECT COUNT(*)::int AS n FROM roadready.analytics_events')).rows[0].n;
    expect((await send(device(), { name: 'password_typed', props: { value: 'x' } })).status).toBe(204);
    expect((await request(app).post('/api/events').send({ name: 'app_open' })).status).toBe(204);
    const after = (await db.query('SELECT COUNT(*)::int AS n FROM roadready.analytics_events')).rows[0].n;
    expect(after).toBe(before);
  });

  it('stores only allowed fields, a hashed device id and no personal data', async () => {
    const clientId = device();
    const res = await send(clientId, {
      name: 'paywall_view',
      props: { feature: 'grounds', email: 'kid@example.com' },
      path: '/learner?token=secret#x',
      referrer: 'https://www.google.com/search?q=driving',
      utm: { source: 'TikTok', medium: 'Social', campaign: 'Spring' },
      device: 'mobile',
      sessionId: 'sess_12345678'
    });
    expect(res.status).toBe(204);

    const { rows } = await db.query('SELECT * FROM roadready.analytics_events WHERE visitor_id = $1', [analytics.hashVisitor(clientId)]);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.visitor_id).not.toContain(clientId);
    expect(row.props).toEqual({ feature: 'grounds' });
    expect(row.path).toBe('/learner');
    expect(row.referrer_host).toBe('google.com');
    expect(row.utm_source).toBe('tiktok');
    expect(row.device).toBe('mobile');
    expect(JSON.stringify(row)).not.toContain('kid@example.com');
  });
});

describe('business metrics', () => {
  it('are admin-only', async () => {
    expect((await request(app).get('/api/admin/metrics')).status).toBe(401);
    expect((await request(app).get('/api/admin/metrics').set('Authorization', 'Bearer wrong-token-of-same-length')).status).toBe(401);
  });

  it('report the funnel, churn, break-even and where paying customers came from', async () => {
    // Three visitors: TikTok, Google (referrer) and direct.
    const tiktokDevice = device();
    await send(tiktokDevice, { name: 'app_open', utm: { source: 'tiktok' } });
    await send(device(), { name: 'app_open', referrer: 'https://www.google.com/' });
    await send(device(), { name: 'app_open' });

    // The TikTok visitor signs up, opens the paywall and subscribes (simulated checkout).
    const payer = await newUser();
    await request(app).get('/api/account').set(payer.auth);
    await send(tiktokDevice, { name: 'paywall_view' }, payer.auth);
    await send(tiktokDevice, { name: 'checkout_start', props: { plan: 'monthly' } }, payer.auth);
    const upgrade = await request(app).post('/api/subscription/upgrade').set(payer.auth).send({ tier: 'monthly' });
    expect(upgrade.status).toBe(200);

    // Two real subscribers from before the period: one still active, one cancelled 5 days ago.
    const insert = (owner, expiresDaysAgo, willRenew) => db.query(
      `INSERT INTO roadready.entitlements (owner_id, provider, plan, price, unlocked_at, expires_at, will_renew)
       VALUES ($1, 'stripe', 'monthly', 4.99, now() - interval '60 days', now() - ($2 || ' days')::interval, $3)`,
      [owner, String(expiresDaysAgo), willRenew]
    );
    await insert(`user:${crypto.randomUUID()}`, -20, true); // expires in 20 days: active
    await insert(`user:${crypto.randomUUID()}`, 5, false); // ended 5 days ago: churned

    const real = (await metrics('?days=30&includeSimulated=0')).body;
    expect(real.funnel.visitors).toBeGreaterThanOrEqual(3);
    expect(real.funnel.newPaying).toBe(0); // the simulated purchase is not real money
    expect(real.subscribers.activeAtPeriodStart).toBe(2);
    expect(real.subscribers.churnedInPeriod).toBe(1);
    expect(real.subscribers.monthlyChurn).toBe(0.5);
    expect(real.subscribers.avgMonthsRetained).toBe(2);
    expect(real.subscribers.activeMonthly).toBe(1);

    expect(real.money.price).toBe(4.99);
    expect(real.money.netPerPayment).toBe(4.51); // 4.99 − 3.6% − $0.30
    expect(real.money.monthlyCosts).toBe(75);
    expect(real.money.breakEvenSubscribers).toBe(17);
    expect(real.money.netMrr).toBe(4.51);
    expect(real.money.profitPerMonth).toBe(-70.49);
    expect(real.money.lifetimeValue).toBe(9.02);
    expect(real.money.maxAcquisitionCost).toBe(3.01);

    const withTests = (await metrics('?days=30&includeSimulated=1&costs=10')).body;
    expect(withTests.funnel.newPaying).toBe(1);
    expect(withTests.funnel.paywallViewers).toBeGreaterThanOrEqual(1);
    expect(withTests.funnel.checkoutStarts).toBeGreaterThanOrEqual(1);
    expect(withTests.funnel.signups).toBeGreaterThanOrEqual(1);
    expect(withTests.money.monthlyCosts).toBe(10);
    const tiktok = withTests.sources.find((s) => s.source === 'tiktok');
    expect(tiktok).toMatchObject({ paying: 1 });
    expect(withTests.sources.some((s) => s.source === 'google.com')).toBe(true);
    expect(withTests.sources.some((s) => s.source === 'direct')).toBe(true);
    expect(withTests.daily.length).toBeGreaterThanOrEqual(30);
    expect(withTests.daily.at(-1)).toHaveProperty('visitors');
  });

  it('rejects bad cost input', async () => {
    expect((await metrics('?costs=-5')).status).toBe(400);
    expect((await metrics('?costs=abc')).status).toBe(400);
  });
});

describe('privacy housekeeping', () => {
  it('deleting an account deletes its analytics events', async () => {
    const user = await newUser();
    await send(device(), { name: 'app_open' }, user.auth);
    const count = async () => (await db.query('SELECT COUNT(*)::int AS n FROM roadready.analytics_events WHERE user_id = $1', [user.id])).rows[0].n;
    expect(await count()).toBe(1);

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
    try {
      expect((await request(app).delete('/api/account').set(user.auth)).status).toBe(200);
    } finally {
      fetchSpy.mockRestore();
    }
    expect(await count()).toBe(0);
  });

  it('removes events older than the retention period', async () => {
    await db.query(
      `INSERT INTO roadready.analytics_events (id, name, visitor_id, created_at)
       VALUES ($1, 'app_open', 'old-visitor', now() - interval '400 days')`,
      [crypto.randomUUID()]
    );
    await analytics.deleteOldEvents();
    const { rows } = await db.query(`SELECT COUNT(*)::int AS n FROM roadready.analytics_events WHERE visitor_id = 'old-visitor'`);
    expect(rows[0].n).toBe(0);
  });
});
