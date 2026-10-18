import OpenAI from "openai";
import { afterEach, describe, expect, it, vi } from "vitest";

const completionCreate = vi.hoisted(() => vi.fn());

vi.mock("../../libs/aiClient.js", () => ({
  getAiClient: () => ({
    chat: { completions: { create: completionCreate } },
  }),
}));

vi.mock("../../config/env.js", () => ({
  getAiModel: () => "test-model",
}));

import { AI_ERROR } from "../../error/definitions/aiErrors.js";
import { categoryRepository } from "../../repositories/categoryRepository.js";
import { categoryService } from "../categoryService.js";
import type { McpContext } from "../../mcp/context.js";
import { aiService } from "../aiService.js";

describe("AI service error mapping", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    completionCreate.mockReset();
  });

  it("maps provider timeouts and preserves the cause", async () => {
    const cause = new OpenAI.APIConnectionTimeoutError();
    completionCreate.mockRejectedValue(cause);

    await expect(aiService.chatResponse("hello")).rejects.toMatchObject({
      code: AI_ERROR.PROVIDER_TIMEOUT.code,
      statusCode: 504,
      cause,
    });
  });

  it("maps other provider failures without exposing them as the client message", async () => {
    const cause = new Error("private provider response");
    completionCreate.mockRejectedValue(cause);

    await expect(aiService.chatResponse("hello")).rejects.toMatchObject({
      code: AI_ERROR.PROVIDER_ERROR.code,
      message: AI_ERROR.PROVIDER_ERROR.message,
      cause,
    });
  });

  it("maps an empty provider response", async () => {
    completionCreate.mockResolvedValue({ choices: [] });

    await expect(aiService.chatResponse("hello")).rejects.toMatchObject({
      code: AI_ERROR.EMPTY_RESPONSE.code,
      statusCode: 502,
    });
  });

  it("maps malformed generated JSON without exposing the content", async () => {
    vi.spyOn(categoryRepository, "findByUser").mockResolvedValue([]);
    completionCreate.mockResolvedValue({
      choices: [{ message: { content: "private invalid generated content" } }],
    });

    await expect(
      aiService.generateTasks("make tasks", "507f1f77bcf86cd799439011"),
    ).rejects.toMatchObject({
      code: AI_ERROR.RESPONSE_INVALID.code,
      message: AI_ERROR.RESPONSE_INVALID.message,
      statusCode: 502,
    });
  });
});

describe("in-memory MCP chat", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    completionCreate.mockReset();
  });

  it("calls real MCP tools with the request user on Vercel without HTTP", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("MCP_ENABLED", "false");
    const fetchSpy = vi.fn(() => {
      throw new Error("Unexpected HTTP request");
    });
    vi.stubGlobal("fetch", fetchSpy);
    const context = {
      user: { _id: "507f1f77bcf86cd799439011", role: "USER" },
      requestId: "chat-test",
    } as unknown as McpContext;
    const categories = vi
      .spyOn(categoryService, "getAll")
      .mockResolvedValue([]);
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
                    name: "orbit_list_categories",
                    arguments: "{}",
                  },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          { message: { role: "assistant", content: "No categories yet." } },
        ],
      });

    await expect(
      aiService.chatWithMcp("List categories", context),
    ).resolves.toBe("No categories yet.");
    expect(categories).toHaveBeenCalledWith(context.user);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(completionCreate).toHaveBeenCalledTimes(2);
    const messages = completionCreate.mock.calls[1][0].messages;
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "tool", tool_call_id: "call-1" }),
      ]),
    );
  });
});
