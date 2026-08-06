import { IUserDocument } from './IUser.js';

declare global {
  namespace Express {
    interface Request {
      user?: IUserDocument;
      validatedBody?: Record<string, unknown>;
    }
  }
}

export {};
