import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3001;
// Bind to all interfaces by default so container hosts (Render, Railway, Docker) can route traffic.
const HOST = process.env.HOST || '0.0.0.0';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Simulated checkout is only allowed outside production, or when explicitly opted in.
// Real payments (Stripe / StoreKit / Play Billing) must replace this before launch.
const ALLOW_SIMULATED_PAYMENTS = !IS_PRODUCTION || process.env.ALLOW_SIMULATED_PAYMENTS === 'true';
// Token required to read affiliate lead data. Unset = endpoint disabled.
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

// CORS: comma-separated allowlist in production; permissive in development.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);
// Capacitor WebView origins for the native apps.
const NATIVE_ORIGINS = ['capacitor://localhost', 'https://localhost', 'http://localhost'];

app.disable('x-powered-by');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // same-origin, curl, server-to-server
    if (!IS_PRODUCTION && allowedOrigins.length === 0) return cb(null, true);
    if (allowedOrigins.includes(origin) || NATIVE_ORIGINS.includes(origin)) return cb(null, true);
    return cb(null, false);
  }
}));
app.use(express.json({ limit: '16kb' }));

// Minimal security headers (helmet-equivalent essentials)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Simple in-memory rate limiter for write endpoints (per IP, per minute).
const rateBuckets = new Map();
const RATE_LIMIT_PER_MIN = 30;
function rateLimit(req, res, next) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.start > 60_000) {
    rateBuckets.set(key, { start: now, count: 1 });
    return next();
  }
  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_PER_MIN) {
    return res.status(429).json({ error: 'Too many requests, please slow down.' });
  }
  next();
}
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [k, v] of rateBuckets) if (v.start < cutoff) rateBuckets.delete(k);
}, 60_000).unref();

// ---------- Storage helpers ----------
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, 'storage');
fs.mkdirSync(STORAGE_DIR, { recursive: true });

const REPORTS_FILE = path.join(STORAGE_DIR, 'reports.json');
const PASSPORT_FILE = path.join(STORAGE_DIR, 'passport.json');
const SUBSCRIPTION_FILE = path.join(STORAGE_DIR, 'subscriptions.json');
const INSURANCE_CLICKS_FILE = path.join(STORAGE_DIR, 'insurance_clicks.json');
const BOOKINGS_FILE = path.join(STORAGE_DIR, 'bookings.json');

function readJson(file, fallback) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

// Atomic write: write temp file then rename, so a crash never leaves a half-written file.
function writeJson(file, data) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

// Maps keyed by user-controlled strings use null-prototype objects to avoid
// prototype pollution (e.g. zoneId = "__proto__").
function toSafeMap(obj) {
  const out = Object.create(null);
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) out[k] = v;
  }
  return out;
}

const SEED_REPORTS = {
  'candlestick-open-ground': [
    { id: 'rep-1', author: 'Marcus V.', createdAt: '2026-01-01T00:00:00.000Z', status: 'Gate Open', surface: 'Dry & Clear', notes: 'Completely empty right now. Only 1 other learner practicing manual.' },
    { id: 'rep-2', author: 'Elena R.', createdAt: '2026-01-01T00:00:00.000Z', status: 'Gate Open', surface: 'Clean', notes: 'Great breeze. Great for motorcycle counter-steering.' }
  ],
  'ccsf-lower-parking': [
    { id: 'rep-3', author: 'Sarah K.', createdAt: '2026-01-01T00:00:00.000Z', status: 'Open Weekend', surface: 'Paved', notes: 'No campus security. Painted bays make parallel parking super easy.' }
  ]
};
if (!fs.existsSync(REPORTS_FILE)) writeJson(REPORTS_FILE, SEED_REPORTS);

// ---------- Per-client identity ----------
// Not authentication: an anonymous, client-generated ID that scopes passport and
// subscription data to one device instead of one global record shared by everyone.
// Replace with real auth (sessions/JWT) before storing anything sensitive.
const CLIENT_ID_RE = /^[A-Za-z0-9_-]{16,64}$/;
function requireClientId(req, res, next) {
  const id = req.get('X-Client-Id');
  if (!id || !CLIENT_ID_RE.test(id)) {
    return res.status(400).json({ error: 'Missing or invalid X-Client-Id header' });
  }
  req.clientId = id;
  next();
}

const DEFAULT_PASSPORT = () => ({
  loggedHours: 0,
  targetHours: 50,
  nightHours: 0,
  highwayHours: 0,
  badges: []
});
const DEFAULT_SUBSCRIPTION = () => ({ isPro: false, tier: 'free', unlockedAt: null, expiresAt: null });

