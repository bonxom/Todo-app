import { Document, Model } from 'mongoose';

export interface IInvalidatedToken {
  token: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInvalidatedTokenDocument extends IInvalidatedToken, Document {}

export interface IInvalidatedTokenModel extends Model<IInvalidatedTokenDocument> {}
