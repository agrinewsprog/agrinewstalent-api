import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const isDevelopment = process.env.NODE_ENV !== 'production';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000'),
  
  DATABASE_URL: z.string().optional(),
  
  JWT_ACCESS_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

// Development defaults with warnings
const getDatabaseUrl = (): string => {
  if (parsed.data.DATABASE_URL) {
    return parsed.data.DATABASE_URL;
  }
  if (isDevelopment) {
    console.warn('⚠️  WARNING: DATABASE_URL not set. Using default: mysql://root:root@localhost:3306/agrinews_talent');
    return 'mysql://root:root@localhost:3306/agrinews_talent';
  }
  throw new Error('DATABASE_URL is required in production');
};

const getJwtSecret = (key: string, fallback: string): string => {
  const value = key === 'access' ? parsed.data.JWT_ACCESS_SECRET : parsed.data.JWT_REFRESH_SECRET;
  if (value) {
    return value;
  }
  if (isDevelopment) {
    console.warn(`⚠️  WARNING: JWT_${key.toUpperCase()}_SECRET not set. Using default (INSECURE)`);
    return fallback;
  }
  throw new Error(`JWT_${key.toUpperCase()}_SECRET is required in production`);
};

export const env = {
  nodeEnv: parsed.data.NODE_ENV,
  port: parseInt(parsed.data.PORT, 10),
  
  databaseUrl: getDatabaseUrl(),
  
  jwt: {
    accessSecret: getJwtSecret('access', 'dev-access-secret-key-CHANGE-IN-PRODUCTION'),
    refreshSecret: getJwtSecret('refresh', 'dev-refresh-secret-key-CHANGE-IN-PRODUCTION'),
    accessExpiresIn: parsed.data.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: parsed.data.JWT_REFRESH_EXPIRES_IN,
  },
  
  frontendUrl: parsed.data.FRONTEND_URL,
  
  rateLimit: {
    windowMs: parseInt(parsed.data.RATE_LIMIT_WINDOW_MS, 10),
    maxRequests: parseInt(parsed.data.RATE_LIMIT_MAX_REQUESTS, 10),
  },
};
