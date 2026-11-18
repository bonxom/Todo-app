import mongoose, { Schema } from "mongoose";

export interface IChatRunSlot {
  userId: mongoose.Types.ObjectId;
  slot: number;
  turnId: string;
  executionToken: string;
  createdAt: Date;
}

const schema = new Schema<IChatRunSlot>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    slot: { type: Number, required: true, min: 0, max: 2 },
    turnId: { type: String, required: true },
    executionToken: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false, versionKey: false },
);

schema.index({ userId: 1, slot: 1 }, { unique: true });
schema.index({ turnId: 1 }, { unique: true });

export default mongoose.model<IChatRunSlot>("ChatRunSlot", schema);
