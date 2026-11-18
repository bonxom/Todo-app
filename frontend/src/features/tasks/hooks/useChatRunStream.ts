import { useCallback, useContext, useEffect, useReducer, useRef } from "react";
import { QueryClientContext } from "@tanstack/react-query";
import { chatStreamService } from "@/shared/services/chatStreamService";
import type { TurnSnapshot } from "@/shared/types/chatStream";
import type { ConversationMessage } from "@/shared/types/domain";
import {
  reduceChatRun,
  createInitialChatRunState,
  type ConnectionState,
  type ChatRunAction,
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
  const apply = useCallback((action: ChatRunAction) => {
    stateRef.current = reduceChatRun(stateRef.current, action);
    dispatch(action);
  }, []);
  const subscriptionRef = useRef<
    (generation: number, target?: TurnSnapshot) => void
  >(() => {});

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
    apply({ type: "RESET", snapshot });
    stateRef.current = createInitialChatRunState(snapshot);
  }, [conversationId, currentTurnId, snapshot, apply]);

  const scheduleReconnect = useCallback(
    (currentGeneration: number) => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        apply({ type: "SET_CONNECTION", connection: "offline" });
        return;
      }

      const nextAttempts = stateRef.current.reconnectAttempts + 1;
      apply({ type: "SET_RECONNECT_ATTEMPTS", attempts: nextAttempts });

      if (nextAttempts > 10) {
        apply({ type: "SET_CONNECTION", connection: "error" });
        return;
      }

      apply({ type: "SET_CONNECTION", connection: "reconnecting" });

      // Backoff delays: 1s, 2s, 4s, 8s, max 10s with jitter +- 20%
      const base = Math.min(10_000, 1_000 * Math.pow(2, nextAttempts - 1));
      const jitter = base * 0.2 * (Math.random() * 2 - 1);
      const delay = Math.max(500, Math.round(base + jitter));

      reconnectTimer.current = setTimeout(() => {
        if (generation.current === currentGeneration) {
          subscriptionRef.current(currentGeneration);
        }
      }, delay);
    },
    [apply],
  );

  const startSubscription = useCallback(
    (currentGeneration: number, targetSnapshot?: TurnSnapshot) => {
      const activeSnapshot = targetSnapshot ?? stateRef.current.snapshot;
      if (
        !conversationId ||
        !activeSnapshot ||
        TERMINAL_STATUSES.has(activeSnapshot.status)
      ) {
        apply({ type: "SET_CONNECTION", connection: "idle" });
        return;
      }

      if (activeAbort.current) {
        activeAbort.current.abort();
      }

      const abortController = new AbortController();
      activeAbort.current = abortController;

      apply({ type: "SET_CONNECTION", connection: "connecting" });

      void (async () => {
        try {
          await chatStreamService.subscribeTurn({
            conversationId,
            turnId: activeSnapshot.turnId,
            after: activeSnapshot.lastEventSeq ?? 0,
            signal: abortController.signal,
            onEvent: (event) => {
              if (generation.current !== currentGeneration) {
                return;
              }
              if (abortController.signal.aborted) return;
              const current = stateRef.current.snapshot;
              if (!current || event.data.turnId !== current.turnId) return;
              if (event.data.seq > current.lastEventSeq + 1) {
                abortController.abort();
                scheduleReconnect(currentGeneration);
                return;
              }
              if (event.data.seq <= current.lastEventSeq) return;
              apply({ type: "EVENT", event });
              apply({ type: "SET_RECONNECT_ATTEMPTS", attempts: 0 });
              apply({
                type: "SET_CONNECTION",
                connection: event.event === "turn.finished" ? "idle" : "live",
              });

              if (event.event === "turn.finished") {
                if (queryClient) {
                  void invalidateWorkspaceQueries(queryClient);
                }
                if (onSnapshotChange && stateRef.current.snapshot) {
                  onSnapshotChange(stateRef.current.snapshot);
                }
                abortController.abort();
              } else if (event.event === "activity.recorded") {
                if (queryClient) {
                  void invalidateWorkspaceQueries(queryClient);
                }
              }
            },
          });

          if (
            abortController.signal.aborted ||
            generation.current !== currentGeneration
          )
            return;

          // Subscription finished cleanly; check if snapshot is now terminal
          if (
            stateRef.current.snapshot &&
            TERMINAL_STATUSES.has(stateRef.current.snapshot.status)
          ) {
            apply({ type: "SET_CONNECTION", connection: "idle" });
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
    [conversationId, onSnapshotChange, queryClient, scheduleReconnect, apply],
  );

  useEffect(() => {
    subscriptionRef.current = startSubscription;
  }, [startSubscription]);

  // Trigger subscription when snapshot is non-terminal
  useEffect(() => {
    const curGen = generation.current;
    if (snapshot && !TERMINAL_STATUSES.has(snapshot.status)) {
      startSubscription(curGen, snapshot);
    }

    return () => {
      generation.current = curGen + 1;
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
        apply({ type: "SET_RECONNECT_ATTEMPTS", attempts: 0 });
        startSubscription(generation.current);
      }
    };

    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [startSubscription, apply]);

  const reconnect = useCallback(async () => {
    if (!conversationId || !stateRef.current.snapshot) return;

    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }

    apply({ type: "SET_RECONNECT_ATTEMPTS", attempts: 0 });
    const currentGeneration = generation.current;
    activeAbort.current?.abort();
    const freshSnapshot = await chatStreamService.getTurn(
      conversationId,
      stateRef.current.snapshot.turnId,
    );
    if (currentGeneration !== generation.current) return;
    apply({ type: "SET_SNAPSHOT", snapshot: freshSnapshot });
    if (TERMINAL_STATUSES.has(freshSnapshot.status)) {
      apply({ type: "SET_CONNECTION", connection: "idle" });
      onSnapshotChange?.(freshSnapshot);
    } else {
      startSubscription(currentGeneration, freshSnapshot);
    }
  }, [conversationId, startSubscription, apply, onSnapshotChange]);

  const stop = useCallback(async (): Promise<TurnSnapshot | null> => {
    if (!conversationId || !stateRef.current.snapshot) return null;
    const currentGeneration = generation.current;
    const stoppedSnapshot = await chatStreamService.cancelTurn(
      conversationId,
      stateRef.current.snapshot.turnId,
    );
    if (currentGeneration !== generation.current) return null;
    if (
      stoppedSnapshot.lastEventSeq >=
      (stateRef.current.snapshot?.lastEventSeq ?? 0)
    ) {
      apply({ type: "SET_SNAPSHOT", snapshot: stoppedSnapshot });
      if (TERMINAL_STATUSES.has(stoppedSnapshot.status)) {
        activeAbort.current?.abort();
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        apply({ type: "SET_CONNECTION", connection: "idle" });
        if (queryClient) void invalidateWorkspaceQueries(queryClient);
        onSnapshotChange?.(stoppedSnapshot);
      }
    }
    return stoppedSnapshot;
  }, [conversationId, apply, queryClient, onSnapshotChange]);

  const isStreaming =
    Boolean(state.snapshot) && !TERMINAL_STATUSES.has(state.snapshot!.status);

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
