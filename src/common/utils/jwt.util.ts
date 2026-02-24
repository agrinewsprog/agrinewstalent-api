import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { AuthPayload } from '../middlewares/auth.middleware';

// jsonwebtoken 9.x types expiresIn as `number | StringValue` (branded ms type).
// env stores it as plain string ('15m', '7d') which is valid at runtime but
// fails the strict type check. Casting through SignOptions keeps it clean.
const accessOpts:  SignOptions = { expiresIn: env.jwt.accessExpiresIn  as SignOptions['expiresIn'] };
const refreshOpts: SignOptions = { expiresIn: env.jwt.refreshExpiresIn as SignOptions['expiresIn'] };

export const generateAccessToken = (payload: AuthPayload): string => {
  return jwt.sign(payload, env.jwt.accessSecret, accessOpts);
};

export const generateRefreshToken = (payload: AuthPayload): string => {
  return jwt.sign(payload, env.jwt.refreshSecret, refreshOpts);
};

export const verifyRefreshToken = (token: string): AuthPayload => {
  return jwt.verify(token, env.jwt.refreshSecret) as AuthPayload;
};
