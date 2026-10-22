import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from './index.js';

describe('RoadReady Express API Endpoints', () => {
  it('GET /api/health should return ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('Apple Maps Learner Engine Backend');
  });

  it('GET /api/traffic should return GeoJSON feature collection with incidents', async () => {
    const res = await request(app).get('/api/traffic?lat=37.7749&lng=-122.4194');
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('FeatureCollection');
    expect(Array.isArray(res.body.features)).toBe(true);
    expect(res.body.features.length).toBeGreaterThan(0);
    expect(Array.isArray(res.body.incidents)).toBe(true);
  });

  it('GET /api/passport should return driver passport metrics', async () => {
    const res = await request(app).get('/api/passport');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('loggedHours');
    expect(res.body).toHaveProperty('targetHours');
    expect(Array.isArray(res.body.badges)).toBe(true);
  });

  it('POST /api/passport/log should validate and increment hours', async () => {
    const res = await request(app)
      .post('/api/passport/log')
      .send({ hours: 1, isNight: false });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.passport).toBeDefined();
  });

  it('POST /api/community-reports should reject missing required fields', async () => {
    const res = await request(app)
      .post('/api/community-reports')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/community-reports should accept valid reports', async () => {
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
  });

  it('GET /api/subscription should return subscription status', async () => {
    const res = await request(app).get('/api/subscription');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('isPro');
    expect(res.body).toHaveProperty('tier');
  });
});
