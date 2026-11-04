import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

// Isolate test data from server/storage
process.env.STORAGE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'roadready-test-'));
process.env.ADMIN_TOKEN = 'test-admin-token-123';

let app;
beforeAll(async () => {
  ({ default: app } = await import('./index.js'));
});

const CLIENT = 'testclient1234567890';
const OTHER_CLIENT = 'otherclient123456789';

describe('RoadReady Express API Endpoints', () => {
  it('GET /api/health should return ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('RoadReady API');
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

  describe('passport (per-client)', () => {
    it('requires X-Client-Id', async () => {
      const res = await request(app).get('/api/passport');
      expect(res.status).toBe(400);
    });

    it('returns an empty passport for a new client', async () => {
      const res = await request(app).get('/api/passport').set('X-Client-Id', CLIENT);
      expect(res.status).toBe(200);
      expect(res.body.loggedHours).toBe(0);
      expect(res.body.targetHours).toBe(50);
      expect(Array.isArray(res.body.badges)).toBe(true);
    });

    it('rejects non-numeric and negative hours', async () => {
      for (const hours of ['5', -3, 0, 100]) {
        const res = await request(app).post('/api/passport/log').set('X-Client-Id', CLIENT).send({ hours });
        expect(res.status).toBe(400);
      }
    });

    it('logs hours for one client without affecting another', async () => {
      const res = await request(app).post('/api/passport/log').set('X-Client-Id', CLIENT).send({ hours: 2 });
      expect(res.status).toBe(200);
      expect(res.body.passport.loggedHours).toBe(2);

      const other = await request(app).get('/api/passport').set('X-Client-Id', OTHER_CLIENT);
      expect(other.body.loggedHours).toBe(0);
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
      expect({}.notes).toBeUndefined();
      expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')).toBe(false);
    });

    it('accepts valid reports', async () => {
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
    });
  });

  describe('subscription (per-client, simulated outside production)', () => {
    it('returns free tier for a new client', async () => {
      const res = await request(app).get('/api/subscription').set('X-Client-Id', OTHER_CLIENT);
      expect(res.status).toBe(200);
      expect(res.body.isPro).toBe(false);
      expect(res.body.tier).toBe('free');
    });

    it('rejects unknown tiers', async () => {
      const res = await request(app).post('/api/subscription/upgrade').set('X-Client-Id', CLIENT).send({ tier: '<script>' });
      expect(res.status).toBe(400);
    });

    it('uses server-side pricing and only upgrades the calling client', async () => {
      const res = await request(app)
        .post('/api/subscription/upgrade')
        .set('X-Client-Id', CLIENT)
        .send({ tier: 'monthly', price: 0.01 });
      expect(res.status).toBe(200);
      expect(res.body.subscription.price).toBe(4.99);

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
      expect(Array.isArray(ok.body)).toBe(true);
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
      const stored = fs.readFileSync(path.join(process.env.STORAGE_DIR, 'bookings.json'), 'utf-8');
      expect(stored).not.toContain('D1234567');
    });
  });
});
