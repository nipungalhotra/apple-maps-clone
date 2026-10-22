import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// 1. Security Headers (Helmet) with MapLibre & Basemap exceptions
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com", "https://basemaps.cartocdn.com"],
      connectSrc: ["'self'", "https://basemaps.cartocdn.com", "https://router.project-osrm.org", "https://photon.komoot.io"],
      workerSrc: ["'self'", "blob:"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// 2. Global Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api/', apiLimiter);

// Strict Rate Limiting for Write Operations
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Too many write operations from this IP, please slow down' }
});

// 3. CORS & Parser
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('capacitor://') || origin.startsWith('http://localhost')) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive in dev/staging
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '100kb' }));

// Persistent storage directory
const STORAGE_DIR = path.join(__dirname, 'storage');
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

const REPORTS_FILE = path.join(STORAGE_DIR, 'reports.json');
const PASSPORT_FILE = path.join(STORAGE_DIR, 'passport.json');
const SUBSCRIPTION_FILE = path.join(STORAGE_DIR, 'subscriptions.json');

// Initialize files if not present
if (!fs.existsSync(SUBSCRIPTION_FILE)) {
  const initialSubscription = {
    isPro: false,
    tier: 'free',
    unlockedAt: null,
    expiresAt: null
  };
  fs.writeFileSync(SUBSCRIPTION_FILE, JSON.stringify(initialSubscription, null, 2));
}
if (!fs.existsSync(REPORTS_FILE)) {
  const initialReports = {
    'candlestick-open-ground': [
      { id: 'rep-1', author: 'Marcus V.', timeAgo: '2h ago', status: 'Gate Open', surface: 'Dry & Clear', notes: 'Completely empty right now. Only 1 other learner practicing manual.' },
      { id: 'rep-2', author: 'Elena R.', timeAgo: 'Yesterday', status: 'Gate Open', surface: 'Clean', notes: 'Great breeze. Great for motorcycle counter-steering.' }
    ],
    'ccsf-lower-parking': [
      { id: 'rep-3', author: 'Sarah K.', timeAgo: '4h ago', status: 'Open Weekend', surface: 'Paved', notes: 'No campus security. Painted bays make parallel parking super easy.' }
    ]
  };
  fs.writeFileSync(REPORTS_FILE, JSON.stringify(initialReports, null, 2));
}

if (!fs.existsSync(PASSPORT_FILE)) {
  const initialPassport = {
    loggedHours: 18,
    targetHours: 50,
    nightHours: 5,
    highwayHours: 3,
    badges: ['First Ignition', 'Friction Master', 'Cone Wizard']
  };
  fs.writeFileSync(PASSPORT_FILE, JSON.stringify(initialPassport, null, 2));
}

