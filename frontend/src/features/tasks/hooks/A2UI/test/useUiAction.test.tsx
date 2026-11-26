import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/services/apiError";
import { taskService } from "@/shared/services/taskService";
import { uiActionService } from "@/shared/services/uiActionService";
import type { Task } from "@/shared/types/domain";
import type {
  UiActionBinding,
  UiActionOutcome,
  UiActionResult,
} from "@/shared/types/A2UI/uiAction";
import { useAuthStore } from "@/stores/useAuthStore";
import * as invalidation from "@/features/tasks/api/invalidation";
import { conversationKeys } from "@/features/agent/useInfiniteConversations";
import { useUiAction } from "../useUiAction";

describe("useUiAction", () => {
  const location = {
    conversationId: "11111111-1111-4111-8111-111111111111",
    turnId: "turn-1",
    surfaceId: "22222222-2222-4222-8222-222222222222",
  };
  const taskId = "0123456789abcdef01234567";
  const actionId = "33333333-3333-4333-8333-333333333333";
  const bindings: UiActionBinding[] = [
    { id: actionId, key: "finishTask", name: "task.complete", taskId },
  ];

  const makeRestTask = (
    status: Task["status"] = "in-progress",
    id = taskId,
  ): Task => ({
    _id: id,
    title: "Demo task",
    status,
    priority: "Medium",
    categoryId: "aaaaaaaaaaaaaaaaaaaaaaaa",
    projectId: null,
    startDate: "2026-11-26T00:00:00.000Z",
    dueDate: "2026-11-28T00:00:00.000Z",
    completedAt: status === "completed" ? "2026-11-27T01:00:00.000Z" : null,
  });

  const makeActionResult = (requestId: string): UiActionResult => ({
    requestId,
    actionId,
    outcome: "succeeded",
    task: {
      id: taskId,
      title: "Demo task",
      description: null,
      status: "completed",
      priority: "Medium",
      categoryId: "aaaaaaaaaaaaaaaaaaaaaaaa",
      projectId: null,
      startDate: null,
      dueDate: null,
      completedAt: "2026-11-27T01:00:00.000Z",
      createdAt: "2026-11-26T01:00:00.000Z",
      updatedAt: "2026-11-27T01:00:00.000Z",
    },
  });

  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    useAuthStore.setState({ sessionRevision: 1 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("deduplicates initial task reads, disables while loading, and enables in-progress targets", async () => {
    let resolveRead!: (task: Task) => void;
    const readSpy = vi.spyOn(taskService, "getTaskById").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRead = resolve;
        }),
    );

    const dupBindings: UiActionBinding[] = [
      ...bindings,
      {
        id: "44444444-4444-4444-8444-444444444444",
        key: "finishAgain",
        name: "task.complete",
        taskId,
      },
    ];

    const { result } = renderHook(
      () => useUiAction({ location, bindings: dupBindings }),
      { wrapper },
    );

    expect(result.current.states[actionId]).toMatchObject({
      status: "loading",
      disabled: true,
    });
    expect(readSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRead(makeRestTask("in-progress"));
    });

    await waitFor(() => {
      expect(result.current.states[actionId]).toMatchObject({
        status: "ready",
        disabled: false,
      });
    });
  });

  it("distinguishes conversation-attributed completion from tasks completed elsewhere", async () => {
    vi.spyOn(taskService, "getTaskById").mockResolvedValue(
      makeRestTask("completed"),
    );

    const { result: unattributed } = renderHook(
      () => useUiAction({ location, bindings, outcomes: [] }),
      { wrapper },
    );
    await waitFor(() => {
      expect(unattributed.current.states[actionId]?.status).toBe("unavailable");
    });

    const matchingOutcome: UiActionOutcome = {
      ...makeActionResult("req-old"),
      turnId: location.turnId,
      surfaceId: location.surfaceId,
      committedAt: "2026-11-27T01:00:00.000Z",
    };
    const { result: attributed } = renderHook(
      () =>
        useUiAction({
          location,
          bindings,
          outcomes: [matchingOutcome],
        }),
      { wrapper },
    );
    await waitFor(() => {
      expect(attributed.current.states[actionId]?.status).toBe("succeeded");
    });
  });

  it("prevents double clicks, invalidates task and conversation queries on success, and retries uncertain requests with exact UUID", async () => {
    vi.spyOn(taskService, "getTaskById").mockResolvedValue(
      makeRestTask("in-progress"),
    );
    const invalidateTasksSpy = vi
      .spyOn(invalidation, "invalidateTaskDependents")
      .mockResolvedValue(undefined);
    const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

    let rejectFirst!: (err: unknown) => void;
    const submitSpy = vi
      .spyOn(uiActionService, "submit")
      .mockImplementationOnce(
        () =>
          new Promise((_res, reject) => {
            rejectFirst = reject;
          }),
      )
      .mockImplementationOnce(async (_loc, input) =>
        makeActionResult(input.requestId),
      );

    const { result } = renderHook(() => useUiAction({ location, bindings }), {
      wrapper,
    });
    await waitFor(() => {
      expect(result.current.states[actionId]?.status).toBe("ready");
    });

    act(() => {
      void result.current.dispatch(actionId);
      void result.current.dispatch(actionId);
    });

    expect(submitSpy).toHaveBeenCalledTimes(1);
    const firstInput = submitSpy.mock.calls[0]![1];
    expect(Object.keys(firstInput).sort()).toEqual(["actionId", "requestId"]);
    expect(result.current.states[actionId]).toMatchObject({
      status: "pending",
      disabled: true,
    });

    await act(async () => {
      rejectFirst(new ApiError("No response", undefined, "network"));
    });

    await waitFor(() => {
      expect(result.current.states[actionId]).toMatchObject({
        status: "uncertain",
        disabled: true,
      });
    });

    await act(async () => {
      await result.current.retry(actionId);
    });

    expect(submitSpy).toHaveBeenCalledTimes(2);
    expect(submitSpy.mock.calls[1]![1]).toEqual(firstInput);
    expect(result.current.states[actionId]).toMatchObject({
      status: "succeeded",
      disabled: true,
    });
    expect(invalidateTasksSpy).toHaveBeenCalledWith(queryClient);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: conversationKeys.all,
    });
  });

  it("reloads authoritative state on 422 and prevents stale cache writes after sessionRevision change", async () => {
    const readSpy = vi
      .spyOn(taskService, "getTaskById")
      .mockResolvedValueOnce(makeRestTask("in-progress"))
      .mockResolvedValueOnce(makeRestTask("completed"));
    const invalidateTasksSpy = vi
      .spyOn(invalidation, "invalidateTaskDependents")
      .mockResolvedValue(undefined);

    vi.spyOn(uiActionService, "submit").mockRejectedValueOnce(
      new ApiError("Only in-progress tasks can be finished", 422, "http"),
    );

    const { result } = renderHook(() => useUiAction({ location, bindings }), {
      wrapper,
    });
    await waitFor(() => {
      expect(result.current.states[actionId]?.status).toBe("ready");
    });

    await act(async () => {
      await result.current.dispatch(actionId);
    });

    expect(readSpy).toHaveBeenCalledTimes(2);
    expect(result.current.states[actionId]?.status).toBe("unavailable");

    // Now test session switch while request is in-flight
    vi.spyOn(taskService, "getTaskById").mockResolvedValue(
      makeRestTask("in-progress"),
    );
    let resolveDelayed!: (res: UiActionResult) => void;
    vi.spyOn(uiActionService, "submit").mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveDelayed = resolve;
        }),
    );

    const { result: sessionHook } = renderHook(
      () => useUiAction({ location, bindings }),
      { wrapper },
    );
    await waitFor(() => {
      expect(sessionHook.current.states[actionId]?.status).toBe("ready");
    });

    act(() => {
      void sessionHook.current.dispatch(actionId);
    });

    act(() => {
      useAuthStore.setState({ sessionRevision: 2 });
    });

    await act(async () => {
      resolveDelayed(makeActionResult("req-stale"));
    });

    expect(invalidateTasksSpy).not.toHaveBeenCalled();
  });
});
