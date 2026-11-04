import crypto from 'crypto';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { SignJWT } from 'jose';

// Test configuration: in-memory database (PGlite, because DATABASE_URL is unset and
// NODE_ENV=test) and a Supabase project that signs tokens with a known secret.
const SUPABASE_URL = 'https://test-project.supabase.co';
const JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters';
delete process.env.DATABASE_URL;
process.env.ADMIN_TOKEN = 'test-admin-token-123';
process.env.SUPABASE_URL = SUPABASE_URL;
process.env.SUPABASE_JWT_SECRET = JWT_SECRET;
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

let app;
let db;
beforeAll(async () => {
  ({ default: app } = await import('./index.js'));
  db = await import('./db/index.js');
});
afterAll(async () => {
  await db?.closeDb();
});

const CLIENT = 'testclient1234567890';
const OTHER_CLIENT = 'otherclient123456789';

async function makeToken({
  sub = crypto.randomUUID(),
  email = 'learner@example.com',
  issuer = `${SUPABASE_URL}/auth/v1`,
  audience = 'authenticated',
  expiresIn = '1h',
  secret = JWT_SECRET
} = {}) {
  const token = await new SignJWT({ email, role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(secret));
  return { token, sub, email };
}

describe('RoadReady Express API Endpoints', () => {
  it('GET /api/health reports the database and accounts status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('RoadReady API');
    expect(res.body.database).toBe('ok');
    expect(res.body.accounts).toBe('enabled');
  });

  it('GET /api/traffic should return simulated GeoJSON with incidents and sanitize coords', async () => {
    const res = await request(app).get('/api/traffic?lat=abc&lng=999');
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('FeatureCollection');
    expect(res.body.simulated).toBe(true);
    expect(res.body.features.length).toBeGreaterThan(0);
    expect(Array.isArray(res.body.incidents)).toBe(true);
    const [lng, lat] = res.body.features[0].geometry.coordinates[0];
    expect(Math.abs(lng)).toBeLessThanOrEqual(180);
    expect(Math.abs(lat)).toBeLessThanOrEqual(90);
  });

  it('unknown /api routes return JSON 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
  });

  it('malformed JSON returns 400 without internals', async () => {
    const res = await request(app)
      .post('/api/passport/log')
      .set('X-Client-Id', CLIENT)
      .set('Content-Type', 'application/json')
      .send('{bad');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Malformed JSON body' });
  });

  describe('passport (guest by device id)', () => {
    it('requires a device id or a session', async () => {
      const res = await request(app).get('/api/passport');
      expect(res.status).toBe(400);
    });

    it('returns an empty passport for a new device', async () => {
      const res = await request(app).get('/api/passport').set('X-Client-Id', CLIENT);
      expect(res.status).toBe(200);
      expect(res.body.loggedHours).toBe(0);
      expect(res.body.targetHours).toBe(50);
      expect(res.body.badges).toEqual([]);
      expect(res.body.recentSessions).toEqual([]);
    });

    it('rejects non-numeric and out-of-range hours', async () => {
      for (const hours of ['5', -3, 0, 100]) {
        const res = await request(app).post('/api/passport/log').set('X-Client-Id', CLIENT).send({ hours });
        expect(res.status).toBe(400);
      }
    });

    it('logs sessions for one device without affecting another', async () => {
      const res = await request(app).post('/api/passport/log').set('X-Client-Id', CLIENT).send({ hours: 2, isNight: true });
      expect(res.status).toBe(200);
      expect(res.body.passport.loggedHours).toBe(2);
      expect(res.body.passport.nightHours).toBe(2);
      expect(res.body.passport.recentSessions).toHaveLength(1);

      const other = await request(app).get('/api/passport').set('X-Client-Id', OTHER_CLIENT);
      expect(other.body.loggedHours).toBe(0);
    });

    it('derives badges from total hours', async () => {
      const res = await request(app).post('/api/passport/log').set('X-Client-Id', CLIENT).send({ hours: 4 });
      expect(res.body.passport.loggedHours).toBe(6);
      expect(res.body.passport.badges).toEqual(['First Ignition']);
    });
  });

  describe('session tokens', () => {
    it('rejects a token signed with the wrong secret', async () => {
      const { token } = await makeToken({ secret: 'some-other-secret-that-is-32-characters-long' });
      const res = await request(app).get('/api/passport').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });

    it('rejects an expired token', async () => {
      const { token } = await makeToken({ expiresIn: '-1m' });
      const res = await request(app).get('/api/passport').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });

    it('rejects a token from another project (issuer)', async () => {
      const { token } = await makeToken({ issuer: 'https://evil.supabase.co/auth/v1' });
      const res = await request(app).get('/api/passport').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });

    it('rejects garbage tokens', async () => {
      const res = await request(app).get('/api/passport').set('Authorization', 'Bearer not-a-jwt');
      expect(res.status).toBe(401);
    });

    it('a signed-in user has their own passport, separate from the device guest', async () => {
      const { token } = await makeToken();
      const res = await request(app)
        .get('/api/passport')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Client-Id', CLIENT);
      expect(res.status).toBe(200);
      expect(res.body.loggedHours).toBe(0);
    });
  });

  describe('account', () => {
    it('requires sign-in', async () => {
      const res = await request(app).get('/api/account').set('X-Client-Id', CLIENT);
      expect(res.status).toBe(401);
    });

    it('returns the signed-in account', async () => {
      const { token, sub } = await makeToken({ email: 'me@example.com' });
      const res = await request(app).get('/api/account').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: sub, email: 'me@example.com' });
      expect(res.body.createdAt).toBeTruthy();
    });

    it('moves guest hours into the account on claim', async () => {
      const device = 'claimdevice123456789';
      await request(app).post('/api/passport/log').set('X-Client-Id', device).send({ hours: 3 });

      const { token } = await makeToken();
      const claim = await request(app)
        .post('/api/account/claim')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Client-Id', device)
        .send({});
      expect(claim.status).toBe(200);
      expect(claim.body.moved.driveLogs).toBe(1);
      expect(claim.body.passport.loggedHours).toBe(3);

      // The device no longer holds the hours as a guest...
      const guest = await request(app).get('/api/passport').set('X-Client-Id', device);
      expect(guest.body.loggedHours).toBe(0);
      // ...and the account sees them from any device.
      const fromOtherDevice = await request(app)
        .get('/api/passport')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Client-Id', 'anotherdevice1234567');
      expect(fromOtherDevice.body.loggedHours).toBe(3);
    });

    it('claim needs the device id', async () => {
      const { token } = await makeToken();
      const res = await request(app).post('/api/account/claim').set('Authorization', `Bearer ${token}`).send({});
      expect(res.status).toBe(400);
    });

    it('deletes all account data and the Supabase login', async () => {
      const { token, sub } = await makeToken();
      const auth = { Authorization: `Bearer ${token}` };
      await request(app).post('/api/passport/log').set(auth).send({ hours: 1 });
      await request(app).post('/api/subscription/upgrade').set(auth).send({ tier: 'lifetime' });
      await request(app).post('/api/community-reports').set(auth).send({ zoneId: 'delete-zone', notes: 'mine' });

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
      try {
        const res = await request(app).delete('/api/account').set(auth);
        expect(res.status).toBe(200);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const [url, init] = fetchSpy.mock.calls[0];
        expect(String(url)).toBe(`${SUPABASE_URL}/auth/v1/admin/users/${sub}`);
        expect(init.method).toBe('DELETE');
        expect(init.headers.apikey).toBe('test-service-role-key');
      } finally {
        fetchSpy.mockRestore();
      }

      const owner = `user:${sub}`;
      for (const table of ['drive_logs', 'subscriptions', 'community_reports']) {
        const { rows } = await db.query(`SELECT COUNT(*)::int AS n FROM roadready.${table} WHERE owner_id = $1`, [owner]);
        expect(rows[0].n).toBe(0);
      }
      const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM roadready.profiles WHERE user_id = $1', [sub]);
      expect(rows[0].n).toBe(0);
    });

    it('reports a failure when Supabase refuses to delete the login', async () => {
      const { token } = await makeToken();
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));
      try {
        const res = await request(app).delete('/api/account').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(502);
      } finally {
        fetchSpy.mockRestore();
      }
    });
  });

  describe('community reports', () => {
    it('rejects missing required fields', async () => {
      const res = await request(app).post('/api/community-reports').send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('rejects oversized notes and unsafe zone ids', async () => {
      const long = await request(app).post('/api/community-reports').send({ zoneId: 'z1', notes: 'a'.repeat(600) });
      expect(long.status).toBe(400);
      const bad = await request(app).post('/api/community-reports').send({ zoneId: '../etc', notes: 'x' });
      expect(bad.status).toBe(400);
    });

    it('does not pollute Object.prototype via __proto__ zone ids', async () => {
      await request(app).post('/api/community-reports').send({ zoneId: '__proto__', notes: 'polluted' });
      const res = await request(app).get('/api/community-reports');
      expect(res.status).toBe(200);
      expect({}.notes).toBeUndefined();
      expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')).toBe(false);
    });

    it('accepts valid reports and returns them grouped by zone', async () => {
      const res = await request(app)
        .post('/api/community-reports')
        .send({
          zoneId: 'candlestick-open-ground',
          author: 'Test Driver',
          status: 'Gate Open',
          surface: 'Paved',
          notes: 'Great open area with zero obstacles.'
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.report.author).toBe('Test Driver');
      expect(res.body.report.createdAt).toBeTruthy();

      const all = await request(app).get('/api/community-reports');
      expect(all.body['candlestick-open-ground'][0].notes).toBe('Great open area with zero obstacles.');
      const one = await request(app).get('/api/community-reports?zoneId=candlestick-open-ground');
      expect(one.body).toHaveLength(1);
    });
  });

  describe('subscription (simulated outside production)', () => {
    it('returns free tier for a new device', async () => {
      const res = await request(app).get('/api/subscription').set('X-Client-Id', OTHER_CLIENT);
      expect(res.status).toBe(200);
      expect(res.body.isPro).toBe(false);
      expect(res.body.tier).toBe('free');
    });

    it('requires an account to upgrade', async () => {
      const res = await request(app).post('/api/subscription/upgrade').set('X-Client-Id', CLIENT).send({ tier: 'lifetime' });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('sign_in_required');
    });

    it('rejects unknown tiers', async () => {
      const { token } = await makeToken();
      const res = await request(app).post('/api/subscription/upgrade').set('Authorization', `Bearer ${token}`).send({ tier: '<script>' });
      expect(res.status).toBe(400);
    });

    it('uses server-side pricing and only upgrades the calling account', async () => {
      const { token } = await makeToken();
      const res = await request(app)
        .post('/api/subscription/upgrade')
        .set('Authorization', `Bearer ${token}`)
        .send({ tier: 'monthly', price: 0.01 });
      expect(res.status).toBe(200);
      expect(res.body.subscription.price).toBe(4.99);
      expect(res.body.subscription.isPro).toBe(true);

      const again = await request(app).get('/api/subscription').set('Authorization', `Bearer ${token}`);
      expect(again.body.isPro).toBe(true);

      const other = await request(app).get('/api/subscription').set('X-Client-Id', OTHER_CLIENT);
      expect(other.body.isPro).toBe(false);
    });
  });

  describe('affiliate leads', () => {
    it('tracks clicks without echoing lead data', async () => {
      const res = await request(app).post('/api/affiliates/insurance-click').send({ partnerId: 'geico', driverAge: 17 });
      expect(res.status).toBe(201);
      expect(res.body).not.toHaveProperty('trackingRecord');
    });

    it('requires the admin token to read leads', async () => {
      const denied = await request(app).get('/api/affiliates/insurance-clicks');
      expect(denied.status).toBe(401);
      const ok = await request(app)
        .get('/api/affiliates/insurance-clicks')
        .set('Authorization', 'Bearer test-admin-token-123');
      expect(ok.status).toBe(200);
      expect(ok.body[0].partnerId).toBe('geico');
    });
  });

  describe('instructor booking', () => {
    it('rejects incomplete bookings', async () => {
      const res = await request(app).post('/api/instructors/book').send({});
      expect(res.status).toBe(400);
    });

    it('accepts a valid booking request without storing permit numbers', async () => {
      const res = await request(app).post('/api/instructors/book').send({
        instructorId: 'i1',
        packageId: 'p1',
        studentName: 'Test Student',
        studentPhone: '415 555 0100',
        studentPermit: 'D1234567',
        timeSlot: 'Mon 3pm'
      });
      expect(res.status).toBe(201);
      expect(res.body.booking.status).toBe('requested');
      const { rows } = await db.query('SELECT * FROM roadready.instructor_bookings WHERE id = $1', [res.body.booking.id]);
      expect(rows).toHaveLength(1);
      expect(JSON.stringify(rows[0])).not.toContain('D1234567');
    });
  });
});
