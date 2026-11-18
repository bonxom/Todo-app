import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChatRunStream } from "../useChatRunStream";
import { chatStreamService } from "@/shared/services/chatStreamService";
import type { TurnSnapshot } from "@/shared/types/chatStream";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useChatRunStream hook", () => {
  const conversationId = "conv-hook-1";
  const turnId = "turn-hook-1";

  const nonTerminalSnapshot: TurnSnapshot = {
    turnId,
    conversationId,
    requestId: "req-1",
    status: "processing",
    partialResponse: "",
    lastEventSeq: 1,
    toolProgress: [],
    deadlineAt: new Date(Date.now() + 60_000).toISOString(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("subscribes to events and sets connection to live when events arrive", async () => {
    const subscribeMock = vi
      .spyOn(chatStreamService, "subscribeTurn")
      .mockImplementation(async ({ onEvent }) => {
        onEvent({
          id: "2",
          event: "assistant.delta",
          data: {
            version: 1,
            turnId,
            seq: 2,
            occurredAt: new Date().toISOString(),
            payload: { text: "Xin chào" },
          },
        });
      });

    const { result } = renderHook(
      () =>
        useChatRunStream({
          conversationId,
          snapshot: nonTerminalSnapshot,
        }),
      { wrapper },
    );

    expect(subscribeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId,
        turnId,
        after: 1,
      }),
    );

    expect(result.current.connection).toBe("live");
    expect(result.current.streamingMessage?.text).toBe("Xin chào");
  });

  it("reconnects with backoff when subscribeTurn encounters an error", async () => {
    vi.useFakeTimers();

    let attempt = 0;
    const subscribeMock = vi
      .spyOn(chatStreamService, "subscribeTurn")
      .mockImplementation(async () => {
        attempt++;
        if (attempt === 1) {
          throw new Error("Network dropped");
        }
      });

    const { result } = renderHook(
      () =>
        useChatRunStream({
          conversationId,
          snapshot: nonTerminalSnapshot,
        }),
      { wrapper },
    );

    await act(async () => {});

    // After first failure, connection goes to reconnecting
    expect(result.current.connection).toBe("reconnecting");
    expect(result.current.reconnectAttempts).toBe(1);

    // Advance backoff timer (1s + jitter max 1.2s)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(subscribeMock).toHaveBeenCalledTimes(2);
  });

  it("reconnects immediately on online event", async () => {
    vi.useFakeTimers();

    let attempt = 0;
    const subscribeMock = vi
      .spyOn(chatStreamService, "subscribeTurn")
      .mockImplementation(async () => {
        attempt++;
        if (attempt === 1) {
          throw new Error("Disconnected");
        }
      });

    renderHook(
      () =>
        useChatRunStream({
          conversationId,
          snapshot: nonTerminalSnapshot,
        }),
      { wrapper },
    );

    await act(async () => {});
    expect(subscribeMock).toHaveBeenCalledTimes(1);

    // Dispatch online event immediately
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });

    expect(subscribeMock).toHaveBeenCalledTimes(2);
  });

  it("transitions to error connection state after 10 failed reconnect attempts", async () => {
    vi.useFakeTimers();

    vi.spyOn(chatStreamService, "subscribeTurn").mockRejectedValue(
      new Error("Persistent failure"),
    );

    const { result } = renderHook(
      () =>
        useChatRunStream({
          conversationId,
          snapshot: nonTerminalSnapshot,
        }),
      { wrapper },
    );

    // Run through 10 retry delays
    for (let i = 0; i < 11; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(12_000);
      });
    }

    expect(result.current.connection).toBe("error");
    expect(result.current.reconnectAttempts).toBeGreaterThanOrEqual(10);
  });

  it("reconnect action refetches authoritative snapshot and restarts subscription", async () => {
    vi.spyOn(chatStreamService, "subscribeTurn").mockResolvedValue();
    const getTurnSpy = vi
      .spyOn(chatStreamService, "getTurn")
      .mockResolvedValue({
        ...nonTerminalSnapshot,
        lastEventSeq: 5,
        partialResponse: "Khôi phục",
      });

    const { result } = renderHook(
      () =>
        useChatRunStream({
          conversationId,
          snapshot: nonTerminalSnapshot,
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.reconnect();
    });

    expect(getTurnSpy).toHaveBeenCalledWith(conversationId, turnId);
    expect(result.current.snapshot?.lastEventSeq).toBe(5);
    expect(result.current.snapshot?.partialResponse).toBe("Khôi phục");
  });

  it("aborts active subscription when conversationId changes", async () => {
    let aborted = false;
    vi.spyOn(chatStreamService, "subscribeTurn").mockImplementation(
      async ({ signal }) => {
        signal.addEventListener("abort", () => {
          aborted = true;
        });
      },
    );

    const { rerender } = renderHook(
      ({ convId }) =>
        useChatRunStream({
          conversationId: convId,
          snapshot: nonTerminalSnapshot,
        }),
      {
        initialProps: { convId: conversationId },
        wrapper,
      },
    );

    expect(aborted).toBe(false);

    // Change conversation
    rerender({ convId: "conv-changed" });

    expect(aborted).toBe(true);
  });
});

