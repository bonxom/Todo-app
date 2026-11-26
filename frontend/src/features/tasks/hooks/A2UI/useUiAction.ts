import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { conversationKeys } from "@/features/agent/useInfiniteConversations";
import i18n from "@/shared/i18n";
import { ApiError, getApiErrorMessage } from "@/shared/services/apiError";
import { taskService } from "@/shared/services/taskService";
import { uiActionService } from "@/shared/services/uiActionService";
import type {
  UiActionBinding,
  UiActionInput,
  UiActionLocation,
  UiActionOutcome,
  UiActionResult,
  UiActionState,
} from "@/shared/types/A2UI/uiAction";
import type { Task } from "@/shared/types/domain";
import { generateUUID } from "@/shared/utils/id";
import { useAuthStore } from "@/stores/useAuthStore";
import { invalidateTaskDependents } from "../../api/invalidation";

const MAX_BOUNDED_TARGETS = 10;

export interface UseUiActionOptions {
  location: UiActionLocation;
  bindings: UiActionBinding[];
  outcomes?: UiActionOutcome[];
  disabled?: boolean;
  onCommitted?: (result: UiActionResult) => void;
}

function mapTaskToActionState(
  task: Task | null,
  error: unknown,
  hasConversationAttribution: boolean,
  surfaceDisabled?: boolean,
): UiActionState {
  if (error) {
    if (
      error instanceof ApiError &&
      (error.status === 403 || error.status === 404)
    ) {
      return {
        status: "unavailable",
        disabled: true,
        reason: i18n.t("agent:uiActionTargetUnavailable"),
      };
    }
    return {
      status: "unavailable",
      disabled: true,
      reason: i18n.t("agent:uiActionLoadFailed"),
    };
  }

  if (!task) {
    return {
      status: "unavailable",
      disabled: true,
      reason: i18n.t("agent:uiActionTargetUnavailable"),
    };
  }

  if (task.status === "completed") {
    return hasConversationAttribution
      ? {
          status: "succeeded",
          disabled: true,
          reason: i18n.t("agent:uiActionCompletedByAction"),
        }
      : {
          status: "unavailable",
          disabled: true,
          reason: i18n.t("agent:uiActionAlreadyCompleted"),
        };
  }

  if (task.status === "pending") {
    return {
      status: "unavailable",
      disabled: true,
      reason: i18n.t("agent:uiActionTaskNotStarted"),
    };
  }

  if (task.status === "given-up") {
    return {
      status: "unavailable",
      disabled: true,
      reason: i18n.t("agent:uiActionTaskGivenUp"),
    };
  }

  return {
    status: "ready",
    disabled: Boolean(surfaceDisabled),
  };
}

