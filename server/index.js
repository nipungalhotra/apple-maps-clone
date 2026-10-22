import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { helmetMiddleware, globalLimiter, corsMiddleware } from './middleware/security.js';
import trafficRoutes from './routes/traffic.js';
import passportRoutes from './routes/passport.js';
import reportsRoutes from './routes/reports.js';
import subscriptionRoutes from './routes/subscription.js';
import affiliatesRoutes from './routes/affiliates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure persistent storage directory and default JSON stores exist
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, 'storage');
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

const defaultFiles = [
  {
    path: path.join(STORAGE_DIR, 'subscriptions.json'),
    data: { isPro: false, tier: 'free', unlockedAt: null, expiresAt: null }
  },
  {
    path: path.join(STORAGE_DIR, 'reports.json'),
    data: {
      'candlestick-open-ground': [
        { id: 'rep-1', author: 'Marcus V.', timeAgo: '2h ago', status: 'Gate Open', surface: 'Dry & Clear', notes: 'Completely empty right now. Only 1 other learner practicing manual.' },
        { id: 'rep-2', author: 'Elena R.', timeAgo: 'Yesterday', status: 'Gate Open', surface: 'Clean', notes: 'Great breeze. Great for motorcycle counter-steering.' }
      ],
      'ccsf-lower-parking': [
        { id: 'rep-3', author: 'Sarah K.', timeAgo: '4h ago', status: 'Open Weekend', surface: 'Paved', notes: 'No campus security. Painted bays make parallel parking super easy.' }
      ]
    }
  },
  {
    path: path.join(STORAGE_DIR, 'passport.json'),
    data: {
      loggedHours: 18,
      targetHours: 50,
      nightHours: 5,
      highwayHours: 3,
      badges: ['First Ignition', 'Friction Master', 'Cone Wizard']
    }
  }
];

defaultFiles.forEach(({ path: filePath, data }) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }
});

// 1. Security & Parsing Middlewares
app.use(helmetMiddleware);
app.use(corsMiddleware());
app.use(express.json({ limit: '100kb' }));
app.use('/api/', globalLimiter);

// 2. Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Apple Maps Learner Engine Backend',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 3. Mount Modular API Routers
app.use('/api/traffic', trafficRoutes);
app.use('/api/passport', passportRoutes);
app.use('/api/community-reports', reportsRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/affiliates', affiliatesRoutes);

// 4. Production Static File Serving
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// 5. Start Listener
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`[Apple Maps Backend] Production server listening on http://127.0.0.1:${PORT}`);
  });
}

export { app };
export default app;
