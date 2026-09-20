import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issue = result.error.issues[0];
      const message = issue ? `${issue.path.join('.')}: ${issue.message}` : 'Validation failed';
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message,
          details: result.error.format(),
        },
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const issue = result.error.issues[0];
      const message = issue ? `${issue.path.join('.')}: ${issue.message}` : 'Validation failed';
      res.status(400).json({
        error: {
          code: 'QUERY_VALIDATION_ERROR',
          message,
          details: result.error.format(),
        },
      });
      return;
    }
    req.query = result.data as any;
    next();
  };
}