// ---------- Validation helpers ----------
function cleanString(value, { max, required = false, fallback = '' } = {}) {
  if (value === undefined || value === null || value === '') {
    return required ? null : fallback;
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (required && trimmed.length === 0) return null;
  if (trimmed.length > max) return null;
  return trimmed;
}

function sendServerError(res, message, err) {
  console.error(`[api] ${message}:`, err);
  res.status(500).json({ error: message });
}

// 1. Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'RoadReady API',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 2. Demo traffic overlay (synthetic — NOT real traffic data)
app.get('/api/traffic', (req, res) => {
  const latRaw = parseFloat(req.query.lat);
  const lngRaw = parseFloat(req.query.lng);
  const lat = Number.isFinite(latRaw) && Math.abs(latRaw) <= 90 ? latRaw : 37.7749;
  const lng = Number.isFinite(lngRaw) && Math.abs(lngRaw) <= 180 ? lngRaw : -122.4194;

  const currentHour = new Date().getHours();
  const isRushHour = (currentHour >= 8 && currentHour <= 10) || (currentHour >= 17 && currentHour <= 19);

  const segments = [
    { id: 'traf-seg-1', name: 'Main Arterial Northbound', congestion: isRushHour ? 'heavy' : 'moderate', speedMph: isRushHour ? 9 : 28, color: isRushHour ? '#FF3B30' : '#FFCC00',
      coordinates: [[lng - 0.006, lat - 0.008], [lng - 0.002, lat], [lng + 0.001, lat + 0.008]] },
    { id: 'traf-seg-2', name: 'Main Arterial Southbound', congestion: isRushHour ? 'moderate' : 'low', speedMph: isRushHour ? 19 : 34, color: isRushHour ? '#FFCC00' : '#34C759',
      coordinates: [[lng + 0.0015, lat + 0.008], [lng - 0.0015, lat], [lng - 0.0055, lat - 0.008]] },
    { id: 'traf-seg-3', name: 'Cross-Town Connector West', congestion: 'low', speedMph: 32, color: '#34C759',
      coordinates: [[lng - 0.012, lat + 0.003], [lng - 0.004, lat + 0.003], [lng + 0.005, lat + 0.004]] },
    { id: 'traf-seg-4', name: 'Practice Access Ring Road', congestion: 'low', speedMph: 15, color: '#34C759',
      coordinates: [[lng + 0.004, lat - 0.006], [lng + 0.008, lat - 0.002], [lng + 0.010, lat + 0.003]] },
    { id: 'traf-seg-5', name: 'Downtown Commercial Corridor', congestion: isRushHour ? 'heavy' : 'moderate', speedMph: isRushHour ? 6 : 18, color: isRushHour ? '#FF3B30' : '#FFCC00',
      coordinates: [[lng - 0.008, lat + 0.006], [lng - 0.002, lat + 0.006], [lng + 0.006, lat + 0.007]] },
    { id: 'traf-seg-6', name: 'Quiet Residential Perimeter Loop', congestion: 'low', speedMph: 15, color: '#34C759',
      coordinates: [[lng - 0.010, lat - 0.003], [lng - 0.008, lat - 0.007], [lng - 0.003, lat - 0.007], [lng - 0.002, lat - 0.004]] }
  ];

  res.json({
    type: 'FeatureCollection',
    simulated: true,
    isRushHour,
    currentHour,
    overallTrafficIndex: isRushHour ? 78 : 28,
    legend: {
      green: 'Free Flow (Ideal for Learners)',
      yellow: 'Moderate Activity',
      red: 'Congested / Heavy Traffic'
    },
    features: segments.map(seg => ({
      type: 'Feature',
      id: seg.id,
      properties: { id: seg.id, name: seg.name, congestion: seg.congestion, speedMph: seg.speedMph, color: seg.color },
      geometry: { type: 'LineString', coordinates: seg.coordinates }
    }))
  });
});

// 3. Community Reports: Get all or for specific ground
app.get('/api/community-reports', (req, res) => {
  try {
    const reports = toSafeMap(readJson(REPORTS_FILE, {}));
    const zoneId = typeof req.query.zoneId === 'string' ? req.query.zoneId : null;
    if (zoneId) {
      return res.json(reports[zoneId] || []);
    }
    res.json({ ...reports });
  } catch (err) {
    sendServerError(res, 'Failed to read community reports', err);
  }
});

// 4. Community Reports: Post new report
const MAX_REPORTS_PER_ZONE = 50;
app.post('/api/community-reports', rateLimit, (req, res) => {
  try {
    const body = req.body || {};
    const zoneId = cleanString(body.zoneId, { max: 100, required: true });
    const notes = cleanString(body.notes, { max: 500, required: true });
    const author = cleanString(body.author, { max: 40, fallback: 'Anonymous Learner' });
    const status = cleanString(body.status, { max: 40, fallback: 'Gate Open' });
    const surface = cleanString(body.surface, { max: 40, fallback: 'Clean' });

    if (!zoneId || !notes || author === null || status === null || surface === null) {
      return res.status(400).json({ error: 'zoneId (≤100 chars) and notes (≤500 chars) are required; author/status/surface must be short strings' });
    }
    if (!/^[A-Za-z0-9_-]+$/.test(zoneId)) {
      return res.status(400).json({ error: 'Invalid zoneId' });
    }

    const reports = toSafeMap(readJson(REPORTS_FILE, {}));
    const list = Array.isArray(reports[zoneId]) ? reports[zoneId] : [];

    const newEntry = {
      id: `rep-${crypto.randomUUID()}`,
      author,
      createdAt: new Date().toISOString(),
      status,
      surface,
      notes
    };

    reports[zoneId] = [newEntry, ...list].slice(0, MAX_REPORTS_PER_ZONE);
    writeJson(REPORTS_FILE, { ...reports });

    res.status(201).json({ success: true, report: newEntry, count: reports[zoneId].length });
  } catch (err) {
    sendServerError(res, 'Failed to save community report', err);
  }
});

// 5. Learner Passport: Get hours and badges (per client)
app.get('/api/passport', requireClientId, (req, res) => {
  try {
    const all = toSafeMap(readJson(PASSPORT_FILE, {}));
    res.json(all[req.clientId] || DEFAULT_PASSPORT());
  } catch (err) {
    sendServerError(res, 'Failed to read passport data', err);
  }
});

// 6. Learner Passport: Log practice hours (per client)
const BADGES = [
  { thresh: 5, name: 'First Ignition' },
  { thresh: 15, name: 'Friction Master' },
  { thresh: 25, name: 'Cone Wizard' },
  { thresh: 35, name: 'Highway Navigator' },
  { thresh: 50, name: 'Road Ready Master' }
];
app.post('/api/passport/log', rateLimit, requireClientId, (req, res) => {
  try {
    const { hours = 1, isNight = false, isHighway = false } = req.body || {};
    if (typeof hours !== 'number' || !Number.isFinite(hours) || hours <= 0 || hours > 12) {
      return res.status(400).json({ error: 'hours must be a number between 0 and 12' });
    }
    if (typeof isNight !== 'boolean' || typeof isHighway !== 'boolean') {
      return res.status(400).json({ error: 'isNight and isHighway must be booleans' });
    }

    const all = toSafeMap(readJson(PASSPORT_FILE, {}));
    const passport = { ...DEFAULT_PASSPORT(), ...(all[req.clientId] || {}) };

    passport.loggedHours = Math.min(passport.targetHours, passport.loggedHours + hours);
    if (isNight) passport.nightHours += hours;
    if (isHighway) passport.highwayHours += hours;

    BADGES.forEach(b => {
      if (passport.loggedHours >= b.thresh && !passport.badges.includes(b.name)) {
        passport.badges.push(b.name);
      }
    });

    all[req.clientId] = passport;
    writeJson(PASSPORT_FILE, { ...all });
    res.json({ success: true, passport });
  } catch (err) {
    sendServerError(res, 'Failed to update passport', err);
  }
});

// 7. Subscription: Get current subscription status (per client)
app.get('/api/subscription', requireClientId, (req, res) => {
  try {
    const all = toSafeMap(readJson(SUBSCRIPTION_FILE, {}));
    res.json(all[req.clientId] || DEFAULT_SUBSCRIPTION());
  } catch (err) {
    sendServerError(res, 'Failed to read subscription', err);
  }
});

// 8. Subscription: Upgrade to Pro (SIMULATED — disabled in production unless opted in)
const PLAN_PRICES = { lifetime: 29.99, monthly: 4.99 };
app.post('/api/subscription/upgrade', rateLimit, requireClientId, (req, res) => {
  if (!ALLOW_SIMULATED_PAYMENTS) {
    return res.status(501).json({ error: 'Payments are not configured on this server' });
  }
  try {
    const tier = req.body?.tier;
    if (!Object.hasOwn(PLAN_PRICES, tier)) {
      return res.status(400).json({ error: 'tier must be "lifetime" or "monthly"' });
    }
    const now = new Date();
    const updated = {
      isPro: true,
      tier,
      price: PLAN_PRICES[tier], // price is decided by the server, never the client
      unlockedAt: now.toISOString(),
      expiresAt: tier === 'monthly' ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      transactionId: `SIM-${crypto.randomUUID()}`,
      simulated: true
    };
    const all = toSafeMap(readJson(SUBSCRIPTION_FILE, {}));
    all[req.clientId] = updated;
    writeJson(SUBSCRIPTION_FILE, { ...all });
    res.json({ success: true, subscription: updated });
  } catch (err) {
    sendServerError(res, 'Failed to upgrade subscription', err);
  }
});

// 9. Subscription: Reset to Free (development/testing only)
app.post('/api/subscription/reset', rateLimit, requireClientId, (req, res) => {
  if (IS_PRODUCTION) {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    const all = toSafeMap(readJson(SUBSCRIPTION_FILE, {}));
    all[req.clientId] = DEFAULT_SUBSCRIPTION();
    writeJson(SUBSCRIPTION_FILE, { ...all });
    res.json({ success: true, subscription: all[req.clientId] });
  } catch (err) {
    sendServerError(res, 'Failed to reset subscription', err);
  }
});

// 10. Auto insurance affiliate click tracking
app.post('/api/affiliates/insurance-click', rateLimit, (req, res) => {
  try {
    const body = req.body || {};
    const partnerId = cleanString(body.partnerId, { max: 60, required: true });
    const partnerName = cleanString(body.partnerName, { max: 80, fallback: '' });
    if (!partnerId || partnerName === null) {
      return res.status(400).json({ error: 'partnerId is required' });
    }
    const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

    const clicks = readJson(INSURANCE_CLICKS_FILE, []);
    const record = {
      id: `aff-click-${crypto.randomUUID()}`,
      partnerId,
      partnerName,
      estimatedSavings: num(body.estimatedSavings),
      driverAge: num(body.driverAge),
      loggedHours: num(body.loggedHours),
      timestamp: new Date().toISOString()
    };

    const next = [record, ...(Array.isArray(clicks) ? clicks : [])].slice(0, 10_000);
    writeJson(INSURANCE_CLICKS_FILE, next);
    // Do not echo totals or other users' data back to the client.
    res.status(201).json({ success: true, id: record.id });
  } catch (err) {
    sendServerError(res, 'Failed to track insurance affiliate click', err);
  }
});

// Admin-only: lead data is not public.
app.get('/api/affiliates/insurance-clicks', (req, res) => {
  const auth = req.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const valid = ADMIN_TOKEN && token.length === ADMIN_TOKEN.length &&
    crypto.timingSafeEqual(Buffer.from(token), Buffer.from(ADMIN_TOKEN));
  if (!valid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json(readJson(INSURANCE_CLICKS_FILE, []));
});

// 11. Instructor booking requests
const PHONE_RE = /^[0-9+().\-\s]{7,20}$/;
app.post('/api/instructors/book', rateLimit, (req, res) => {
  try {
    const body = req.body || {};
    const instructorId = cleanString(body.instructorId, { max: 60, required: true });
    const packageId = cleanString(body.packageId, { max: 60, required: true });
    const studentName = cleanString(body.studentName, { max: 80, required: true });
    const studentPhone = cleanString(body.studentPhone, { max: 20, required: true });
    const timeSlot = cleanString(body.timeSlot, { max: 80, required: true });
    const meetingLocation = cleanString(body.meetingLocation, { max: 120, fallback: '' });
    const notes = cleanString(body.notes, { max: 500, fallback: '' });

    if (!instructorId || !packageId || !studentName || !studentPhone || !timeSlot ||
        meetingLocation === null || notes === null) {
      return res.status(400).json({ error: 'instructorId, packageId, studentName, studentPhone and timeSlot are required' });
    }
    if (!PHONE_RE.test(studentPhone)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    // Permit numbers are sensitive government IDs; they are intentionally not stored.
    const booking = {
      id: `book-${crypto.randomUUID()}`,
      status: 'requested', // the instructor must confirm; nothing is charged
      instructorId,
      packageId,
      studentName,
      studentPhone,
      timeSlot,
      meetingLocation,
      notes,
      createdAt: new Date().toISOString()
    };

    const bookings = readJson(BOOKINGS_FILE, []);
    writeJson(BOOKINGS_FILE, [booking, ...(Array.isArray(bookings) ? bookings : [])].slice(0, 10_000));

    res.status(201).json({
      success: true,
      booking: { id: booking.id, status: booking.status, instructorId, packageId, timeSlot, meetingLocation }
    });
  } catch (err) {
    sendServerError(res, 'Failed to save booking request', err);
  }
});

// Unknown API routes return JSON 404 (never the SPA HTML)
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// In production, serve the built frontend assets if present
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Malformed JSON and other errors -> JSON response, no stack traces
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  console.error('[api] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`[RoadReady API] listening on http://${HOST}:${PORT} (${process.env.NODE_ENV || 'development'})`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
