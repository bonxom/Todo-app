import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

export const validate = (schema: ZodType) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ message: result.error.issues[0].message });
      return;
    }
    req.validatedBody = result.data as Record<string, unknown>;
    next();
  };
};
