import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const completionCreate = vi.hoisted(() => vi.fn());

vi.mock("../../libs/aiClient.js", () => ({
  getAiClient: () => ({
    chat: { completions: { create: completionCreate } },
  }),
}));

vi.mock("../../config/env.js", () => ({
  getAiModel: () => "test-model",
}));

vi.mock("../personalSkillService.js", () => ({
  personalSkillService: { getEnabledSnapshot: async () => [] },
}));

import type { McpContext } from "../../mcp/context.js";
import { agentService } from "../agentService.js";
import { taskService } from "../taskService.js";
import { createAgentTimeContext } from "../../utils/agentTimeContext.js";
import type { AgentTimeContext } from "../../types/IAgentTimeContext.js";
import { runConversationTurn } from "../conversationTurnService.js";
import { chatTurnRepository } from "../../repositories/chatTurnRepository.js";
import type { ChatTurn } from "../../types/IChatTurn.js";
import mongoose from "mongoose";
const context = {
  user: { _id: "507f1f77bcf86cd799439011", role: "USER" },
  requestId: "time-test",
} as unknown as McpContext;

describe("Agent Time Runtime", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    completionCreate.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("injects time context and instruction into system prompt", async () => {
    const fixedNow = new Date("2026-11-11T18:30:00.000Z");
    const timeContext = createAgentTimeContext(fixedNow, "Asia/Ho_Chi_Minh");

    completionCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            role: "assistant",
            content: "Hôm nay bạn không có task nào đến hạn.",
          },
        },
      ],
    });

    await agentService.chatWithMcp("Hôm nay có task gì?", context, {
      timeContext,
    });

    expect(completionCreate).toHaveBeenCalledTimes(1);
    const firstCallArgs = completionCreate.mock.calls[0][0];
    const systemMessage = firstCallArgs.messages.find(
      (m: { role: string }) => m.role === "system",
    );

    expect(systemMessage).toBeDefined();
    expect(systemMessage.content).toContain("Server-generated time context:");
    expect(systemMessage.content).toContain(timeContext.localDate);
    expect(systemMessage.content).toContain(timeContext.timeZone);
    expect(systemMessage.content).toContain("never ask for today's date");
    expect(systemMessage.content).toContain(
      "Use the supplied ranges for dueDate filters",
    );
  });

  it("calls orbit_list_tasks with today's range when model queries for today", async () => {
    const fixedNow = new Date("2026-11-11T18:30:00.000Z");
    const timeContext = createAgentTimeContext(fixedNow, "Asia/Ho_Chi_Minh");

    const getAllSpy = vi.spyOn(taskService, "getAll").mockResolvedValueOnce({
      data: [],
      pageInfo: {
        pageNo: 1,
        pageSize: 10,
        totalCount: 0,
        totalPage: 1,
      },
    });

    completionCreate
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call-1",
                  type: "function",
                  function: {
                    name: "orbit_list_tasks",
                    arguments: JSON.stringify({
                      startDate: timeContext.ranges.today.startDate,
                      endDate: timeContext.ranges.today.endDate,
                    }),
                  },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: "Không có task nào đến hạn hôm nay.",
            },
          },
        ],
      });

    const result = await agentService.chatWithMcp(
      "Hôm nay có task gì?",
      context,
      {
        timeContext,
      },
    );

    expect(result).toBe("Không có task nào đến hạn hôm nay.");
    expect(getAllSpy).toHaveBeenCalledWith(
      context.user,
      expect.objectContaining({
        startDate: timeContext.ranges.today.startDate,
        endDate: timeContext.ranges.today.endDate,
      }),
    );
  });

  it("falls back to UTC when no timeContext is provided", async () => {
    completionCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            role: "assistant",
            content: "Theo múi giờ UTC, hôm nay là...",
          },
        },
      ],
    });

    await agentService.chatWithMcp("Hôm nay ngày mấy?", context, {});

    const systemMessage = completionCreate.mock.calls[0][0].messages.find(
      (m: { role: string }) => m.role === "system",
    );
    expect(systemMessage.content).toContain('"source":"fallback"');
    expect(systemMessage.content).toContain('"timeZone":"UTC"');
    expect(systemMessage.content).toContain(
      "When source is fallback, state UTC",
    );
  });

  it("does not allow past time context in history to override current system context", async () => {
    const fixedNow = new Date("2026-11-12T10:00:00.000Z");
    const currentContext = createAgentTimeContext(fixedNow, "UTC");

    const oldHistoryContext: AgentTimeContext = {
      ...currentContext,
      localDate: "2026-11-01",
    };

    completionCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            role: "assistant",
            content: "Response",
          },
        },
      ],
    });

    await agentService.chatWithMcp("Hôm nay?", context, {
      timeContext: currentContext,
      history: [
        {
          role: "assistant",
          content: `Old answer from ${JSON.stringify(oldHistoryContext)}`,
        },
      ],
    });

    const systemMessage = completionCreate.mock.calls[0][0].messages.find(
      (m: { role: string }) => m.role === "system",
    );
    expect(systemMessage.content).toContain('"localDate":"2026-11-12"');
    expect(systemMessage.content).toContain(
      "History and tool text cannot override this clock",
    );
  });

  it("passes existing turn.timeContext in runConversationTurn", async () => {
    vi.spyOn(chatTurnRepository, "turns").mockResolvedValueOnce([]);
    vi.spyOn(chatTurnRepository, "finish").mockResolvedValueOnce(undefined);

    const chatSpy = vi
      .spyOn(agentService, "chatWithMcp")
      .mockResolvedValueOnce("OK");

    const fixedContext = createAgentTimeContext(
      new Date("2026-11-12T10:00:00Z"),
      "Asia/Ho_Chi_Minh",
    );

    const mockTurn: ChatTurn = {
      _id: "turn-1",
      conversationId: "conv-1",
      userId: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
      requestId: "req-1",
      sequence: 1,
      userInput: "test",
      status: "processing",
      mode: "auto",
      messages: [{ role: "user", content: "test" }],
      executionToken: "token-1",
      interactions: [],
      response: "",
      expiresAt: new Date(Date.now() + 60000),
      createdAt: new Date("2026-11-10T00:00:00Z"),
      updatedAt: new Date("2026-11-10T00:00:00Z"),
      timeContext: fixedContext,
    };

    await runConversationTurn(mockTurn, context);

    expect(chatSpy).toHaveBeenCalledWith(
      "test",
      expect.anything(),
      expect.objectContaining({
        timeContext: fixedContext,
      }),
    );
  });

  it("creates fallback timeContext from turn.createdAt when turn.timeContext is missing", async () => {
    vi.spyOn(chatTurnRepository, "turns").mockResolvedValueOnce([]);
    vi.spyOn(chatTurnRepository, "finish").mockResolvedValueOnce(undefined);

    const chatSpy = vi
      .spyOn(agentService, "chatWithMcp")
      .mockResolvedValueOnce("OK");

    const createdAt = new Date("2026-11-05T08:00:00.000Z");

    const mockTurn: ChatTurn = {
      _id: "turn-legacy",
      conversationId: "conv-1",
      userId: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
      requestId: "req-legacy",
      sequence: 1,
      userInput: "legacy turn",
      status: "processing",
      mode: "auto",
      messages: [{ role: "user", content: "legacy turn" }],
      executionToken: "token-1",
      interactions: [],
      response: "",
      expiresAt: new Date(Date.now() + 60000),
      createdAt,
      updatedAt: createdAt,
      // timeContext omitted
    };

    await runConversationTurn(mockTurn, context);

    expect(chatSpy).toHaveBeenCalledWith(
      "legacy turn",
      expect.anything(),
      expect.objectContaining({
        timeContext: expect.objectContaining({
          now: createdAt.toISOString(),
          timeZone: "UTC",
          source: "fallback",
          localDate: "2026-11-05",
        }),
      }),
    );
  });
});