// 1. Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Apple Maps Learner Engine Backend',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 2. Real-Time Local Traffic Congestion Vectors & Incidents
app.get('/api/traffic', (req, res) => {
  const lat = parseFloat(req.query.lat) || 37.7749;
  const lng = parseFloat(req.query.lng) || -122.4194;

  const currentHour = new Date().getHours();
  const isRushHour = (currentHour >= 8 && currentHour <= 10) || (currentHour >= 17 && currentHour <= 19);

  // Generate real-time flow road segment vectors
  const segments = [
    {
      id: 'traf-seg-1',
      name: 'Main Arterial Northbound',
      congestion: isRushHour ? 'heavy' : 'moderate',
      speedMph: isRushHour ? 9 : 28,
      color: isRushHour ? '#FF3B30' : '#FFCC00',
      coordinates: [
        [lng - 0.006, lat - 0.008],
        [lng - 0.002, lat],
        [lng + 0.001, lat + 0.008]
      ]
    },
    {
      id: 'traf-seg-2',
      name: 'Main Arterial Southbound',
      congestion: isRushHour ? 'moderate' : 'low',
      speedMph: isRushHour ? 19 : 34,
      color: isRushHour ? '#FFCC00' : '#34C759',
      coordinates: [
        [lng + 0.0015, lat + 0.008],
        [lng - 0.0015, lat],
        [lng - 0.0055, lat - 0.008]
      ]
    },
    {
      id: 'traf-seg-3',
      name: 'Cross-Town Connector West',
      congestion: 'low',
      speedMph: 32,
      color: '#34C759',
      coordinates: [
        [lng - 0.012, lat + 0.003],
        [lng - 0.004, lat + 0.003],
        [lng + 0.005, lat + 0.004]
      ]
    },
    {
      id: 'traf-seg-4',
      name: 'Practice Access Ring Road',
      congestion: 'low',
      speedMph: 15,
      color: '#34C759',
      coordinates: [
        [lng + 0.004, lat - 0.006],
        [lng + 0.008, lat - 0.002],
        [lng + 0.010, lat + 0.003]
      ]
    },
    {
      id: 'traf-seg-5',
      name: 'Downtown Commercial Corridor',
      congestion: isRushHour ? 'heavy' : 'moderate',
      speedMph: isRushHour ? 6 : 18,
      color: isRushHour ? '#FF3B30' : '#FFCC00',
      coordinates: [
        [lng - 0.008, lat + 0.006],
        [lng - 0.002, lat + 0.006],
        [lng + 0.006, lat + 0.007]
      ]
    },
    {
      id: 'traf-seg-6',
      name: 'Quiet Residential Perimeter Loop',
      congestion: 'low',
      speedMph: 15,
      color: '#34C759',
      coordinates: [
        [lng - 0.010, lat - 0.003],
        [lng - 0.008, lat - 0.007],
        [lng - 0.003, lat - 0.007],
        [lng - 0.002, lat - 0.004]
      ]
    }
  ];

  // Dynamic Real-Time Incidents (Accidents, Construction, Slowdowns)
  const incidents = [
    {
      id: 'inc-1',
      type: 'construction',
      title: 'Lane Resurfacing & Cones Active',
      delayMinutes: 4,
      coordinates: [lng - 0.004, lat + 0.005],
      severity: 'moderate'
    },
    {
      id: 'inc-2',
      type: 'congestion',
      title: 'School Zone Active (15 MPH Limit)',
      delayMinutes: isRushHour ? 7 : 2,
      coordinates: [lng + 0.003, lat - 0.002],
      severity: isRushHour ? 'high' : 'low'
    }
  ];

  const features = segments.map(seg => ({
    type: 'Feature',
    id: seg.id,
    properties: {
      id: seg.id,
      name: seg.name,
      congestion: seg.congestion,
      speedMph: seg.speedMph,
      color: seg.color
    },
    geometry: {
      type: 'LineString',
      coordinates: seg.coordinates
    }
  }));

  res.json({
    type: 'FeatureCollection',
    isRushHour,
    currentHour,
    overallTrafficIndex: isRushHour ? 78 : 28,
    legend: {
      green: 'Free Flow (Ideal for Learners)',
      yellow: 'Moderate Activity',
      red: 'Congested / Heavy Traffic'
    },
    features,
    incidents
  });
});

// 3. Community Reports: Get all or for specific ground
app.get('/api/community-reports', (req, res) => {
  try {
    const raw = fs.readFileSync(REPORTS_FILE, 'utf-8');
    const reports = JSON.parse(raw);
    const { zoneId } = req.query;
    if (zoneId) {
      return res.json(reports[zoneId] || []);
    }
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read community reports', details: err.message });
  }
});

// 4. Community Reports: Post new report (Rate-limited & sanitized)
app.post('/api/community-reports', writeLimiter, (req, res) => {
  try {
    let { zoneId, author = 'Anonymous Learner', status = 'Gate Open', surface = 'Clean', notes } = req.body;
    if (!zoneId || !notes || typeof notes !== 'string') {
      return res.status(400).json({ error: 'zoneId and string notes are required' });
    }

    author = String(author).slice(0, 50).trim();
    status = String(status).slice(0, 40).trim();
    surface = String(surface).slice(0, 40).trim();
    notes = String(notes).slice(0, 500).trim();

    const raw = fs.readFileSync(REPORTS_FILE, 'utf-8');
    const reports = JSON.parse(raw);

    if (!reports[zoneId]) {
      reports[zoneId] = [];
    }

    const newEntry = {
      id: `rep-${Date.now()}`,
      author,
      timeAgo: 'Just now',
      status,
      surface,
      notes
    };

    reports[zoneId].unshift(newEntry);
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2));

    res.status(201).json({ success: true, report: newEntry, count: reports[zoneId].length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save community report', details: err.message });
  }
});

// 5. Learner Passport: Get hours and badges
app.get('/api/passport', (req, res) => {
  try {
    const raw = fs.readFileSync(PASSPORT_FILE, 'utf-8');
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read passport data', details: err.message });
  }
});

