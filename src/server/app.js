import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/schema.js';
import { seedDatabase } from './db/seed.js';
import { createAuthRouter } from './routes/authRoutes.js';
import { createComplaintRouter } from './routes/complaintRoutes.js';
import { createScheduleRouter } from './routes/scheduleRoutes.js';
import { createAnalyticsRouter } from './routes/analyticsRoutes.js';
import { createUserRouter } from './routes/userRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(customDb = null) {
  const app = express();
  const db = customDb || initDatabase();

  // Seed demo data if newly initialized
  seedDatabase(db);

  // Core Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static uploads directory
  const uploadsDir = path.resolve(__dirname, '../../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir, {
    dotfiles: 'ignore',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', 'inline');
    }
  }));

  // API Routes
  app.use('/api/v1/auth', createAuthRouter(db));
  app.use('/api/v1/complaints', createComplaintRouter(db));
  app.use('/api/v1/schedules', createScheduleRouter(db));
  app.use('/api/v1/analytics', createAnalyticsRouter(db));
  app.use('/api/v1/users', createUserRouter(db));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'SocietyClean Waste Management API'
    });
  });

  // Serve static client bundle if built
  const clientDist = path.resolve(__dirname, '../../dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('{*path}', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  // Central 404 handler for unmatched API routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: `API route ${req.originalUrl} not found` }
      });
    }
    next();
  });

  // Central Error Handler
  app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(err.status || 500).json({
      success: false,
      data: null,
      error: {
        code: err.code || 'SERVER_ERROR',
        message: err.message || 'An unexpected error occurred'
      }
    });
  });

  return { app, db };
}
