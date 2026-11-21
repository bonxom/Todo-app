import type { AgentActivity } from "./IAgentActivity.js";
import type { AgentInteraction, AgentMode } from "./IAgent.js";
import type { SkillReadMetadata } from "./IChatTurn.js";
import type { StoredUiSurface } from "./A2UI/IUiSurface.js";

export type TerminalStatus =
  "completed" | "failed" | "cancelled" | "timed_out" | "interrupted";

export type RunStatus =
  "processing" | "stopping" | "awaiting_user" | TerminalStatus;

export interface ToolProgress {
  toolCallId: string;
  toolName?: string;
  label: string;
  status: "started" | "succeeded" | "failed" | "unknown";
  summary?: string;
  order?: number;
}

export interface ReasoningBlock {
  blockId: string;
  text: string;
  order?: number;
}

export interface PublicChatResult {
  turnId?: string;
  conversationId: string;
  requestId?: string;
  status: TerminalStatus;
  mode?: AgentMode;
  data?: string;
  response?: string;
  companionText?: string;
  interactions?: AgentInteraction[];
  interaction?: unknown;
  activities?: AgentActivity[];
  skillsRead?: SkillReadMetadata[];
  uiSurface?: StoredUiSurface | null;
  surface?: unknown;
  proposal?: unknown;
  proposalId?: string;
  terminalReason?: string;
}

export type ChatEventInput =
  | {
      type: "turn.started";
      payload: { deadlineAt: string };
    }
  | {
      type: "assistant.delta";
      payload: { messageId: string; text: string };
    }
  | {
      type: "reasoning.delta";
      payload: { blockId: string; text: string };
    }
  | {
      type: "tool.started";
      payload: { toolCallId: string; toolName?: string; label: string };
    }
  | {
      type: "tool.finished";
      payload: {
        toolCallId: string;
        toolName?: string;
        status: "succeeded" | "failed" | "unknown";
        summary?: string;
      };
    }
  | {
      type: "activity.recorded";
      payload: { activity: AgentActivity };
    }
  | {
      type: "turn.stopping";
      payload: { reason: "user" | "deadline" };
    }
  | {
      type: "turn.finished";
      payload: {
        status: TerminalStatus;
        terminalReason?: string;
        result: PublicChatResult;
      };
    };

export interface ChatStreamEventData<T = unknown> {
  version: 1;
  turnId: string;
  seq: number;
  occurredAt: string;
  payload: T;
}

export interface ChatStreamEvent<T = unknown> {
  id: string;
  event: string;
  data: ChatStreamEventData<T>;
}

export interface TurnOutcome {
  status: TerminalStatus;
  terminalReason?: string;
  result: PublicChatResult;
  interaction?: AgentInteraction;
  uiSurface?: StoredUiSurface | null;
  proposalId?: string;
}

export interface TurnSnapshot {
  turnId: string;
  conversationId: string;
  requestId: string;
  status: RunStatus;
  partialResponse: string;
  lastEventSeq: number;
  toolProgress: ToolProgress[];
  reasoningBlocks?: ReasoningBlock[];
  deadlineAt: string;
  terminalReason?: string;
  result?: PublicChatResult;
}