// 6. Learner Passport: Log an hour (Rate-limited & validated)
app.post('/api/passport/log', writeLimiter, (req, res) => {
  try {
    const hours = Math.max(1, Math.min(10, Number(req.body.hours) || 1));
    const isNight = Boolean(req.body.isNight);
    const isHighway = Boolean(req.body.isHighway);

    const raw = fs.readFileSync(PASSPORT_FILE, 'utf-8');
    const passport = JSON.parse(raw);

    passport.loggedHours = Math.min(passport.targetHours, passport.loggedHours + hours);
    if (isNight) passport.nightHours += hours;
    if (isHighway) passport.highwayHours += hours;

    const badgeMap = [
      { thresh: 5, name: 'First Ignition' },
      { thresh: 15, name: 'Friction Master' },
      { thresh: 25, name: 'Cone Wizard' },
      { thresh: 35, name: 'Highway Navigator' },
      { thresh: 50, name: 'Road Ready Master' }
    ];

    badgeMap.forEach(b => {
      if (passport.loggedHours >= b.thresh && !passport.badges.includes(b.name)) {
        passport.badges.push(b.name);
      }
    });

    fs.writeFileSync(PASSPORT_FILE, JSON.stringify(passport, null, 2));
    res.json({ success: true, passport });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update passport', details: err.message });
  }
});

// 7. Subscription: Get current subscription status
app.get('/api/subscription', (req, res) => {
  try {
    const raw = fs.readFileSync(SUBSCRIPTION_FILE, 'utf-8');
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read subscription', details: err.message });
  }
});

// 8. Subscription: Upgrade to Pro (Rate-limited & validated)
app.post('/api/subscription/upgrade', writeLimiter, (req, res) => {
  try {
    const { tier = 'lifetime', price = 29.99 } = req.body;
    const now = new Date();
    const updated = {
      isPro: true,
      tier: String(tier).slice(0, 20),
      price: Number(price) || 29.99,
      unlockedAt: now.toISOString(),
      expiresAt: tier === 'monthly' ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      transactionId: `TXN-MAPS-${Date.now()}`
    };
    fs.writeFileSync(SUBSCRIPTION_FILE, JSON.stringify(updated, null, 2));
    res.json({ success: true, subscription: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upgrade subscription', details: err.message });
  }
});

// 9. Subscription: Reset to Free (for testing)
app.post('/api/subscription/reset', writeLimiter, (req, res) => {
  try {
    const reset = {
      isPro: false,
      tier: 'free',
      unlockedAt: null,
      expiresAt: null
    };
    fs.writeFileSync(SUBSCRIPTION_FILE, JSON.stringify(reset, null, 2));
    res.json({ success: true, subscription: reset });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset subscription', details: err.message });
  }
});

// 10. Model 3: Auto Insurance Affiliate Quote Dispatch
const INSURANCE_CLICKS_FILE = path.join(STORAGE_DIR, 'insurance_clicks.json');
if (!fs.existsSync(INSURANCE_CLICKS_FILE)) {
  fs.writeFileSync(INSURANCE_CLICKS_FILE, JSON.stringify([], null, 2));
}

app.post('/api/affiliates/insurance-click', writeLimiter, (req, res) => {
  try {
    const clickData = req.body;
    const raw = fs.readFileSync(INSURANCE_CLICKS_FILE, 'utf-8');
    const clicks = JSON.parse(raw);

    const record = {
      id: `aff-click-${Date.now()}`,
      partnerId: String(clickData.partnerId || 'partner').slice(0, 50),
      partnerName: String(clickData.partnerName || 'Partner').slice(0, 80),
      cpaPayout: Number(clickData.cpaPayout) || 75.00,
      estimatedSavings: Number(clickData.estimatedSavings) || 450,
      driverAge: Number(clickData.driverAge) || 17,
      loggedHours: Number(clickData.loggedHours) || 0,
      timestamp: new Date().toISOString()
    };

    clicks.unshift(record);
    fs.writeFileSync(INSURANCE_CLICKS_FILE, JSON.stringify(clicks, null, 2));
    res.json({ success: true, trackingRecord: record, totalDispatchedLeads: clicks.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to track insurance affiliate click', details: err.message });
  }
});

app.get('/api/affiliates/insurance-clicks', (req, res) => {
  try {
    const raw = fs.readFileSync(INSURANCE_CLICKS_FILE, 'utf-8');
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read insurance clicks', details: err.message });
  }
});

// In production, serve the built frontend assets
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Only listen directly when not executed in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`[Apple Maps Backend] API server listening on http://127.0.0.1:${PORT}`);
  });
}

export { app };
export default app;
