import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type ValidateSource = 'body' | 'query' | 'params' | 'all';

export const validate = (schema: ZodSchema, source: ValidateSource = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
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

      schema.parse(dataToValidate);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};
