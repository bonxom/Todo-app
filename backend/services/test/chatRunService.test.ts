vi.mock("../conversationTurnService.js", () => ({
  runConversationTurn: vi.fn(),
}));

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chatRunService } from "../chatRunService.js";
import { chatStreamRepository } from "../../repositories/chatStreamRepository.js";
import { runConversationTurn } from "../conversationTurnService.js";
import type { ChatTurn } from "../../types/IChatTurn.js";
import type { TurnSnapshot } from "../../types/IChatStream.js";
import type { McpContext } from "../../mcp/context.js";
import type { IUserDocument } from "../../types/IUser.js";
import { AppError } from "../../error/AppError.js";

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("chatRunService detached runner and cancellation", () => {
  const fakeUser = {
    _id: "507f1f77bcf86cd799439011",
    role: "USER",
    name: "Runner User",
  } as unknown as IUserDocument;

  const fakeContext: McpContext = {
    user: fakeUser,
    requestId: "runner-req-1",
  };

  const fakeTurn: ChatTurn = {
    _id: "turn-runner-1",
    conversationId: "conv-runner-1",
    userId: fakeUser._id,
    requestId: "runner-req-1",
    sequence: 1,
    userInput: "Hello runner",
    status: "processing",
    mode: "auto",
    executionToken: "token-runner-1",
    messages: [{ role: "user", content: "Hello runner" }],
    interactions: [],
    response: "",
    expiresAt: new Date(Date.now() + 330_000),
    deadlineAt: new Date(Date.now() + 300_000),
    lastEventSeq: 1,
    partialResponse: "",
    toolProgress: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.spyOn(chatStreamRepository, "finish").mockResolvedValue({
      turnId: "turn-runner-1",
      conversationId: "conv-runner-1",
      requestId: "runner-req-1",
      status: "completed",
      partialResponse: "",
      lastEventSeq: 1,
      toolProgress: [],
      deadlineAt: new Date().toISOString(),
    });
    vi.mocked(runConversationTurn).mockResolvedValue({
      turnId: "turn-runner-1",
      conversationId: "conv-runner-1",
      status: "completed",
      mode: "auto",
      response: "Mocked response",
    } as any);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await chatRunService.shutdown();
  });

  it("registers run and executes in background without awaiting caller", async () => {
    const gate = deferred<void>();
    const finishSpy = vi
      .spyOn(chatStreamRepository, "finish")
      .mockImplementation(async () => {
        gate.resolve();
        return {} as any;
      });

    vi.spyOn(chatStreamRepository, "append").mockResolvedValue({} as any);

    chatRunService.start(
      {
        ...fakeTurn,
        _id: "turn-bg-1",
      },
      fakeContext,
    );

    // Caller is not blocked; start returns void synchronously
    expect(finishSpy).not.toHaveBeenCalled();
    // Wait for background execution to complete
    await gate.promise;
    expect(finishSpy).toHaveBeenCalled();
  });

  it("cancel triggers abort controller and marks turn stopping", async () => {
    const turnId = "turn-cancel-1";
    const requestStopSpy = vi
      .spyOn(chatStreamRepository, "requestStop")
      .mockResolvedValue({
        turnId,
        conversationId: "conv-1",
        requestId: "req-1",
        status: "stopping",
        partialResponse: "",
        lastEventSeq: 2,
        toolProgress: [],
        deadlineAt: new Date().toISOString(),
      });

    vi.spyOn(chatStreamRepository, "finish").mockResolvedValue(
      {} as TurnSnapshot,
    );

    chatRunService.start(
      {
        ...fakeTurn,
        _id: turnId,
      },
      fakeContext,
    );

    const snapshot = await chatRunService.cancel(
      String(fakeUser._id),
      "conv-1",
      turnId,
    );

    expect(snapshot.status).toBe("stopping");
    expect(requestStopSpy).toHaveBeenCalledWith(
      String(fakeUser._id),
      "conv-1",
      turnId,
      "user",
    );
  });

  it("cleans up timers and registry entries on shutdown", async () => {
    chatRunService.start(
      {
        ...fakeTurn,
        _id: "turn-shutdown-1",
      },
      fakeContext,
    );

    await chatRunService.shutdown();
    // Subsequent cancel on shut-down run throws or delegates safely
    vi.spyOn(chatStreamRepository, "requestStop").mockRejectedValue(
      new AppError({ code: "AI_0016", message: "Not found", statusCode: 404 }),
    );

    await expect(
      chatRunService.cancel(String(fakeUser._id), "conv-1", "turn-shutdown-1"),
    ).rejects.toThrow();
  });
});
