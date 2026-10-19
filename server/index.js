import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Persistent storage directory
const STORAGE_DIR = path.join(__dirname, 'storage');
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

const REPORTS_FILE = path.join(STORAGE_DIR, 'reports.json');
const PASSPORT_FILE = path.join(STORAGE_DIR, 'passport.json');

// Initialize files if not present
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

// 2. Real-Time Local Traffic Congestion Vectors
app.get('/api/traffic', (req, res) => {
  const lat = parseFloat(req.query.lat) || 37.7749;
  const lng = parseFloat(req.query.lng) || -122.4194;

  // Synthesize realistic local traffic segments around the requested coordinate
  // Hour of day determines baseline congestion
  const currentHour = new Date().getHours();
  const isRushHour = (currentHour >= 8 && currentHour <= 10) || (currentHour >= 17 && currentHour <= 19);

  // Generate 6 road segment vectors around the user
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
    features
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

// 4. Community Reports: Post new report
app.post('/api/community-reports', (req, res) => {
  try {
    const { zoneId, author = 'Anonymous Learner', status = 'Gate Open', surface = 'Clean', notes } = req.body;
    if (!zoneId || !notes) {
      return res.status(400).json({ error: 'zoneId and notes are required' });
    }

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

// 6. Learner Passport: Log an hour
app.post('/api/passport/log', (req, res) => {
  try {
    const { hours = 1, isNight = false, isHighway = false } = req.body;
    const raw = fs.readFileSync(PASSPORT_FILE, 'utf-8');
    const passport = JSON.parse(raw);

    passport.loggedHours = Math.min(passport.targetHours, passport.loggedHours + hours);
    if (isNight) passport.nightHours += hours;
    if (isHighway) passport.highwayHours += hours;

    // Check badge unlocks
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

// In production, serve the built frontend assets
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[Apple Maps Backend] API server listening on http://127.0.0.1:${PORT}`);
});
