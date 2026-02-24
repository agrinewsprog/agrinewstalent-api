import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

type ValidateSource = 'body' | 'query' | 'params' | 'all';

export const validate = (schema: ZodSchema, source: ValidateSource = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    let dataToValidate: any;

    if (source === 'all') {
      dataToValidate = {
        body: req.body,
        query: req.query,
        params: req.params,
      };
    } else {
      dataToValidate = req[source];
    }

    // safeParse never throws — handles any internal Zod error gracefully
    const result = schema.safeParse(dataToValidate);

    if (!result.success) {
      const issues = result.error.issues ?? [];
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

    // Apply transformed/defaulted values back to the request so
    // controllers receive the clean, typed data (e.g. foundedYear as number)
    if (source === 'all') {
      const parsed = result.data as { body?: any; query?: any; params?: any };
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) req.query = parsed.query;
      if (parsed.params !== undefined) req.params = parsed.params;
    } else {
      (req as any)[source] = result.data;
    }

    next();
  };
};
