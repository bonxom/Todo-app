import type {
  TurnSnapshot,
  TurnStatus,
  ChatStreamEvent,
  ReasoningBlock,
  ToolProgress,
} from "@/shared/types/chatStream";
import type { ConversationMessage } from "@/shared/types/domain";

export type ConnectionState =
  "idle" | "connecting" | "live" | "reconnecting" | "offline" | "error";

export interface ChatRunState {
  snapshot: TurnSnapshot | null;
  connection: ConnectionState;
  reconnectAttempts: number;
  messages: ConversationMessage[];
}

export type ChatRunAction =
  | { type: "RESET"; snapshot?: TurnSnapshot | null }
  | { type: "SET_SNAPSHOT"; snapshot: TurnSnapshot }
  | { type: "SET_CONNECTION"; connection: ConnectionState }
  | { type: "SET_RECONNECT_ATTEMPTS"; attempts: number }
  | { type: "EVENT"; event: ChatStreamEvent };

interface ResultEnvelope {
  turnId?: string;
  response?: string;
  data?: string;
  companionText?: string;
  interaction?: ConversationMessage["interaction"];
  proposal?: ConversationMessage["proposal"];
  surface?: ConversationMessage["surface"];
  actionBindings?: ConversationMessage["actionBindings"];
  uiActionOutcomes?: ConversationMessage["uiActionOutcomes"];
}

interface EventPayload {
  text?: string;
  blockId?: string;
  toolCallId?: string;
  toolName?: string;
  label?: string;
  status?: TurnStatus | ToolProgress["status"];
  summary?: string;
  terminalReason?: string;
  result?: TurnSnapshot["result"];
}

export function projectMessage(
  snapshot: TurnSnapshot | null,
): ConversationMessage[] {
  if (!snapshot) return [];
  const res = snapshot.result as ResultEnvelope | undefined;
  const terminal = !["processing", "stopping"].includes(snapshot.status);
  const text = terminal
    ? (res?.data ?? res?.response ?? snapshot.partialResponse ?? "")
    : snapshot.partialResponse || "";
  const streamedCompanion =
    terminal && (res?.surface || res?.proposal)
      ? snapshot.partialResponse?.trim() || undefined
      : undefined;
  const companionText =
    res?.companionText?.trim() ||
    (streamedCompanion && streamedCompanion !== text.trim()
      ? streamedCompanion
      : undefined);

  const botMessage: ConversationMessage = {
    id: `${snapshot.turnId}:bot`,
    turnId: res?.turnId ?? snapshot.turnId,
    sender: "bot",
    ...(["failed", "cancelled", "timed_out", "interrupted"].includes(
      snapshot.status,
    )
      ? { turnStatus: snapshot.status as ConversationMessage["turnStatus"] }
      : {}),
    ...(snapshot.toolProgress?.length
      ? { toolProgress: snapshot.toolProgress }
      : {}),
    ...(snapshot.reasoningBlocks?.length
      ? { reasoningBlocks: snapshot.reasoningBlocks }
      : {}),
    text,
    ...(companionText ? { companionText } : {}),
    timestamp: snapshot.deadlineAt || new Date().toISOString(),
    ...(res?.interaction ? { interaction: res.interaction } : {}),
    ...(res?.proposal ? { proposal: res.proposal } : {}),
    ...(res?.surface ? { surface: res.surface } : {}),
    ...(res?.actionBindings ? { actionBindings: res.actionBindings } : {}),
    ...(res?.uiActionOutcomes
      ? { uiActionOutcomes: res.uiActionOutcomes }
      : {}),
  };
  return [botMessage];
}

export function createInitialChatRunState(
  snapshot: TurnSnapshot | null,
): ChatRunState {
  return {
    snapshot,
    connection:
      snapshot && ["processing", "stopping"].includes(snapshot.status)
        ? "connecting"
        : "idle",
    reconnectAttempts: 0,
    messages: projectMessage(snapshot),
  };
}

