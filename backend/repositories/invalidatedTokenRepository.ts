import InvalidatedToken from '../models/InvalidatedToken.js';
import { IInvalidatedTokenDocument } from '../types/IInvalidatedToken.js';

export const invalidatedTokenRepository = {
  create(data: { token: string; expiresAt: Date }): Promise<IInvalidatedTokenDocument> {
    return InvalidatedToken.create(data);
  },

  findByToken(token: string): Promise<IInvalidatedTokenDocument | null> {
    return InvalidatedToken.findOne({ token });
  },
};
