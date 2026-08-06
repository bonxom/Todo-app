import mongoose, { Schema } from 'mongoose';
import { IInvalidatedTokenDocument, IInvalidatedTokenModel } from '../types/IInvalidatedToken.js';

const invalidatedTokenSchema = new Schema<IInvalidatedTokenDocument, IInvalidatedTokenModel>(
  {
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

invalidatedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const InvalidatedToken = mongoose.model<IInvalidatedTokenDocument, IInvalidatedTokenModel>(
  'InvalidatedToken',
  invalidatedTokenSchema
);

export default InvalidatedToken;