describe("stream lifecycle regressions", () => {
  const snapshot: TurnSnapshot = {
    turnId: "regression-turn",
    conversationId: "regression-conv",
    requestId: "regression-req",
    status: "processing",
    partialResponse: "",
    lastEventSeq: 1,
    toolProgress: [],
    deadlineAt: new Date(Date.now() + 300000).toISOString(),
  };
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  it("notifies the session with the completed snapshot", async () => {
    let deliver!: Parameters<
      typeof chatStreamService.subscribeTurn
    >[0]["onEvent"];
    vi.spyOn(chatStreamService, "subscribeTurn").mockImplementation(
      async ({ onEvent, signal }) => {
        deliver = onEvent;
        await new Promise<void>((resolve) =>
          signal.addEventListener("abort", () => resolve(), { once: true }),
        );
      },
    );
    const notify = vi.fn();
    const hook = renderHook(() =>
      useChatRunStream({
        conversationId: snapshot.conversationId,
        snapshot,
        onSnapshotChange: notify,
      }),
    );
    await act(async () =>
      deliver({
        id: "2",
        event: "turn.finished",
        data: {
          version: 1,
          turnId: snapshot.turnId,
          seq: 2,
          occurredAt: new Date().toISOString(),
          payload: { status: "completed", result: { data: "done" } },
        },
      }),
    );
    expect(hook.result.current.snapshot?.status).toBe("completed");
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed", lastEventSeq: 2 }),
    );
    hook.unmount();
  });
  it("replays a missing cursor while the old connection is still open", async () => {
    vi.useFakeTimers();
    let deliver!: Parameters<
      typeof chatStreamService.subscribeTurn
    >[0]["onEvent"];
    const subscribe = vi
      .spyOn(chatStreamService, "subscribeTurn")
      .mockImplementation(async ({ onEvent, signal }) => {
        deliver = onEvent;
        await new Promise<void>((resolve) =>
          signal.addEventListener("abort", () => resolve(), { once: true }),
        );
      });
    const hook = renderHook(() =>
      useChatRunStream({ conversationId: snapshot.conversationId, snapshot }),
    );
    await act(async () =>
      deliver({
        id: "3",
        event: "assistant.delta",
        data: {
          version: 1,
          turnId: snapshot.turnId,
          seq: 3,
          occurredAt: new Date().toISOString(),
          payload: { text: "gap" },
        },
      }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(subscribe).toHaveBeenCalledTimes(2);
    expect(subscribe.mock.calls[1][0].after).toBe(1);
    hook.unmount();
  });
});

it("reconciles a terminal cancel response even when its event is subsequently a duplicate", async () => {
  const snapshot: TurnSnapshot = {
    turnId: "cancel-race",
    conversationId: "conv-race",
    requestId: "race",
    status: "processing",
    partialResponse: "",
    lastEventSeq: 1,
    toolProgress: [],
    deadlineAt: new Date().toISOString(),
  };
  vi.spyOn(chatStreamService, "subscribeTurn").mockImplementation(
    async ({ signal }) => {
      await new Promise<void>((resolve) =>
        signal.addEventListener("abort", () => resolve(), { once: true }),
      );
    },
  );
  vi.spyOn(chatStreamService, "cancelTurn").mockResolvedValue({
    ...snapshot,
    status: "completed",
    lastEventSeq: 3,
    result: { data: "Done", success: true, message: "Chat response" },
  });
  const notify = vi.fn();
  const hook = renderHook(() =>
    useChatRunStream({
      conversationId: snapshot.conversationId,
      snapshot,
      onSnapshotChange: notify,
    }),
  );
  try {
    await act(async () => {
      await hook.result.current.stop();
    });
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed", lastEventSeq: 3 }),
    );
    expect(hook.result.current.isStreaming).toBe(false);
  } finally {
    hook.unmount();
    vi.restoreAllMocks();
  }
});
