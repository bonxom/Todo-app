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
    intent: { type: String, enum: ["task_proposal"] },
    requestIntent: { type: String, enum: ["task_proposal", null] },
    proposalId: { type: String },
    uiSurface: { type: Schema.Types.Mixed, default: null },
    contextProjectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    executionToken: { type: String, default: "" },
    interactions: { type: Schema.Types.Mixed, default: [] },
    response: { type: String, default: "" },
    messages: { type: Schema.Types.Mixed, default: [] },
    activities: { type: Schema.Types.Mixed, default: [] },
    skillsRead: {
      type: [
        {
          _id: false,
          id: String,
          name: String,
          version: Number,
        },
      ],
      default: [],
    },
    timeContext: { type: Schema.Types.Mixed },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
schema.index({ userId: 1, conversationId: 1, sequence: -1 });
export default mongoose.model<ChatTurn>("ChatTurn", schema);
