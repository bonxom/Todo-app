import { categoryService } from "../categoryService.js";
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

it("emits failed tool progress for an MCP error result", async () => {
  vi.spyOn(categoryService, "getAll").mockRejectedValue(
    new Error("database offline"),
  );
  async function* calls() {
    yield streamChunk({
      tool_calls: [
        {
          index: 0,
          id: "error-call",
          type: "function",
          function: { name: "orbit_list_categories", arguments: "{}" },
        },
      ],
    });
    yield streamChunk({}, "tool_calls");
  }
  async function* done() {
    yield streamChunk({ content: "Không lấy được dữ liệu" }, "stop");
  }
  createMock.mockResolvedValueOnce(calls()).mockResolvedValueOnce(done());
  const events: unknown[] = [];
  try {
    await agentService.chatWithMcp(
      "List categories",
      {
        user: {
          _id: "507f1f77bcf86cd799439011",
          role: "USER",
        } as unknown as IUserDocument,
        requestId: "tool-error",
      },
      {
        stream: {
          signal: new AbortController().signal,
          emit: async (event) => {
            events.push(event);
          },
        },
      },
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "tool.finished",
        payload: expect.objectContaining({
          toolCallId: "error-call",
          status: "failed",
        }),
      }),
    );
  } finally {
    vi.restoreAllMocks();
    createMock.mockReset();
  }
});

it("finishes progress for internal skill tools instead of leaving a spinner", async () => {
  async function* calls() {
    yield streamChunk({
      tool_calls: [
        {
          index: 0,
          id: "skill-list-call",
          type: "function",
          function: { name: "list_skills", arguments: "{}" },
        },
      ],
    });
    yield streamChunk({}, "tool_calls");
  }
  async function* done() {
    yield streamChunk({ content: "Done" }, "stop");
  }
  createMock.mockResolvedValueOnce(calls()).mockResolvedValueOnce(done());
  const events: unknown[] = [];
  try {
    await agentService.chatWithMcp(
      "List my skills",
      {
        user: {
          _id: "507f1f77bcf86cd799439011",
          role: "USER",
        } as unknown as IUserDocument,
        requestId: "skill-progress",
      },
      {
        stream: {
          signal: new AbortController().signal,
          emit: async (event) => {
            events.push(event);
          },
        },
      },
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "tool.finished",
        payload: expect.objectContaining({
          toolCallId: "skill-list-call",
          status: "succeeded",
        }),
      }),
    );
  } finally {
    vi.restoreAllMocks();
    createMock.mockReset();
  }
});

it("streams reasoning.delta blocks with toolName on tool events and caps excessive reasoning safely", async () => {
  async function* round1() {
    yield streamChunk({ reasoning_content: "First, inspect skills. " });
    yield streamChunk({
      tool_calls: [
        {
          index: 0,
          id: "call-think-1",
          type: "function",
          function: { name: "list_skills", arguments: "{}" },
        },
      ],
    });
    yield streamChunk({}, "tool_calls");
  }
  async function* round2() {
    yield streamChunk({ reasoning_content: "x".repeat(40_000) });
    yield streamChunk({ content: "All done!" }, "stop");
  }
  createMock.mockResolvedValueOnce(round1()).mockResolvedValueOnce(round2());

  const events: Array<{ type: string; payload: Record<string, unknown> }> = [];
  try {
    const answer = await agentService.chatWithMcp(
      "Help me",
      {
        user: {
          _id: "507f1f77bcf86cd799439011",
          role: "USER",
        } as unknown as IUserDocument,
        requestId: "req-reasoning",
      },
      {
        turnId: "turn-reasoning",
        stream: {
          signal: new AbortController().signal,
          emit: async (event) => {
            events.push(
              event as { type: string; payload: Record<string, unknown> },
            );
          },
        },
      },
    );

    expect(answer).toBe("All done!");
    const reasoningEvents = events.filter((e) => e.type === "reasoning.delta");
    expect(reasoningEvents.length).toBeGreaterThanOrEqual(2);
    expect(reasoningEvents[0].payload).toEqual({
      blockId: "turn-reasoning:r0",
      text: "First, inspect skills. ",
    });
    const totalReasoningChars = reasoningEvents.reduce(
      (sum, e) => sum + String(e.payload.text ?? "").length,
      0,
    );
    expect(totalReasoningChars).toBeLessThanOrEqual(32_000);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "tool.started",
        payload: expect.objectContaining({
          toolCallId: "call-think-1",
          toolName: "list_skills",
        }),
      }),
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "tool.finished",
        payload: expect.objectContaining({
          toolCallId: "call-think-1",
          toolName: "list_skills",
          status: "succeeded",
        }),
      }),
    );
  } finally {
    vi.restoreAllMocks();
    createMock.mockReset();
  }
});
