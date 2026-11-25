import type { AgentBudget } from "../utils/agentBudget.js";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import type {
  ProposalIntent,
  ProposalResolution,
} from "./A2UI/ITaskProposal.js";
import type { AgentTimeContext } from "./IAgentTimeContext.js";

export type AgentMode = "auto" | "ask";
export type AgentInteraction = {
  id: string;
  kind: "clarification" | "confirmation";
  question: string;
  options: { id: string; label: string; description?: string }[];
  allowCustomAnswer: boolean;
  status: "pending" | "answered" | "cancelled";
  toolCallId: string;
  details?: { label: string; value: string }[];
  answer?: { optionId?: string; customAnswer?: string };
  answerRequestId?: string;
  answerAction?: "answer" | "cancel";
  approval?: {
    toolName: string;
    args: Record<string, unknown>;
    fingerprint: string;
    previewFingerprint: string;
  };
};

import type { AgentActivity } from "./IAgentActivity.js";
import type { SkillReadMetadata } from "./IChatTurn.js";
import type { PersonalSkillSnapshot } from "../services/agentPersonalSkillService.js";
import type { ChatEventInput } from "./IChatStream.js";

export type AgentStreamHooks = {
  signal: AbortSignal;
  emit(event: ChatEventInput): Promise<void>;
};

export interface ConfirmedProposalTask {
  taskId: string;
  title: string;
}

export interface ConfirmedProposalContext {
  proposalId: string;
  confirmedAt: string;
  createdTasks: ConfirmedProposalTask[];
}

export interface CancelledProposalContext {
  proposalId: string;
  cancelledAt?: string;
}

export interface AgentMemory {
  turnId?: string;
  conversationId?: string;
  hasConversationImages?: boolean;
  attachmentContext?: string;
  budget?: AgentBudget;
  mode?: AgentMode;
  intent?: ProposalIntent;
  approvedInteraction?: AgentInteraction;
  answeredClarification?: AgentInteraction;
  projectContext?: { id: string; name: string } | null;
  timeContext?: AgentTimeContext;
  confirmedProposals?: ConfirmedProposalContext[];
  cancelledProposals?: CancelledProposalContext[];
  proposalResolution?: ProposalResolution;
  history?: ChatCompletionMessageParam[];
  personalSnapshot?: PersonalSkillSnapshot;
  stream?: AgentStreamHooks;
  onSkillsRead?: (skills: SkillReadMetadata[]) => void;
  checkpoint?: (
    messages: ChatCompletionMessageParam[],
    activities?: AgentActivity[],
    skillsRead?: SkillReadMetadata[],
  ) => Promise<void>;
}
