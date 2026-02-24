import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './common/middlewares';
import routes from './routes';

const app: Application = express();

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================

app.use(helmet());

// CORS: credentials:true requires a reflected (non-wildcard) origin.
// In production only env.frontendUrl is allowed.
// In development any localhost/127.0.0.1 port is allowed for convenience.
app.use(
  cors({
    origin: (origin, callback) => {
      // Non-browser clients (curl, Postman, SSR fetch, Next middleware) have no origin
      if (!origin) return callback(null, true);

      // Always allow the configured frontend URL
      if (origin === env.frontendUrl) return callback(null, true);

      // In development: allow any localhost / 127.0.0.1 port
      if (env.nodeEnv !== 'production') {
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
      }

      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,          // Access-Control-Allow-Credentials: true
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })
);

// ============================================================
// GLOBAL HEALTH CHECK (before rate limiting)
// ============================================================

app.get('/health', (_req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.nodeEnv,
  });
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.nodeEnv,
  });
});

// Rate limiting (aplica a /api)
const limiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ============================================================
// BODY PARSING MIDDLEWARE
// ============================================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ============================================================
// ROUTES
// ============================================================

app.use('/api', routes);

// ============================================================
// 404 HANDLER (after routes, before errorHandler)
// ============================================================

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ============================================================
// ERROR HANDLING (must be last)
// ============================================================

app.use(errorHandler);

export default app;