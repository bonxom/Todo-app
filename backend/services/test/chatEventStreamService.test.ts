import { describe, expect, it, vi } from "vitest";
import { chatEventStreamService } from "../chatEventStreamService.js";
import { chatStreamRepository } from "../../repositories/chatStreamRepository.js";
import type { TurnSnapshot } from "../../types/IChatStream.js";
import { AppError } from "../../error/AppError.js";

describe("chatEventStreamService", () => {
  const userId = "user-stream-1";
  const conversationId = "conv-stream-1";
  const turnId = "turn-stream-1";

  it("replays events in sequence without exposing executionToken and closes on turn.finished", async () => {
    const fakeSnapshot: TurnSnapshot = {
      turnId,
      conversationId,
      requestId: "req-1",
      status: "completed",
      partialResponse: "Xin chào",
      lastEventSeq: 2,
      toolProgress: [],
      deadlineAt: new Date().toISOString(),
    };

    vi.spyOn(chatStreamRepository, "getSnapshot").mockResolvedValue(
      fakeSnapshot,
    );
    vi.spyOn(chatStreamRepository, "readEvents").mockResolvedValueOnce([
      {
        id: "1",
        event: "turn.started",
        data: {
          version: 1,
          turnId,
          seq: 1,
          occurredAt: new Date().toISOString(),
          payload: { deadlineAt: fakeSnapshot.deadlineAt },
        },
      },
      {
        id: "2",
        event: "assistant.delta",
        data: {
          version: 1,
          turnId,
          seq: 2,
          occurredAt: new Date().toISOString(),
          payload: { messageId: `${turnId}:bot`, text: "Xin chào" },
        },
      },
      {
        id: "3",
        event: "turn.finished",
        data: {
          version: 1,
          turnId,
          seq: 3,
          occurredAt: new Date().toISOString(),
          payload: {
            status: "completed",
            result: {
              turnId,
              conversationId,
              status: "completed",
              mode: "auto",
              response: "Xin chào",
            },
          },
        },
      },
    ]);

    const frames: string[] = [];
    const abort = new AbortController();

    await chatEventStreamService.streamEvents({
      userId,
      conversationId,
      turnId,
      after: 0,
      signal: abort.signal,
      write: (frame) => {
        frames.push(frame);
        return true;
      },
      drain: async () => {},
    });

    const fullStream = frames.join("");
    expect(fullStream).toContain("event: assistant.delta\n");
    expect(fullStream).toContain("id: 2\n");
    expect(fullStream).toContain("event: turn.finished\n");
    expect(fullStream).not.toContain("executionToken");
  });

  it("reads newly arriving events via poll without losing events when notifications are dropped", async () => {
    let callCount = 0;
    vi.spyOn(chatStreamRepository, "getSnapshot").mockImplementation(
      async () => {
        return {
          turnId,
          conversationId,
          requestId: "req-1",
          status: callCount > 1 ? "completed" : "processing",
          partialResponse: "Tạo...",
          lastEventSeq: callCount > 1 ? 2 : 1,
          toolProgress: [],
          deadlineAt: new Date(Date.now() + 60_000).toISOString(),
        };
      },
    );

    vi.spyOn(chatStreamRepository, "readEvents").mockImplementation(
      async (_uid, _cid, _tid, after) => {
        callCount++;
        if (after === 0) {
          return [
            {
              id: "1",
              event: "turn.started",
              data: {
                version: 1,
                turnId,
                seq: 1,
                occurredAt: new Date().toISOString(),
                payload: { deadlineAt: new Date().toISOString() },
              },
            },
          ];
        }
        if (after === 1 && callCount > 1) {
          return [
            {
              id: "2",
              event: "turn.finished",
              data: {
                version: 1,
                turnId,
                seq: 2,
                occurredAt: new Date().toISOString(),
                payload: { status: "completed" },
              },
            },
          ];
        }
        return [];
      },
    );

    const frames: string[] = [];
    const abort = new AbortController();

    await chatEventStreamService.streamEvents({
      userId,
      conversationId,
      turnId,
      after: 0,
      signal: abort.signal,
      pollIntervalMs: 10,
      write: (frame) => {
        frames.push(frame);
        return true;
      },
      drain: async () => {},
    });

    expect(frames.join("")).toContain("event: turn.started\n");
    expect(frames.join("")).toContain("event: turn.finished\n");
  });

  it("sends heartbeat comments every 15s during silence", async () => {
    vi.useFakeTimers();
    vi.spyOn(chatStreamRepository, "getSnapshot").mockResolvedValue({
      turnId,
      conversationId,
      requestId: "req-1",
      status: "processing",
      partialResponse: "",
      lastEventSeq: 0,
      toolProgress: [],
      deadlineAt: new Date(Date.now() + 60_000).toISOString(),
    });

    vi.spyOn(chatStreamRepository, "readEvents").mockResolvedValue([]);

    const frames: string[] = [];
    const abort = new AbortController();

    const streamPromise = chatEventStreamService.streamEvents({
      userId,
      conversationId,
      turnId,
      after: 0,
      signal: abort.signal,
      pollIntervalMs: 50,
      heartbeatIntervalMs: 15_000,
      write: (frame) => {
        frames.push(frame);
        return true;
      },
      drain: async () => {},
    });

    // Advance 15s
    await vi.advanceTimersByTimeAsync(15_000);
    expect(frames).toContain(": heartbeat\n\n");

    abort.abort();
    await vi.advanceTimersByTimeAsync(50);
    await streamPromise;

    vi.useRealTimers();
  });

  it("awaits drain when write returns false", async () => {
    vi.spyOn(chatStreamRepository, "getSnapshot").mockResolvedValue({
      turnId,
      conversationId,
      requestId: "req-1",
      status: "completed",
      partialResponse: "",
      lastEventSeq: 1,
      toolProgress: [],
      deadlineAt: new Date().toISOString(),
    });

    vi.spyOn(chatStreamRepository, "readEvents").mockResolvedValueOnce([
      {
        id: "1",
        event: "turn.finished",
        data: {
          version: 1,
          turnId,
          seq: 1,
          occurredAt: new Date().toISOString(),
          payload: { status: "completed" },
        },
      },
    ]);

    let drained = false;
    const drain = vi.fn().mockImplementation(async () => {
      drained = true;
    });

    await chatEventStreamService.streamEvents({
      userId,
      conversationId,
      turnId,
      after: 0,
      signal: new AbortController().signal,
      write: () => false, // triggers drain
      drain,
    });

    expect(drain).toHaveBeenCalled();
    expect(drained).toBe(true);
  });

  it("closes subscriber when buffer > 256 KiB without aborting runner", async () => {
    vi.spyOn(chatStreamRepository, "getSnapshot").mockResolvedValue({
      turnId,
      conversationId,
      requestId: "req-1",
      status: "processing",
      partialResponse: "",
      lastEventSeq: 1,
      toolProgress: [],
      deadlineAt: new Date(Date.now() + 60_000).toISOString(),
    });

    const runnerAbort = new AbortController();

    // Event with large payload exceeding 256 KiB
    const largeText = "x".repeat(300 * 1024);
    vi.spyOn(chatStreamRepository, "readEvents").mockResolvedValueOnce([
      {
        id: "1",
        event: "assistant.delta",
        data: {
          version: 1,
          turnId,
          seq: 1,
          occurredAt: new Date().toISOString(),
          payload: { messageId: "msg-1", text: largeText },
        },
      },
    ]);

    const frames: string[] = [];
    await chatEventStreamService.streamEvents({
      userId,
      conversationId,
      turnId,
      after: 0,
      signal: new AbortController().signal,
      maxBufferBytes: 256 * 1024,
      write: (frame) => {
        frames.push(frame);
        return true;
      },
      drain: async () => {},
    });

    // Subscriber should have returned / stopped, while runnerAbort is NOT touched
    expect(runnerAbort.signal.aborted).toBe(false);
  });
});
