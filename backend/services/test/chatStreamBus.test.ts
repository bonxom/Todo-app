import { describe, expect, it, vi } from "vitest";
import { chatStreamBus } from "../chatStreamBus.js";

describe("chatStreamBus", () => {
  it("wakes up immediately when an event is published for the turn", async () => {
    const turnId = "turn-bus-1";
    const start = Date.now();

    const waitPromise = chatStreamBus.waitForNext(turnId, 1000);

    setTimeout(() => {
      chatStreamBus.publish(turnId, {
        id: "1",
        event: "assistant.delta",
        data: {
          version: 1,
          turnId,
          seq: 1,
          occurredAt: new Date().toISOString(),
          payload: { text: "hello" },
        },
      });
    }, 20);

    const result = await waitPromise;
    const elapsed = Date.now() - start;

    expect(result).toBe(true);
    expect(elapsed).toBeLessThan(200);
  });

  it("times out if no event is published within timeoutMs", async () => {
    const turnId = "turn-bus-timeout";
    const start = Date.now();

    const result = await chatStreamBus.waitForNext(turnId, 50);
    const elapsed = Date.now() - start;

    expect(result).toBe(false);
    expect(elapsed).toBeGreaterThanOrEqual(45);
  });

  it("aborts promptly when AbortSignal triggers", async () => {
    const turnId = "turn-bus-abort";
    const controller = new AbortController();

    const waitPromise = chatStreamBus.waitForNext(turnId, 2000, controller.signal);

    setTimeout(() => {
      controller.abort();
    }, 20);

    const result = await waitPromise;
    expect(result).toBe(false);
  });

  it("handles live turn lifecycle with scheduleCleanup and turn.finished", () => {
    const turnId = "turn-bus-lifecycle";
    chatStreamBus.initLiveTurn({
      _id: turnId,
      userId: "user-123",
      conversationId: "conv-123",
      lastEventSeq: 0,
    });

    expect(chatStreamBus.hasLiveTurn(turnId)).toBe(true);

    chatStreamBus.emitLiveEvent(turnId, {
      type: "assistant.delta",
      payload: { messageId: "m1", text: "Xin chào" },
    });

    const snapshot = chatStreamBus.getLiveSnapshot(turnId);
    expect(snapshot?.partialResponse).toBe("Xin chào");
    expect(snapshot?.lastEventSeq).toBe(1);

    // Emit turn.finished
    chatStreamBus.emitLiveEvent(turnId, {
      type: "turn.finished",
      payload: {
        status: "completed",
        result: {
          turnId,
          conversationId: "conv-123",
          status: "completed",
          data: "Xin chào",
          response: "Xin chào",
        },
      },
    });

    const finishedSnapshot = chatStreamBus.getLiveSnapshot(turnId);
    expect(finishedSnapshot?.status).toBe("completed");
    expect(finishedSnapshot?.lastEventSeq).toBe(2);

    // Schedule cleanup
    chatStreamBus.scheduleCleanup(turnId, 10);
    expect(chatStreamBus.hasLiveTurn(turnId)).toBe(true);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(chatStreamBus.hasLiveTurn(turnId)).toBe(false);
        resolve();
      }, 30);
    });
  });
});
