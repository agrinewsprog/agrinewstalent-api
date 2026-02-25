import { Request, Response, NextFunction } from 'express';
import { AuthService, AppError } from './auth.service';
import {
  setAccessTokenCookie,
  setRefreshTokenCookie,
  clearAuthCookies,
} from '../../common/utils';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.authService.register(req.body);

      // (a) Set httpOnly cookies so the browser / Next.js middleware can verify session
      setAccessTokenCookie(res, result.accessToken);
      setRefreshTokenCookie(res, result.refreshToken);

      // (b) Also return accessToken in the body so SPA/Next client can store it
      //     in memory and use `Authorization: Bearer` without reading the httpOnly cookie
      res.status(201).json({
        message: 'User registered successfully',
        accessToken: result.accessToken,
        user: result.user,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          error: { message: error.message, code: error.code },
        });
        return;
      }
      next(error);
    }
  };

  login = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.authService.login(req.body);

      // (a) httpOnly cookies — browser auto-sends on every request to this origin
      setAccessTokenCookie(res, result.accessToken);
      setRefreshTokenCookie(res, result.refreshToken);

      // (b) accessToken in body — SPA can put it in Authorization: Bearer
      res.status(200).json({
        message: 'Login successful',
        accessToken: result.accessToken,
        user: result.user,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          error: { message: error.message, code: error.code },
        });
        return;
      }
      next(error);
    }
  };

  refresh = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Read refresh token from httpOnly cookie
      const refreshToken = req.cookies?.refreshToken as string | undefined;

      if (!refreshToken) {
        res.status(401).json({
          error: { message: 'No refresh token provided', code: 'NO_REFRESH_TOKEN' },
        });
        return;
      }

      const result = await this.authService.refresh(refreshToken);

      // Rotate: set new cookies
      setAccessTokenCookie(res, result.accessToken);
      setRefreshTokenCookie(res, result.refreshToken);

      res.status(200).json({
        message: 'Tokens refreshed successfully',
        accessToken: result.accessToken,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          error: { message: error.message, code: error.code },
        });
        return;
      }
      next(error);
    }
  };

  logout = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const refreshToken = req.cookies?.refreshToken as string | undefined;

      if (refreshToken) {
        // Revoke token in DB (best-effort, don't crash if it fails)
        await this.authService.logout(refreshToken).catch(() => {});
      }

      // Clear both httpOnly cookies
      clearAuthCookies(res);

      res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: { message: 'Not authenticated', code: 'UNAUTHENTICATED' } });
        return;
      }
      const updated = await this.authService.updateStudentProfile(req.user.userId, req.body);
      res.status(200).json({ message: 'Profile updated', profile: updated });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: { message: error.message, code: error.code } });
        return;
      }
      next(error);
    }
  };

  me = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // req.user is populated by the `authenticate` middleware
      if (!req.user) {
        res.status(401).json({
          error: { message: 'Not authenticated', code: 'UNAUTHENTICATED' },
        });
        return;
      }

      const user = await this.authService.getCurrentUser(req.user.userId);

      if (!user) {
        res.status(404).json({
          error: { message: 'User not found', code: 'USER_NOT_FOUND' },
        });
        return;
      }

      res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          ...(user.firstName !== undefined && { firstName: user.firstName }),
          ...(user.lastName !== undefined && { lastName: user.lastName }),
          ...((user as any).birthDate !== undefined && { birthDate: (user as any).birthDate }),
          ...((user as any).location !== undefined && { location: (user as any).location }),
          ...((user as any).country !== undefined && { country: (user as any).country }),
          ...((user as any).phoneNumber !== undefined && { phoneNumber: (user as any).phoneNumber }),
          ...((user as any).bio !== undefined && { bio: (user as any).bio }),
          ...((user as any).skills !== undefined && { skills: (user as any).skills }),
          ...((user as any).linkedinUrl !== undefined && { linkedinUrl: (user as any).linkedinUrl }),
          ...((user as any).githubUrl !== undefined && { githubUrl: (user as any).githubUrl }),
          ...((user as any).resumeUrl !== undefined && { resumeUrl: (user as any).resumeUrl }),
          ...((user as any).careerField !== undefined && { careerField: (user as any).careerField }),
          ...((user as any).avatarUrl !== undefined && { avatarUrl: (user as any).avatarUrl }),
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
