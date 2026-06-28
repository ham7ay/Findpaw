import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { initFirebase, firebaseReady } from './config/firebase.js';
import { initSocket } from './services/socketService.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.js';
import petRoutes from './routes/pets.js';
import deviceRoutes from './routes/devices.js';
import gpsRoutes from './routes/gps.js';
import predictionRoutes from './routes/predictions.js';
import alertRoutes from './routes/alerts.js';
import analyticsRoutes from './routes/analytics.js';
import geofenceRoutes from './routes/geofences.js';
import adminRoutes from './routes/admin.js';

const PORT = parseInt(process.env.PORT || '5000', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

const app = express();
const server = http.createServer(app);

// ── Security / parsing ────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Rate limiting ─────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || '120', 10),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// ── Health check ──────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    firebase: firebaseReady(),
    aiService: !!process.env.AI_SERVICE_URL,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/gps', gpsRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/geofences', geofenceRoutes);
app.use('/api/admin', adminRoutes);

// ── 404 + Error handler (must be last) ────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Bootstrap ─────────────────────────────────────────────────────
initFirebase();
initSocket(server, CORS_ORIGIN);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╭──────────────────────────────────────────────────╮
│  🐾  Find🐾 server                              │
│  http://localhost:${PORT.toString().padEnd(6)}                       │
│  socket.io /socket.io                           │
│  health     /health                             │
│  Firebase   ${firebaseReady() ? '✅ live' : '⚠️  demo mode'.padEnd(15)}             │
╰──────────────────────────────────────────────────╯
`);
});

process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err);
});