export function useUiAction({
  location,
  bindings,
  outcomes,
  disabled,
  onCommitted,
}: UseUiActionOptions) {
  const queryClient = useQueryClient();
  const sessionRevision = useAuthStore((state) => state.sessionRevision);

  const boundedBindings = useMemo(
    () => bindings.slice(0, MAX_BOUNDED_TARGETS),
    [bindings],
  );
  const bindingsKey = useMemo(
    () =>
      boundedBindings
        .map((b) => `${b.id}:${b.key}:${b.name}:${b.taskId}`)
        .join("|"),
    [boundedBindings],
  );
  const bindingsRef = useRef(boundedBindings);
  bindingsRef.current = boundedBindings;

  const outcomesRef = useRef(outcomes);
  outcomesRef.current = outcomes;

  const identity = `${sessionRevision}:${location.conversationId}:${location.turnId}:${location.surfaceId}`;
  const currentIdentity = useRef(identity);
  const active = useRef(true);

  const [states, setStates] = useState<Record<string, UiActionState>>(() =>
    Object.fromEntries(
      boundedBindings.map((b) => [b.id, { status: "loading", disabled: true }]),
    ),
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const frozenRequestsRef = useRef<Map<string, UiActionInput>>(new Map());
  const inFlightRef = useRef<Set<string>>(new Set());
  const statesRef = useRef(states);
  statesRef.current = states;

  const isCurrent = useCallback(
    () =>
      active.current &&
      currentIdentity.current === identity &&
      useAuthStore.getState().sessionRevision === sessionRevision,
    [identity, sessionRevision],
  );

  const hasAttribution = useCallback(
    (actionId: string) =>
      Boolean(
        outcomesRef.current?.some(
          (o) =>
            o.turnId === location.turnId &&
            o.surfaceId === location.surfaceId &&
            o.actionId === actionId,
        ),
      ),
    [location.turnId, location.surfaceId],
  );

  useEffect(() => {
    currentIdentity.current = identity;
    active.current = true;
    frozenRequestsRef.current.clear();
    inFlightRef.current.clear();
    setStatusMessage(null);
    setErrorMessage(null);

    const activeBindings = bindingsRef.current;
    setStates(
      Object.fromEntries(
        activeBindings.map((b) => [
          b.id,
          { status: "loading", disabled: true },
        ]),
      ),
    );

    if (activeBindings.length === 0) {
      return () => {
        active.current = false;
      };
    }

    const controller = new AbortController();
    const uniqueTaskIds = [...new Set(activeBindings.map((b) => b.taskId))];

    void Promise.all(
      uniqueTaskIds.map(async (taskId) => {
        try {
          const task = await taskService.getTaskById(taskId, {
            signal: controller.signal,
          });
          return { taskId, task, error: null as unknown };
        } catch (error) {
          return { taskId, task: null as Task | null, error };
        }
      }),
    ).then((results) => {
      if (controller.signal.aborted || !isCurrent()) return;

      const byTaskId = new Map(results.map((r) => [r.taskId, r]));
      const nextStates: Record<string, UiActionState> = {};
      for (const binding of bindingsRef.current) {
        const loaded = byTaskId.get(binding.taskId);
        nextStates[binding.id] = mapTaskToActionState(
          loaded?.task ?? null,
          loaded?.error ?? null,
          hasAttribution(binding.id),
          disabled,
        );
      }
      setStates(nextStates);
    });

    return () => {
      active.current = false;
      controller.abort();
    };
  }, [identity, bindingsKey, disabled, hasAttribution, isCurrent]);

  // Reflect newly loaded conversation outcomes onto completed targets without clearing pending requests
  useEffect(() => {
    if (!outcomes?.length) return;
    setStates((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const binding of bindingsRef.current) {
        const attributed = outcomes.some(
          (o) =>
            o.turnId === location.turnId &&
            o.surfaceId === location.surfaceId &&
            o.actionId === binding.id,
        );
        if (
          attributed &&
          next[binding.id] &&
          next[binding.id].status === "unavailable"
        ) {
          next[binding.id] = {
            status: "succeeded",
            disabled: true,
            reason: i18n.t("agent:uiActionCompletedByAction"),
          };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [outcomes, location.turnId, location.surfaceId]);

  const reloadSingleTask = useCallback(
    async (taskId: string) => {
      try {
        const task = await taskService.getTaskById(taskId);
        if (!isCurrent()) return;
        setStates((prev) => {
          const next = { ...prev };
          for (const binding of bindingsRef.current) {
            if (binding.taskId === taskId) {
              next[binding.id] = mapTaskToActionState(
                task,
                null,
                hasAttribution(binding.id),
                disabled,
              );
            }
          }
          return next;
        });
      } catch (error) {
        if (!isCurrent()) return;
        setStates((prev) => {
          const next = { ...prev };
          for (const binding of bindingsRef.current) {
            if (binding.taskId === taskId) {
              next[binding.id] = mapTaskToActionState(
                null,
                error,
                false,
                disabled,
              );
            }
          }
          return next;
        });
      }
    },
    [disabled, hasAttribution, isCurrent],
  );

  const execute = useCallback(
    async (actionId: string, input: UiActionInput) => {
      const binding = bindingsRef.current.find((b) => b.id === actionId);
      if (!binding || inFlightRef.current.has(actionId)) return;

      inFlightRef.current.add(actionId);
      setErrorMessage(null);
      setStatusMessage(i18n.t("agent:uiActionPending"));
      setStates((prev) => ({
        ...prev,
        [actionId]: { status: "pending", disabled: true },
      }));

      try {
        const result = await uiActionService.submit(location, input);
        if (!isCurrent()) return;

        frozenRequestsRef.current.delete(actionId);
        setStates((prev) => {
          const next: Record<string, UiActionState> = {
            ...prev,
            [actionId]: {
              status: "succeeded",
              disabled: true,
              reason: i18n.t("agent:uiActionCompletedByAction"),
            },
          };
          for (const other of bindingsRef.current) {
            if (other.id !== actionId && other.taskId === binding.taskId) {
              next[other.id] = {
                status: "unavailable",
                disabled: true,
                reason: i18n.t("agent:uiActionAlreadyCompleted"),
              };
            }
          }
          return next;
        });
        setStatusMessage(
          i18n.t("agent:uiActionCompletedTask", { title: result.task.title }),
        );
        setErrorMessage(null);

        await Promise.all([
          invalidateTaskDependents(queryClient).catch(() => undefined),
          queryClient
            .invalidateQueries({ queryKey: conversationKeys.all })
            .catch(() => undefined),
        ]);
        if (isCurrent()) {
          onCommitted?.(result);
        }
      } catch (failure) {
        if (!isCurrent()) return;

        const status = failure instanceof ApiError ? failure.status : undefined;
        setStatusMessage(null);

        if (status === 422) {
          frozenRequestsRef.current.delete(actionId);
          setErrorMessage(
            getApiErrorMessage(
              failure,
              i18n.t("agent:uiActionTargetUnavailable"),
            ),
          );
          await reloadSingleTask(binding.taskId);
          return;
        }

        if (status === 403 || status === 404) {
          frozenRequestsRef.current.delete(actionId);
          const reason = i18n.t("agent:uiActionTargetUnavailable");
          setErrorMessage(reason);
          setStates((prev) => ({
            ...prev,
            [actionId]: { status: "unavailable", disabled: true, reason },
          }));
          return;
        }

        if (status === 409) {
          frozenRequestsRef.current.delete(actionId);
          const reason = getApiErrorMessage(
            failure,
            i18n.t("agent:uiActionConflict"),
          );
          setErrorMessage(reason);
          setStates((prev) => ({
            ...prev,
            [actionId]: { status: "unavailable", disabled: true, reason },
          }));
          await reloadSingleTask(binding.taskId);
          return;
        }

        // Network, timeout, or 5xx: unknown commit outcome; freeze exact requestId for safe retry.
        const uncertainReason = i18n.t("agent:uiActionUncertain");
        setErrorMessage(uncertainReason);
        setStates((prev) => ({
          ...prev,
          [actionId]: {
            status: "uncertain",
            disabled: true,
            reason: uncertainReason,
          },
        }));
      } finally {
        inFlightRef.current.delete(actionId);
      }
    },
    [isCurrent, location, onCommitted, queryClient, reloadSingleTask],
  );

  const dispatch = useCallback(
    async (actionId: string) => {
      if (disabled) return;
      const currentState = statesRef.current[actionId];
      if (!currentState || currentState.status !== "ready") return;
      if (
        inFlightRef.current.has(actionId) ||
        frozenRequestsRef.current.has(actionId)
      ) {
        return;
      }

      const input: UiActionInput = {
        requestId: generateUUID(),
        actionId,
      };
      frozenRequestsRef.current.set(actionId, input);
      await execute(actionId, input);
    },
    [disabled, execute],
  );

  const retry = useCallback(
    async (actionId: string) => {
      if (disabled) return;
      const currentState = statesRef.current[actionId];
      if (!currentState || currentState.status !== "uncertain") return;
      if (inFlightRef.current.has(actionId)) return;

      const frozen = frozenRequestsRef.current.get(actionId);
      if (!frozen) return;
      await execute(actionId, frozen);
    },
    [disabled, execute],
  );

  return {
    states,
    statusMessage,
    errorMessage,
    dispatch,
    retry,
  };
}
