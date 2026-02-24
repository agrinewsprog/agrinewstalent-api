import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { ACCESS_TOKEN_COOKIE } from '../utils/cookie.util';

export interface AuthPayload {
  userId: number;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * Extracts the access token from:
 *   1. `Authorization: Bearer <token>` header   → SPA / Next.js fetch with token in store
 *   2. `accessToken` httpOnly cookie             → browser with credentials:include
 *
 * For Next.js middleware verification, the typical flow is:
 *   - Browser sends cookie to Next.js → Next.js middleware forwards it to the API
 *     (e.g., via `fetch(apiUrl, { headers: { cookie: req.headers.cookie } })`)
 *   OR
 *   - Next.js reads the raw cookie value and passes it as `Authorization: Bearer`
 */
function extractToken(req: Request): string | null {
  // 1. Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }

  // 2. httpOnly cookie (browser with credentials:include, or Next.js forwarded cookie)
  const cookieToken = req.cookies?.[ACCESS_TOKEN_COOKIE];
  if (cookieToken && typeof cookieToken === 'string' && cookieToken.trim()) {
    return cookieToken.trim();
  }

  return null;
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = extractToken(req);

    if (!token) {
      res.status(401).json({
        error: { message: 'No access token provided', code: 'NO_TOKEN' },
      });
      return;
    }

    const decoded = jwt.verify(token, env.jwt.accessSecret) as AuthPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: { message: 'Access token expired', code: 'TOKEN_EXPIRED' },
      });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: { message: 'Invalid access token', code: 'TOKEN_INVALID' },
      });
      return;
    }
    res.status(500).json({
      error: { message: 'Authentication failed', code: 'AUTH_FAILED' },
    });
  }
};

/**
 * Like `authenticate`, but optional — populates req.user if a valid token
 * is present, otherwise just continues without 401.
 */
export const optionalAuthenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const token = extractToken(req);
    if (token) {
      req.user = jwt.verify(token, env.jwt.accessSecret) as AuthPayload;
    }
  } catch {
    // ignore — token absent or invalid, req.user stays undefined
  }
  next();
};

