import { IUserDocument } from './IUser.js';

declare global {
  namespace Express {
    interface Request {
      user?: IUserDocument;
      requestId: string;
      validatedBody?: Record<string, unknown>;
      validatedParams?: Record<string, string>;
      validatedQuery?: Record<string, unknown>;
    }
  }
}

export {};
