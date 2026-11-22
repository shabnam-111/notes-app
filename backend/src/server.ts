import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { config } from './config';
import routes from './routes';
import { errorHandler } from './middleware/error';
import { prisma } from './config/prisma';

const app = express();

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ALLOWED_ORIGINS ?? '').split(','),
].map((origin) => origin?.trim()).filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || config.env === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes',
  },
});
app.use('/api/', limiter);

// Parsing middleware
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

// Static files for uploaded docs (protected via auth in real prod, exposed here for local inspection)
app.use('/uploads', express.static(path.resolve(config.uploadDir)));

// Root landing endpoint
app.get('/', (_req, res) => {
  res.json({
    success: true,
    service: 'MindVault Backend API',
    version: '1.0.0',
    webApp: 'http://localhost:3000',
    apiRoot: 'http://localhost:4000/api/v1',
    health: 'http://localhost:4000/api/v1/health',
  });
});

// API v1 Routes
app.use('/api/v1', routes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Centralized Error Handler
app.use(errorHandler);

// Start Server only if not in test environment
let server: any = null;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(config.port, () => {
    console.log(`===============================================`);
    console.log(` MindVault Backend running on port ${config.port}`);
    console.log(` Environment: ${config.env}`);
    console.log(` API Endpoint: http://localhost:${config.port}/api/v1`);
    console.log(` Health Check: http://localhost:${config.port}/api/v1/health`);
    console.log(`===============================================`);
  });
}

// Graceful Shutdown
const shutdown = async () => {
  console.log('\n[Server] Shutting down gracefully...');
  if (server) {
    server.close(async () => {
      try {
        await prisma.$disconnect();
        console.log('[Prisma] Disconnected cleanly.');
      } catch (err) {
        console.error('[Prisma] Disconnect error:', err);
      }
      process.exit(0);
    });
  } else {
    await prisma.$disconnect();
    process.exit(0);
  }
};

if (server) {
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

export default app;
