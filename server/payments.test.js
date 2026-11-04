import crypto from 'crypto';
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import { SignJWT } from 'jose';
import Stripe from 'stripe';

// Payments configured with test values. Stripe API calls go to a fake client;
// webhook signatures use Stripe's real verification code.
const SUPABASE_URL = 'https://test-project.supabase.co';
const JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters';
const WEBHOOK_SECRET = 'whsec_test_secret_for_unit_tests';
delete process.env.DATABASE_URL;
Object.assign(process.env, {
  SUPABASE_URL,
  SUPABASE_JWT_SECRET: JWT_SECRET,
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  STRIPE_SECRET_KEY: 'sk_test_unit',
  STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
  STRIPE_PRICE_LIFETIME: 'price_lifetime_test',
  STRIPE_PRICE_MONTHLY: 'price_monthly_test',
  APP_URL: 'https://roadready.test',
  REVENUECAT_SECRET_KEY: 'sk_rc_test',
  REVENUECAT_WEBHOOK_AUTH: 'Bearer rc-webhook-secret'
});

const realStripe = new Stripe('sk_test_unit');
const fakeStripe = {
  webhooks: realStripe.webhooks,
  checkout: { sessions: { create: vi.fn(), retrieve: vi.fn() } },
  billingPortal: { sessions: { create: vi.fn() } },
  subscriptions: { retrieve: vi.fn(), cancel: vi.fn() }
};

let app;
let db;
beforeAll(async () => {
  ({ default: app } = await import('./index.js'));
  db = await import('./db/index.js');
  (await import('./lib/stripe.js')).setStripeClient(fakeStripe);
});
afterAll(async () => {
  await db?.closeDb();
});
afterEach(() => {
  vi.restoreAllMocks();
});

