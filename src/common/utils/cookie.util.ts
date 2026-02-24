import { Response } from 'express';

export const ACCESS_TOKEN_COOKIE  = 'accessToken';
export const REFRESH_TOKEN_COOKIE = 'refreshToken';

/**
 * Cookie options that work for both browser-cookie flow (credentials:include)
 * and Next.js middleware verification (cookies are forwarded server-side).
 *
 * Rules:
 *  - httpOnly: true          → JS cannot read it (XSS protection)
 *  - sameSite: 'lax'         → sent on same-site + top-level navigations; works for
 *                              localhost dev (all ports are same-site)
 *  - secure: false in dev    → required for plain HTTP; true in production (HTTPS)
 *  - path: '/'               → cookie visible to all API paths
 *  - NO domain               → browser scopes cookie to the exact host that set it
 */
const isProduction = process.env.NODE_ENV === 'production';

const BASE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
};

export const setAccessTokenCookie = (res: Response, token: string): void => {
  res.cookie(ACCESS_TOKEN_COOKIE, token, {
    ...BASE_OPTIONS,
    maxAge: 15 * 60 * 1000,          // 15 minutes
  });
};

export const setRefreshTokenCookie = (res: Response, token: string): void => {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    ...BASE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const clearAuthCookies = (res: Response): void => {
  // Must use same path/sameSite/secure when clearing
  res.clearCookie(ACCESS_TOKEN_COOKIE,  { ...BASE_OPTIONS });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { ...BASE_OPTIONS });
};

