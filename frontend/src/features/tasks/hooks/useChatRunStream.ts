import { useCallback, useContext, useEffect, useReducer, useRef } from "react";
import { QueryClientContext } from "@tanstack/react-query";
import { chatStreamService } from "@/shared/services/chatStreamService";
import type { TurnSnapshot } from "@/shared/types/chatStream";
import type { ConversationMessage } from "@/shared/types/domain";
import {
  reduceChatRun,
  createInitialChatRunState,
  type ConnectionState,
} from "./chatStreamReducer";
import { invalidateWorkspaceQueries } from "../api/invalidation";

export interface UseChatRunStreamOptions {
  conversationId?: string;
  snapshot: TurnSnapshot | null;
  onSnapshotChange?: (snapshot: TurnSnapshot) => void;
}

export interface ChatRunStreamHookResult {
  snapshot: TurnSnapshot | null;
  connection: ConnectionState;
  reconnectAttempts: number;
  streamingMessage: ConversationMessage | null;
  messages: ConversationMessage[];
  reconnect: () => Promise<void>;
  stop: () => Promise<TurnSnapshot | null>;
  isStreaming: boolean;
}

const TERMINAL_STATUSES = new Set([
  "completed",
  "failed",
  "cancelled",
  "timed_out",
  "interrupted",
]);

