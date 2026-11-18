import type { ChatResponse } from "./domain";

export type TurnStatus =
  | "processing"
  | "stopping"
  | "completed"
  | "failed"
  | "cancelled"
  | "timed_out"
  | "interrupted";

export type ToolProgressStatus = "started" | "succeeded" | "failed" | "unknown";

export interface ToolProgress {
  toolCallId: string;
  label?: string;
  status: ToolProgressStatus;
  summary?: string;
}

export interface TurnSnapshot {
  turnId: string;
  conversationId: string;
  requestId: string;
  status: TurnStatus;
  partialResponse?: string;
  lastEventSeq: number;
  toolProgress: ToolProgress[];
  deadlineAt: string;
  terminalReason?: string;
  result?: ChatResponse;
}

export interface ChatStreamEventData {
  version: 1;
  turnId: string;
  seq: number;
  occurredAt: string;
  payload: unknown;
}

export interface ChatStreamEvent {
  id: string;
  event: string;
  data: ChatStreamEventData;
}
