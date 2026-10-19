import mongoose, { Schema } from "mongoose";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import type { AgentInteraction, AgentMode } from "../services/agentInteraction.js";

export interface ChatTurn {
  _id: string;
  conversationId: string;
  userId: mongoose.Types.ObjectId;
  requestId: string;
  sequence: number;
  userInput: string;
  status: "processing" | "awaiting_user" | "completed" | "failed" | "cancelled";
  mode: AgentMode;
  executionToken: string;
  interactions: AgentInteraction[];
  response: string;
  messages: ChatCompletionMessageParam[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
// One turn contains the user message, assistant/tool exchanges and final response.
// Checkpoints are durable before tool execution, so retries cannot rerun the turn.
const schema = new Schema<ChatTurn>({
  _id: String,
  conversationId: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, required: true },
  requestId: { type: String, required: true },
  sequence: { type: Number, required: true },
  userInput: { type: String, required: true, maxlength: 2000 },
  status: { type: String, enum: ["processing", "awaiting_user", "completed", "failed", "cancelled"], default: "processing" },
  mode: { type: String, enum: ["auto", "ask"], default: "auto" },
  executionToken: { type: String, default: "" },
  interactions: { type: Schema.Types.Mixed, default: [] },
  response: { type: String, default: "" },
  messages: { type: Schema.Types.Mixed, default: [] },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });
schema.index({ userId: 1, conversationId: 1, sequence: -1 });
export default mongoose.model<ChatTurn>("ChatTurn", schema);
