vi.mock("../personalSkillService.js", () => ({
  personalSkillService: { getEnabledSnapshot: async () => [] },
}));
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { ChatCompletionChunk } from "openai/resources/chat/completions.js";
import { agentService } from "../agentService.js";
import type { McpContext } from "../../mcp/context.js";
import type { AgentMemory, AgentStreamHooks } from "../../types/IAgent.js";
import type { IUserDocument } from "../../types/IUser.js";
import { AppError } from "../../error/AppError.js";
import { AI_ERROR } from "../../error/definitions/aiErrors.js";

const createMock = vi.hoisted(() => vi.fn());

vi.mock("../../libs/aiClient.js", () => ({
  getAiClient: () => ({
    chat: {
      completions: {
        create: createMock,
      },
    },
  }),
}));

vi.mock("../../config/env.js", () => ({
  getAiModel: () => "test-stream-model",
}));

function streamChunk(
  delta: object,
  finish_reason: string | null = null,
): ChatCompletionChunk {
  return {
    id: "chunk-test",
    object: "chat.completion.chunk",
    created: Date.now(),
    model: "test-stream-model",
    choices: [
      {
        index: 0,
        delta: delta as unknown as ChatCompletionChunk.Choice.Delta,
        finish_reason:
          finish_reason as unknown as ChatCompletionChunk.Choice["finish_reason"],
        logprobs: null,
      },
    ],
  };
}

describe("agentService streaming integration", () => {
  const fakeUser = {
    _id: "507f1f77bcf86cd799439011",
    role: "USER",
    name: "Stream Test User",
  } as unknown as IUserDocument;

  const fakeContext: McpContext = {
    user: fakeUser,
    requestId: "req-stream-1",
  };

  beforeEach(() => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("MCP_ENABLED", "false");
    createMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("calls completions with stream:true and emits text delta events", async () => {
    async function* chunks() {
      yield streamChunk({ content: "Xin " });
      yield streamChunk({ content: "chào bạn!" }, "stop");
    }
    createMock.mockResolvedValueOnce(chunks());

    const emitted: unknown[] = [];
    const streamHooks: AgentStreamHooks = {
      signal: new AbortController().signal,
      emit: async (event) => {
        emitted.push(event);
      },
    };

    const memory: AgentMemory = {
      turnId: "turn-stream-1",
      stream: streamHooks,
    };

    const answer = await agentService.chatWithMcp(
      "Chào bot",
      fakeContext,
      memory,
    );

    expect(answer).toBe("Xin chào bạn!");
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ stream: true }),
      expect.anything(),
    );
    expect(emitted).toEqual([
      {
        type: "assistant.delta",
        payload: {
          messageId: "turn-stream-1:bot",
          text: "Xin ",
        },
      },
      {
        type: "assistant.delta",
        payload: {
          messageId: "turn-stream-1:bot",
          text: "chào bạn!",
        },
      },
    ]);
  });

  it("does not fallback to non-stream on stream failure", async () => {
    createMock.mockRejectedValueOnce(new Error("Stream network error"));

    const streamHooks: AgentStreamHooks = {
      signal: new AbortController().signal,
      emit: vi.fn(),
    };

    const memory: AgentMemory = {
      stream: streamHooks,
    };

    await expect(
      agentService.chatWithMcp("Xin chào", fakeContext, memory),
    ).rejects.toThrow(AppError);

    // Only 1 call attempted, no non-streaming fallback
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("throws CHAT_STREAM_UNSUPPORTED when provider rejects stream request", async () => {
    const unsupportedErr = Object.assign(
      new Error("Streaming is not supported by model"),
      {
        status: 400,
        code: "stream_not_supported",
      },
    );
    createMock.mockRejectedValueOnce(unsupportedErr);

    const streamHooks: AgentStreamHooks = {
      signal: new AbortController().signal,
      emit: vi.fn(),
    };

    const memory: AgentMemory = {
      stream: streamHooks,
    };

    const errPromise = agentService.chatWithMcp(
      "Xin chào",
      fakeContext,
      memory,
    );
    await expect(errPromise).rejects.toThrow(AppError);
    await expect(errPromise).rejects.toMatchObject({
      code: AI_ERROR.CHAT_STREAM_UNSUPPORTED.code,
      statusCode: 502,
    });
  });
});
