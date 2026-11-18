import type {
  TurnSnapshot,
  TurnStatus,
  ChatStreamEvent,
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
  response?: string;
  data?: string;
  interaction?: ConversationMessage["interaction"];
  proposal?: ConversationMessage["proposal"];
  surface?: ConversationMessage["surface"];
}

interface EventPayload {
  text?: string;
  toolCallId?: string;
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
  const text = snapshot.partialResponse || res?.response || res?.data || "";

  const botMessage: ConversationMessage = {
    id: `${snapshot.turnId}:bot`,
    sender: "bot",
    text,
    timestamp: snapshot.deadlineAt || new Date().toISOString(),
    ...(res?.interaction ? { interaction: res.interaction } : {}),
    ...(res?.proposal ? { proposal: res.proposal } : {}),
    ...(res?.surface ? { surface: res.surface } : {}),
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
      if (event.data.seq > currentSeq + 1) {
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

      const payload = event.data.payload as EventPayload | undefined;

      if (event.event === "assistant.delta") {
        const deltaText = payload?.text || "";
        const nextPartial = (updatedSnapshot.partialResponse || "") + deltaText;
        updatedSnapshot.partialResponse = nextPartial;
        return {
          ...state,
          snapshot: updatedSnapshot,
          messages: projectMessage(updatedSnapshot),
        };
      }

      if (event.event === "tool.started") {
        const toolCallId = payload?.toolCallId;
        if (!toolCallId) {
          return {
            ...state,
            snapshot: updatedSnapshot,
          };
        }
        const label = payload?.label;
        const existingIndex = updatedSnapshot.toolProgress.findIndex(
          (t) => t.toolCallId === toolCallId,
        );
        let nextToolProgress: ToolProgress[];
        if (existingIndex >= 0) {
          nextToolProgress = [...updatedSnapshot.toolProgress];
          nextToolProgress[existingIndex] = {
            ...nextToolProgress[existingIndex],
            label,
            status: "started",
          };
        } else {
          nextToolProgress = [
            ...updatedSnapshot.toolProgress,
            { toolCallId, label, status: "started" },
          ];
        }
        updatedSnapshot.toolProgress = nextToolProgress;
        return {
          ...state,
          snapshot: updatedSnapshot,
        };
      }

      if (event.event === "tool.finished") {
        const toolCallId = payload?.toolCallId;
        const status = payload?.status;
        const summary = payload?.summary;
        const nextToolProgress = updatedSnapshot.toolProgress.map((t) =>
          t.toolCallId === toolCallId
            ? {
                ...t,
                status:
                  (status as ToolProgress["status"]) || t.status,
                summary: summary || t.summary,
              }
            : t,
        );
        updatedSnapshot.toolProgress = nextToolProgress;
        return {
          ...state,
          snapshot: updatedSnapshot,
        };
      }

      if (event.event === "turn.stopping") {
        updatedSnapshot.status = "stopping";
        return {
          ...state,
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
          ...state,
          snapshot: updatedSnapshot,
          connection: "idle",
          messages: projectMessage(updatedSnapshot),
        };
      }

      return {
        ...state,
        snapshot: updatedSnapshot,
      };
    }
    default:
      return state;
  }
}
