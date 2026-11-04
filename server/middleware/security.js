import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

/**
 * Helmet Content Security Policy & Security Headers
 */
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com", "https://basemaps.cartocdn.com", "https://*.basemaps.cartocdn.com", "https://api.mapbox.com"],
      connectSrc: ["'self'", "https://basemaps.cartocdn.com", "https://*.basemaps.cartocdn.com", "https://api.mapbox.com", "https://*.tiles.mapbox.com", "https://router.project-osrm.org", "https://photon.komoot.io"],
      workerSrc: ["'self'", "blob:"]
    }
  },
  crossOriginEmbedderPolicy: false
});

const envInt = (name, fallback) => {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};
const RATE_WINDOW_MS = envInt('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000);

/**
 * Global API rate limiter (default 300 requests per 15 mins)
 */
export const globalLimiter = rateLimit({
  windowMs: RATE_WINDOW_MS,
  max: envInt('RATE_LIMIT_MAX_GLOBAL', 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later' }
});

/**
 * Strict write rate limiter (default 60 mutation requests per 15 mins)
 */
export const writeLimiter = rateLimit({
  windowMs: RATE_WINDOW_MS,
  max: envInt('RATE_LIMIT_MAX_WRITE', 60),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many write operations from this IP, please slow down' }
});

// Capacitor WebView origins used by the native iOS/Android apps.
const NATIVE_ORIGINS = ['capacitor://localhost', 'https://localhost', 'http://localhost'];
const DEV_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:4173', 'http://127.0.0.1:4173'];

/**
 * CORS allowlist. ALLOWED_ORIGINS (or legacy CORS_ORIGINS) is a comma-separated list.
 * Outside production, local dev origins are allowed too. Unknown origins are rejected.
 */
export const corsMiddleware = () => {
  const configured = (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
  const isProduction = process.env.NODE_ENV === 'production';
  const allowed = new Set([...configured, ...NATIVE_ORIGINS, ...(isProduction ? [] : DEV_ORIGINS)]);

  return cors({
    origin: (origin, callback) => {
      // No Origin header: same-origin requests, curl, server-to-server, health checks
      if (!origin || allowed.has(origin)) return callback(null, true);
      return callback(null, false);
    }
  });
};