export function reduceChatRun(
  state: ChatRunState,
  action: ChatRunAction,
): ChatRunState {
  switch (action.type) {
    case "RESET": {
      return createInitialChatRunState(action.snapshot ?? null);
    }
    case "SET_SNAPSHOT": {
      return {
        ...state,
        snapshot: action.snapshot,
        messages: projectMessage(action.snapshot),
      };
    }
    case "SET_CONNECTION": {
      return {
        ...state,
        connection: action.connection,
      };
    }
    case "SET_RECONNECT_ATTEMPTS": {
      return {
        ...state,
        reconnectAttempts: action.attempts,
      };
    }
    case "EVENT": {
      const { event } = action;
      if (!state.snapshot || event.data.turnId !== state.snapshot.turnId) {
        return state;
      }

      const currentSeq = state.snapshot.lastEventSeq;

      // Duplicate or old event
      if (event.data.seq <= currentSeq) {
        return state;
      }

      // Gap detected in event sequence: trigger reconnect to replay from last cursor
      // Note: If turn.finished arrives, the turn is terminal and carries the final canonical result.
      // We should accept it to complete cleanly rather than getting stuck in reconnecting.
      if (event.data.seq > currentSeq + 1 && event.event !== "turn.finished") {
        return {
          ...state,
          connection: "reconnecting",
        };
      }

      // Expected next event in strictly ascending order
      const updatedSnapshot: TurnSnapshot = {
        ...state.snapshot,
        lastEventSeq: event.data.seq,
      };

      const baseNextState: ChatRunState = {
        ...state,
        connection: event.event === "turn.finished" ? "idle" : "live",
        reconnectAttempts: 0,
      };

      const payload = event.data.payload as EventPayload | undefined;

      if (event.event === "assistant.delta") {
        const deltaText = payload?.text || "";
        const nextPartial = (updatedSnapshot.partialResponse || "") + deltaText;
        updatedSnapshot.partialResponse = nextPartial;
        return {
          ...baseNextState,
          snapshot: updatedSnapshot,
          messages: projectMessage(updatedSnapshot),
        };
      }

      if (event.event === "reasoning.delta") {
        const deltaText = payload?.text || "";
        const blockId = payload?.blockId || `${updatedSnapshot.turnId}:r0`;
        if (!deltaText) {
          return {
            ...baseNextState,
            snapshot: updatedSnapshot,
          };
        }
        const existingBlocks = updatedSnapshot.reasoningBlocks ?? [];
        const existingIndex = existingBlocks.findIndex(
          (b) => b.blockId === blockId,
        );
        let nextBlocks: ReasoningBlock[];
        if (existingIndex >= 0) {
          nextBlocks = [...existingBlocks];
          nextBlocks[existingIndex] = {
            ...nextBlocks[existingIndex],
            text: nextBlocks[existingIndex].text + deltaText,
          };
        } else {
          nextBlocks = [
            ...existingBlocks,
            { blockId, text: deltaText, order: event.data.seq },
          ];
        }
        updatedSnapshot.reasoningBlocks = nextBlocks;
        return {
          ...baseNextState,
          snapshot: updatedSnapshot,
          messages: projectMessage(updatedSnapshot),
        };
      }

      if (event.event === "tool.started") {
        const toolCallId = payload?.toolCallId;
        if (!toolCallId) {
          return {
            ...baseNextState,
            snapshot: updatedSnapshot,
          };
        }
        const label = payload?.label;
        const toolName = payload?.toolName;
        const existingIndex = updatedSnapshot.toolProgress.findIndex(
          (t) => t.toolCallId === toolCallId,
        );
        let nextToolProgress: ToolProgress[];
        if (existingIndex >= 0) {
          nextToolProgress = [...updatedSnapshot.toolProgress];
          nextToolProgress[existingIndex] = {
            ...nextToolProgress[existingIndex],
            ...(toolName ? { toolName } : {}),
            label,
            status: "started",
          };
        } else {
          nextToolProgress = [
            ...updatedSnapshot.toolProgress,
            {
              toolCallId,
              ...(toolName ? { toolName } : {}),
              label,
              status: "started",
              order: event.data.seq,
            },
          ];
        }
        updatedSnapshot.toolProgress = nextToolProgress;
        return {
          ...baseNextState,
          snapshot: updatedSnapshot,
          messages: projectMessage(updatedSnapshot),
        };
      }

      if (event.event === "tool.finished") {
        const toolCallId = payload?.toolCallId;
        const status = payload?.status;
        const summary = payload?.summary;
        const toolName = payload?.toolName;
        const nextToolProgress = updatedSnapshot.toolProgress.map((t) =>
          t.toolCallId === toolCallId
            ? {
                ...t,
                ...(toolName ? { toolName } : {}),
                status: (status as ToolProgress["status"]) || t.status,
                summary: summary || t.summary,
              }
            : t,
        );
        updatedSnapshot.toolProgress = nextToolProgress;
        return {
          ...baseNextState,
          snapshot: updatedSnapshot,
          messages: projectMessage(updatedSnapshot),
        };
      }

      if (event.event === "turn.stopping") {
        updatedSnapshot.status = "stopping";
        return {
          ...baseNextState,
          snapshot: updatedSnapshot,
        };
      }

      if (event.event === "turn.finished") {
        const terminalStatus = (payload?.status as TurnStatus) || "completed";
        updatedSnapshot.status = terminalStatus;
        updatedSnapshot.terminalReason = payload?.terminalReason;
        if (payload?.result) {
          updatedSnapshot.result = payload.result;
        }
        return {
          ...baseNextState,
          snapshot: updatedSnapshot,
          connection: "idle",
          messages: projectMessage(updatedSnapshot),
        };
      }

      return {
        ...baseNextState,
        snapshot: updatedSnapshot,
      };
    }
    default:
      return state;
  }
}