export function useChatRunStream(
  options: UseChatRunStreamOptions,
): ChatRunStreamHookResult {
  const { conversationId, snapshot, onSnapshotChange } = options;
  const queryClient = useContext(QueryClientContext);

  const [state, dispatch] = useReducer(
    reduceChatRun,
    snapshot,
    createInitialChatRunState,
  );

  const generation = useRef(0);
  const activeAbort = useRef<AbortController | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const currentTurnId = snapshot?.turnId;

  const prevConvRef = useRef(conversationId);
  const prevTurnIdRef = useRef(snapshot?.turnId);

  // Sync state if initial or external snapshot turnId changes
  useEffect(() => {
    const convChanged = prevConvRef.current !== conversationId;
    const turnIdChanged = prevTurnIdRef.current !== snapshot?.turnId;
    prevConvRef.current = conversationId;
    prevTurnIdRef.current = snapshot?.turnId;

    if (!convChanged && !turnIdChanged) {
      return;
    }

    if (stateRef.current.snapshot === null && snapshot === null) {
      return;
    }

    generation.current++;
    if (activeAbort.current) {
      activeAbort.current.abort();
      activeAbort.current = null;
    }
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    dispatch({ type: "RESET", snapshot });
  }, [conversationId, currentTurnId, snapshot]);

  const scheduleReconnect = useCallback(
    (currentGeneration: number) => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        dispatch({ type: "SET_CONNECTION", connection: "offline" });
        return;
      }

      const nextAttempts = stateRef.current.reconnectAttempts + 1;
      dispatch({ type: "SET_RECONNECT_ATTEMPTS", attempts: nextAttempts });

      if (nextAttempts > 10) {
        dispatch({ type: "SET_CONNECTION", connection: "error" });
        return;
      }

      dispatch({ type: "SET_CONNECTION", connection: "reconnecting" });

      // Backoff delays: 1s, 2s, 4s, 8s, max 10s with jitter +- 20%
      const base = Math.min(10_000, 1_000 * Math.pow(2, nextAttempts - 1));
      const jitter = base * 0.2 * (Math.random() * 2 - 1);
      const delay = Math.max(500, Math.round(base + jitter));

      reconnectTimer.current = setTimeout(() => {
        if (generation.current === currentGeneration) {
          startSubscription(currentGeneration);
        }
      }, delay);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const startSubscription = useCallback(
    (currentGeneration: number) => {
      const activeSnapshot = stateRef.current.snapshot;
      if (
        !conversationId ||
        !activeSnapshot ||
        TERMINAL_STATUSES.has(activeSnapshot.status)
      ) {
        dispatch({ type: "SET_CONNECTION", connection: "idle" });
        return;
      }

      if (activeAbort.current) {
        activeAbort.current.abort();
      }

      const abortController = new AbortController();
      activeAbort.current = abortController;

      dispatch({ type: "SET_CONNECTION", connection: "connecting" });

      void (async () => {
        try {
          await chatStreamService.subscribeTurn({
            conversationId,
            turnId: activeSnapshot.turnId,
            after: stateRef.current.snapshot?.lastEventSeq ?? 0,
            signal: abortController.signal,
            onEvent: (event) => {
              if (generation.current !== currentGeneration) {
                return;
              }
              dispatch({ type: "EVENT", event });
              dispatch({ type: "SET_CONNECTION", connection: "live" });

              if (event.event === "turn.finished") {
                if (queryClient) {
                  void invalidateWorkspaceQueries(queryClient);
                }
                if (onSnapshotChange && stateRef.current.snapshot) {
                  onSnapshotChange(stateRef.current.snapshot);
                }
              } else if (event.event === "activity.recorded") {
                if (queryClient) {
                  void invalidateWorkspaceQueries(queryClient);
                }
              }
            },
          });

          if (generation.current !== currentGeneration) return;

          // Subscription finished cleanly; check if snapshot is now terminal
          if (
            stateRef.current.snapshot &&
            TERMINAL_STATUSES.has(stateRef.current.snapshot.status)
          ) {
            dispatch({ type: "SET_CONNECTION", connection: "idle" });
          } else {
            // Premature stream end before terminal event: reconnect
            scheduleReconnect(currentGeneration);
          }
        } catch {
          if (
            abortController.signal.aborted ||
            generation.current !== currentGeneration
          ) {
            return;
          }
          scheduleReconnect(currentGeneration);
        }
      })();
    },
    [conversationId, onSnapshotChange, queryClient, scheduleReconnect],
  );

  // Trigger subscription when snapshot is non-terminal
  useEffect(() => {
    const curGen = generation.current;
    if (snapshot && !TERMINAL_STATUSES.has(snapshot.status)) {
      startSubscription(curGen);
    }

    return () => {
      if (activeAbort.current) {
        activeAbort.current.abort();
        activeAbort.current = null;
      }
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };
  }, [snapshot, startSubscription]);

  // Online listener to immediately unstick offline / reconnecting states
  useEffect(() => {
    const onOnline = () => {
      if (
        stateRef.current.connection === "offline" ||
        stateRef.current.connection === "reconnecting"
      ) {
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current);
          reconnectTimer.current = null;
        }
        dispatch({ type: "SET_RECONNECT_ATTEMPTS", attempts: 0 });
        startSubscription(generation.current);
      }
    };

    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [startSubscription]);

  const reconnect = useCallback(async () => {
    if (!conversationId || !stateRef.current.snapshot) return;

    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }

    dispatch({ type: "SET_RECONNECT_ATTEMPTS", attempts: 0 });
    const freshSnapshot = await chatStreamService.getTurn(
      conversationId,
      stateRef.current.snapshot.turnId,
    );
    dispatch({ type: "SET_SNAPSHOT", snapshot: freshSnapshot });
    startSubscription(generation.current);
  }, [conversationId, startSubscription]);

  const stop = useCallback(async (): Promise<TurnSnapshot | null> => {
    if (!conversationId || !stateRef.current.snapshot) return null;
    const stoppedSnapshot = await chatStreamService.cancelTurn(
      conversationId,
      stateRef.current.snapshot.turnId,
    );
    dispatch({ type: "SET_SNAPSHOT", snapshot: stoppedSnapshot });
    return stoppedSnapshot;
  }, [conversationId]);

  const isStreaming =
    Boolean(state.snapshot) &&
    !TERMINAL_STATUSES.has(state.snapshot!.status) &&
    state.connection !== "error";

  return {
    snapshot: state.snapshot,
    connection: state.connection,
    reconnectAttempts: state.reconnectAttempts,
    streamingMessage: state.messages[0] ?? null,
    messages: state.messages,
    reconnect,
    stop,
    isStreaming,
  };
}
