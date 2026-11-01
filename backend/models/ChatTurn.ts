import mongoose, { Schema } from "mongoose";
import type { ChatTurn } from "../types/IChatTurn.js";

// One turn contains the user message, assistant/tool exchanges and final response.
// Checkpoints are durable before tool execution, so retries cannot rerun the turn.
const schema = new Schema<ChatTurn>(
  {
    _id: String,
    conversationId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    requestId: { type: String, required: true },
    sequence: { type: Number, required: true },
    userInput: { type: String, required: true, maxlength: 2000 },
    attachments: {
      type: [
        {
          _id: false,
          id: String,
          name: String,
          mimeType: String,
          size: Number,
        },
      ],
      default: [],
    },
    selection: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ["processing", "awaiting_user", "completed", "failed", "cancelled"],
      default: "processing",
    },
    mode: { type: String, enum: ["auto", "ask"], default: "auto" },
    executionToken: { type: String, default: "" },
    interactions: { type: Schema.Types.Mixed, default: [] },
    response: { type: String, default: "" },
    messages: { type: Schema.Types.Mixed, default: [] },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
schema.index({ userId: 1, conversationId: 1, sequence: -1 });
export default mongoose.model<ChatTurn>("ChatTurn", schema);
