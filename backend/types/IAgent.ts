import type { AgentBudget } from "../utils/agentBudget.js";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import type { ProposalIntent } from "./A2UI/ITaskProposal.js";

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

export interface AgentMemory {
  budget?: AgentBudget;
  mode?: AgentMode;
  intent?: ProposalIntent;
  approvedInteraction?: AgentInteraction;
  projectContext?: { id: string; name: string } | null;
  history?: ChatCompletionMessageParam[];
  personalSnapshot?: PersonalSkillSnapshot;
  onSkillsRead?: (skills: SkillReadMetadata[]) => void;
  checkpoint?: (
    messages: ChatCompletionMessageParam[],
    activities?: AgentActivity[],
    skillsRead?: SkillReadMetadata[],
  ) => Promise<void>;
}
