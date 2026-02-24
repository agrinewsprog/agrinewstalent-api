import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

const isDev = process.env.NODE_ENV !== 'production';

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Always log in dev with full stack; in prod log without noise
  if (isDev) {
    console.error('[ErrorHandler]', error);
  } else {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[ErrorHandler]', msg);
  }

  // Zod validation errors that slip past the validate middleware
  if (error instanceof ZodError) {
    const issues = error.issues ?? [];
    res.status(400).json({
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  // Known operational error with a status code
  if (
    error instanceof Error &&
    'statusCode' in error &&
    'code' in error &&
    typeof (error as any).statusCode === 'number'
  ) {
    const appErr = error as Error & { statusCode: number; code: string };
    res.status(appErr.statusCode).json({
      error: {
        message: appErr.message,
        code: appErr.code,
      },
    });
    return;
  }

  // Generic / unexpected server error
  const message =
    isDev && error instanceof Error
      ? error.message
      : 'Internal server error';

  res.status(500).json({
    error: {
      message,
      code: 'INTERNAL_SERVER_ERROR',
      ...(isDev && error instanceof Error && { stack: error.stack }),
    },
  });
};
