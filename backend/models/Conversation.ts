import mongoose, { Schema } from "mongoose";

const schema = new Schema({
  _id: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, default: "New conversation", maxlength: 100 },
  sequence: { type: Number, default: 0 },
  activeTurn: { type: String, default: null },
  busyUntil: { type: Date, default: null },
  mode: { type: String, enum: ["auto", "ask"], default: "auto" },
  executionRevision: { type: Number, default: 0 },
}, { timestamps: true });
schema.index({ userId: 1, updatedAt: -1 });
export default mongoose.model("Conversation", schema);
