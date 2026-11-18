import mongoose, { Schema } from "mongoose";

export interface IChatTurnEvent {
  turnId: string;
  userId: mongoose.Types.ObjectId;
  conversationId: string;
  seq: number;
  type: string;
  payload: unknown;
  createdAt: Date;
}

const schema = new Schema<IChatTurnEvent>(
  {
    turnId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    conversationId: { type: String, required: true },
    seq: { type: Number, required: true },
    type: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false, versionKey: false },
);

schema.index({ turnId: 1, seq: 1 }, { unique: true });
schema.index({ userId: 1, conversationId: 1, turnId: 1, seq: 1 });

export default mongoose.model<IChatTurnEvent>("ChatTurnEvent", schema);
