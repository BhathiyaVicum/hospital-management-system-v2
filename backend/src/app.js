import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pool } from './config/database.js';
import { corsOptions } from './config/cors.js';
import { getEnv } from './config/env.js';
import { verifyCsrf } from './middleware/csrf.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';
import clinicRoutes from './routes/clinicRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import specialtyRoutes from './routes/specialtyRoutes.js';
import staffSupportRoutes from './routes/staffSupportRoutes.js';
import supportRoutes from './routes/supportRoutes.js';

export function createApp({ env = getEnv(), healthCheck = () => pool.query('SELECT 1') } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors(corsOptions(env)));
  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    req.env = env;
    next();
  });

  app.get('/api/health', async (req, res) => {
    try {
      await healthCheck();
      return res.json({ status: 'ok', database: 'connected' });
    } catch {
      return res.status(503).json({ status: 'error', database: 'unavailable' });
    }
  });

  app.use('/api', (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    return verifyCsrf(req, res, next);
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/patients', patientRoutes);
  app.use('/api/doctors', doctorRoutes);
  app.use('/api/specialties', specialtyRoutes);
  app.use('/api/clinics', clinicRoutes);
  app.use('/api/support', supportRoutes);
  app.use('/api/staff/support', staffSupportRoutes);
  app.use(
    '/api/appointments',
    rateLimit({
      windowMs: 60 * 60 * 1000,
      limit: 30,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { message: 'Too many appointment requests. Please try again later.' },
    }),
    appointmentRoutes,
  );
  app.use('/api', notFoundHandler);
  app.use(errorHandler);
  return app;
}

export default createApp;
