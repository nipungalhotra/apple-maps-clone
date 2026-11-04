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
import instructorsRoutes from './routes/instructors.js';
import accountRoutes from './routes/account.js';
import paymentRoutes, { stripeWebhook, revenueCatWebhook } from './routes/payments.js';
import { getDb, query, closeDb } from './db/index.js';
import { authConfigured } from './lib/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3001;
// Bind to all interfaces by default so container hosts (Render, Railway, Docker) can route traffic.
const HOST = process.env.HOST || '0.0.0.0';

// 1. Security & Parsing Middlewares
app.disable('x-powered-by');
app.use(helmetMiddleware);
app.use(corsMiddleware());
// Payment webhooks: Stripe signs the exact raw bytes, so this route must run before express.json().
app.post('/api/payments/stripe/webhook', express.raw({ type: 'application/json', limit: '512kb' }), stripeWebhook);
app.post('/api/payments/revenuecat/webhook', express.json({ limit: '256kb' }), revenueCatWebhook);
app.use(express.json({ limit: '16kb' }));
app.use('/api/', globalLimiter);

// 2. Health Check
app.get('/api/health', async (req, res) => {
  let database = 'ok';
  try {
    await query('SELECT 1');
  } catch {
    database = 'unavailable';
  }
  res.status(database === 'ok' ? 200 : 503).json({
    status: database === 'ok' ? 'ok' : 'degraded',
    service: 'RoadReady API',
    database,
    accounts: authConfigured ? 'enabled' : 'disabled',
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
app.use('/api/instructors', instructorsRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/payments', paymentRoutes);

// Unknown API routes return JSON 404 (never the SPA HTML)
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// 4. Production Static File Serving
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// 5. Error handler: malformed JSON and other errors -> JSON response, no stack traces
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

// 6. Start Listener (skipped under tests, which import the app directly)
if (process.env.NODE_ENV !== 'test') {
  if (process.env.NODE_ENV === 'production' && !authConfigured) {
    console.warn('[RoadReady API] SUPABASE_URL is not set: accounts are disabled and everyone is a guest.');
  }
  // Connect and run migrations before accepting traffic; exit if the database is unreachable.
  getDb()
    .then((db) => {
      const server = app.listen(PORT, HOST, () => {
        console.log(`[RoadReady API] listening on http://${HOST}:${PORT} (${process.env.NODE_ENV || 'development'}, db: ${db.kind})`);
      });
      const shutdown = () => server.close(() => closeDb().finally(() => process.exit(0)));
      process.on('SIGTERM', shutdown);
      process.on('SIGINT', shutdown);
    })
    .catch((err) => {
      console.error('[RoadReady API] Database startup failed:', err.message);
      process.exit(1);
    });
}

export { app };
export default app;
