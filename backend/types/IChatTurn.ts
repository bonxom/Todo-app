import type { AttachmentView } from "./IAttachment.js";
import type mongoose from "mongoose";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import type { AgentInteraction, AgentMode } from "./IAgent.js";

export interface ChatTurn {
  _id: string;
  conversationId: string;
  userId: mongoose.Types.ObjectId;
  requestId: string;
  sequence: number;
  userInput: string;
  attachments?: AttachmentView[];
  selection?: InteractionSelection;
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
export interface InteractionSelection {
  interactionId: string;
  optionId?: string;
  customAnswer?: string;
  cancel?: boolean;
}
