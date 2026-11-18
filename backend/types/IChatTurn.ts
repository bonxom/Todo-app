import type { AttachmentView } from "./IAttachment.js";
import type { AgentTimeContext } from "./IAgentTimeContext.js";
import type mongoose from "mongoose";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import type { AgentInteraction, AgentMode } from "./IAgent.js";
import type { ProposalIntent } from "./A2UI/ITaskProposal.js";
import type { StoredUiSurface } from "./A2UI/IUiSurface.js";
import type { AgentActivity } from "./IAgentActivity.js";
import type { ToolProgress } from "./IChatStream.js";

export interface SkillReadMetadata {
  id: string;
  name: string;
  version: number;
}

export interface ChatTurn {
  _id: string;
  conversationId: string;
  userId: mongoose.Types.ObjectId;
  requestId: string;
  sequence: number;
  userInput: string;
  attachments?: AttachmentView[];
  selection?: InteractionSelection;
  status:
    | "processing"
    | "stopping"
    | "awaiting_user"
    | "completed"
    | "failed"
    | "cancelled"
    | "timed_out"
    | "interrupted";
  mode: AgentMode;
  intent?: ProposalIntent;
  requestIntent?: ProposalIntent | null;
  proposalId?: string;
  uiSurface?: StoredUiSurface | null;
  contextProjectId?: mongoose.Types.ObjectId | null;
  executionToken: string;
  interactions: AgentInteraction[];
  response: string;
  partialResponse?: string;
  lastEventSeq?: number;
  deadlineAt?: Date;
  stopRequestedAt?: Date;
  stopReason?: "user" | "deadline";
  terminalReason?: string;
  runnerInstanceId?: string;
  toolProgress?: ToolProgress[];
  finishedAt?: Date;
  messages: ChatCompletionMessageParam[];
  activities?: AgentActivity[];
  skillsRead?: SkillReadMetadata[];
  timeContext?: AgentTimeContext;
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
