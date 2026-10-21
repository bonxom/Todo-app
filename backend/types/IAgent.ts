import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";

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

export interface AgentMemory {
  mode?: AgentMode;
  approvedInteraction?: AgentInteraction;
  history?: ChatCompletionMessageParam[];
  checkpoint?: (messages: ChatCompletionMessageParam[]) => Promise<void>;
}
