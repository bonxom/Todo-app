import InvalidatedToken from '../models/InvalidatedToken.js';

export const invalidatedTokenRepository = {
  create(data) {
    return InvalidatedToken.create(data);
  },

  findByToken(token) {
    return InvalidatedToken.findOne({ token });
  },
};