async function newUser(email = 'buyer@example.com') {
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

function sendStripeEvent(type, object, id = `evt_${crypto.randomUUID()}`) {
  const payload = JSON.stringify({ id, type, data: { object } });
  const signature = realStripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
  return request(app)
    .post('/api/payments/stripe/webhook')
    .set('Content-Type', 'application/json')
    .set('Stripe-Signature', signature)
    .send(payload);
}

const plan = async (user) => (await request(app).get('/api/subscription').set(user.auth)).body;
const inDays = (d) => Math.floor(Date.now() / 1000) + d * 86400;

describe('payments config', () => {
  it('tells the paywall what is available', async () => {
    const res = await request(app).get('/api/payments/config');
    expect(res.status).toBe(200);
    expect(res.body.web.stripe).toBe(true);
    expect(res.body.native.revenuecat).toBe(true);
    expect(res.body.plans.map((p) => p.id)).toEqual(['lifetime', 'monthly']);
  });
});

describe('Stripe checkout', () => {
  it('requires an account', async () => {
    const res = await request(app).post('/api/payments/stripe/checkout').set('X-Client-Id', 'guestdevice123456789').send({ plan: 'lifetime' });
    expect(res.status).toBe(401);
  });

  it('rejects unknown plans', async () => {
    const user = await newUser();
    const res = await request(app).post('/api/payments/stripe/checkout').set(user.auth).send({ plan: 'free-forever' });
    expect(res.status).toBe(400);
  });

  it('creates a one-time checkout for lifetime, tied to the account', async () => {
    const user = await newUser();
    fakeStripe.checkout.sessions.create.mockResolvedValueOnce({ url: 'https://checkout.stripe.com/c/pay/test1' });
    const res = await request(app).post('/api/payments/stripe/checkout').set(user.auth).send({ plan: 'lifetime', price: 0.01 });
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://checkout.stripe.com/c/pay/test1');

    const params = fakeStripe.checkout.sessions.create.mock.calls.at(-1)[0];
    expect(params.mode).toBe('payment');
    expect(params.line_items).toEqual([{ price: 'price_lifetime_test', quantity: 1 }]);
    expect(params.client_reference_id).toBe(user.id);
    expect(params.customer_email).toBe('buyer@example.com');
    expect(params.success_url).toMatch(/^https:\/\/roadready\.test\/\?checkout=success/);
  });

  it('creates a subscription checkout for monthly', async () => {
    const user = await newUser();
    fakeStripe.checkout.sessions.create.mockResolvedValueOnce({ url: 'https://checkout.stripe.com/c/pay/test2' });
    await request(app).post('/api/payments/stripe/checkout').set(user.auth).send({ plan: 'monthly' });
    const params = fakeStripe.checkout.sessions.create.mock.calls.at(-1)[0];
    expect(params.mode).toBe('subscription');
    expect(params.subscription_data.metadata.user_id).toBe(user.id);
  });
});

describe('Stripe webhook', () => {
  it('rejects events without a valid signature', async () => {
    const res = await request(app)
      .post('/api/payments/stripe/webhook')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', 't=1,v1=forged')
      .send(JSON.stringify({ id: 'evt_x', type: 'checkout.session.completed', data: { object: {} } }));
    expect(res.status).toBe(400);
  });

  it('grants lifetime Pro on a paid checkout, once per event', async () => {
    const user = await newUser();
    const session = {
      id: 'cs_test_life', mode: 'payment', payment_status: 'paid', client_reference_id: user.id,
      metadata: { user_id: user.id, plan: 'lifetime' }, amount_total: 2999, currency: 'usd',
      customer: 'cus_life', payment_intent: 'pi_life_1'
    };
    const first = await sendStripeEvent('checkout.session.completed', session, 'evt_life_1');
    expect(first.status).toBe(200);
    const sub = await plan(user);
    expect(sub).toMatchObject({ isPro: true, tier: 'lifetime', provider: 'stripe', price: 29.99, expiresAt: null });

    const again = await sendStripeEvent('checkout.session.completed', session, 'evt_life_1');
    expect(again.body.duplicate).toBe(true);
  });

  it('ignores unpaid checkouts', async () => {
    const user = await newUser();
    await sendStripeEvent('checkout.session.completed', {
      id: 'cs_unpaid', mode: 'payment', payment_status: 'unpaid', client_reference_id: user.id, metadata: { plan: 'lifetime' }
    });
    expect((await plan(user)).isPro).toBe(false);
  });

  it('tracks a monthly subscription through renewal and cancellation', async () => {
    const user = await newUser();
    const subscription = (status, periodEndDays, extra = {}) => ({
      id: 'sub_month_1', status, customer: 'cus_month', metadata: { user_id: user.id }, start_date: inDays(0),
      cancel_at_period_end: false,
      items: { data: [{ current_period_end: inDays(periodEndDays), price: { unit_amount: 499, currency: 'usd' } }] },
      ...extra
    });

    await sendStripeEvent('customer.subscription.created', subscription('active', 30));
    let sub = await plan(user);
    expect(sub).toMatchObject({ isPro: true, tier: 'monthly', willRenew: true, price: 4.99 });

    await sendStripeEvent('customer.subscription.updated', subscription('active', 30, { cancel_at_period_end: true }));
    sub = await plan(user);
    expect(sub.isPro).toBe(true); // keeps access until the period ends
    expect(sub.willRenew).toBe(false);

    await sendStripeEvent('customer.subscription.deleted', subscription('canceled', 0, { ended_at: inDays(0) - 5 }));
    expect((await plan(user)).isPro).toBe(false);
  });

  it('never lets a subscription event replace a lifetime purchase', async () => {
    const user = await newUser();
    await sendStripeEvent('checkout.session.completed', {
      id: 'cs_life2', mode: 'payment', payment_status: 'paid', client_reference_id: user.id,
      metadata: { plan: 'lifetime' }, amount_total: 2999, currency: 'usd', customer: 'cus_l2', payment_intent: 'pi_l2'
    });
    await sendStripeEvent('customer.subscription.deleted', {
      id: 'sub_old', status: 'canceled', metadata: { user_id: user.id }, ended_at: inDays(0) - 5, items: { data: [] }
    });
    expect(await plan(user)).toMatchObject({ isPro: true, tier: 'lifetime' });
  });

  it('removes lifetime access after a full refund', async () => {
    const user = await newUser();
    await sendStripeEvent('checkout.session.completed', {
      id: 'cs_refund', mode: 'payment', payment_status: 'paid', client_reference_id: user.id,
      metadata: { plan: 'lifetime' }, amount_total: 2999, currency: 'usd', customer: 'cus_r', payment_intent: 'pi_refund_me'
    });
    expect((await plan(user)).isPro).toBe(true);
    await sendStripeEvent('charge.refunded', { id: 'ch_1', refunded: true, payment_intent: 'pi_refund_me' });
    expect((await plan(user)).isPro).toBe(false);
  });
});

describe('Stripe return page confirm', () => {
  it('only applies a checkout to the account that started it', async () => {
    const owner = await newUser();
    const other = await newUser();
    fakeStripe.checkout.sessions.retrieve.mockResolvedValue({
      id: 'cs_test_confirm_1', mode: 'payment', payment_status: 'paid', client_reference_id: owner.id,
      metadata: { plan: 'lifetime' }, amount_total: 2999, currency: 'usd', customer: 'cus_c', payment_intent: 'pi_c'
    });

    const stolen = await request(app).post('/api/payments/stripe/confirm').set(other.auth).send({ sessionId: 'cs_test_confirm_1' });
    expect(stolen.status).toBe(403);
    expect((await plan(other)).isPro).toBe(false);

    const ok = await request(app).post('/api/payments/stripe/confirm').set(owner.auth).send({ sessionId: 'cs_test_confirm_1' });
    expect(ok.status).toBe(200);
    expect(ok.body.subscription).toMatchObject({ isPro: true, tier: 'lifetime' });
  });

  it('refuses a second lifetime checkout', async () => {
    const user = await newUser();
    await sendStripeEvent('checkout.session.completed', {
      id: 'cs_owned', mode: 'payment', payment_status: 'paid', client_reference_id: user.id,
      metadata: { plan: 'lifetime' }, amount_total: 2999, currency: 'usd', customer: 'cus_o', payment_intent: 'pi_o'
    });
    const res = await request(app).post('/api/payments/stripe/checkout').set(user.auth).send({ plan: 'monthly' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('already_owned');
  });
});

describe('RevenueCat (App Store / Google Play)', () => {
  const subscriberResponse = (userId, entitlements) => new Response(JSON.stringify({
    subscriber: {
      original_app_user_id: userId,
      entitlements,
      subscriptions: {
        roadready_monthly: { store: 'app_store', expires_date: entitlements.pro?.expires_date, price: { amount: 4.99, currency: 'USD' } }
      },
      non_subscriptions: {}
    }
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  it('sync verifies the purchase with RevenueCat, not the app', async () => {
    const user = await newUser();
    const expires = new Date(Date.now() + 20 * 86400_000).toISOString();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      subscriberResponse(user.id, { pro: { product_identifier: 'roadready_monthly', expires_date: expires, purchase_date: new Date().toISOString() } })
    );
    const res = await request(app).post('/api/payments/revenuecat/sync').set(user.auth).send({ isPro: true });
    expect(res.status).toBe(200);
    expect(res.body.subscription).toMatchObject({ isPro: true, tier: 'monthly', provider: 'revenuecat', store: 'app_store' });
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toBe(`https://api.revenuecat.com/v1/subscribers/${user.id}`);
    expect(init.headers.Authorization).toBe('Bearer sk_rc_test');
  });

  it('removes access when RevenueCat no longer lists the entitlement', async () => {
    const user = await newUser();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      subscriberResponse(user.id, { pro: { product_identifier: 'roadready_monthly', expires_date: new Date(Date.now() + 86400_000).toISOString() } })
    ).mockResolvedValueOnce(subscriberResponse(user.id, {}));
    await request(app).post('/api/payments/revenuecat/sync').set(user.auth).send({});
    expect((await plan(user)).isPro).toBe(true);
    await request(app).post('/api/payments/revenuecat/sync').set(user.auth).send({});
    expect((await plan(user)).isPro).toBe(false);
  });

  it('webhook needs the shared secret', async () => {
    const res = await request(app).post('/api/payments/revenuecat/webhook')
      .set('Authorization', 'Bearer wrong').send({ event: { id: 'e1', app_user_id: crypto.randomUUID() } });
    expect(res.status).toBe(401);
  });

  it('webhook re-syncs the user and ignores repeats', async () => {
    const user = await newUser();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      subscriberResponse(user.id, { pro: { product_identifier: 'roadready_lifetime', expires_date: null } })
    );
    const event = { id: `rc_evt_${crypto.randomUUID()}`, type: 'NON_RENEWING_PURCHASE', app_user_id: user.id, aliases: ['$RCAnonymousID:abc'] };
    const res = await request(app).post('/api/payments/revenuecat/webhook').set('Authorization', 'Bearer rc-webhook-secret').send({ event });
    expect(res.status).toBe(200);
    expect(await plan(user)).toMatchObject({ isPro: true, tier: 'lifetime', provider: 'revenuecat' });
    expect(fetchSpy).toHaveBeenCalledTimes(1); // anonymous ids are not synced

    const again = await request(app).post('/api/payments/revenuecat/webhook').set('Authorization', 'Bearer rc-webhook-secret').send({ event });
    expect(again.body.duplicate).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe('combined plans and account deletion', () => {
  it('a web lifetime purchase wins over an expiring store subscription', async () => {
    const user = await newUser();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(subscriberResponseFor(user.id));
    await request(app).post('/api/payments/revenuecat/sync').set(user.auth).send({});
    await sendStripeEvent('checkout.session.completed', {
      id: 'cs_combo', mode: 'payment', payment_status: 'paid', client_reference_id: user.id,
      metadata: { plan: 'lifetime' }, amount_total: 2999, currency: 'usd', customer: 'cus_combo', payment_intent: 'pi_combo'
    });
    expect(await plan(user)).toMatchObject({ tier: 'lifetime', provider: 'stripe' });
  });

  it('cancels a renewing Stripe subscription before deleting the account', async () => {
    const user = await newUser();
    await sendStripeEvent('customer.subscription.created', {
      id: 'sub_delete_me', status: 'active', customer: 'cus_del', metadata: { user_id: user.id }, start_date: inDays(0),
      cancel_at_period_end: false, items: { data: [{ current_period_end: inDays(30), price: { unit_amount: 499, currency: 'usd' } }] }
    });
    fakeStripe.subscriptions.cancel.mockResolvedValueOnce({ id: 'sub_delete_me', status: 'canceled' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));

    const res = await request(app).delete('/api/account').set(user.auth);
    expect(res.status).toBe(200);
    expect(fakeStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_delete_me');
    expect((await plan(user)).isPro).toBe(false);
  });

  it('keeps everything if the Stripe cancellation fails', async () => {
    const user = await newUser();
    await sendStripeEvent('customer.subscription.created', {
      id: 'sub_keep_me', status: 'active', customer: 'cus_keep', metadata: { user_id: user.id }, start_date: inDays(0),
      cancel_at_period_end: false, items: { data: [{ current_period_end: inDays(30), price: { unit_amount: 499, currency: 'usd' } }] }
    });
    fakeStripe.subscriptions.cancel.mockRejectedValueOnce(new Error('stripe down'));
    const res = await request(app).delete('/api/account').set(user.auth);
    expect(res.status).toBe(502);
    expect((await plan(user)).isPro).toBe(true);
  });
});

function subscriberResponseFor(userId) {
  return new Response(JSON.stringify({
    subscriber: {
      entitlements: { pro: { product_identifier: 'roadready_monthly', expires_date: new Date(Date.now() + 5 * 86400_000).toISOString() } },
      subscriptions: { roadready_monthly: { store: 'play_store' } },
      non_subscriptions: {}
    }
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
