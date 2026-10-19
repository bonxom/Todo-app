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

import { taskWriteService } from "../../mcp/services/taskWriteService.js";
import { closePendingCalls, publicInteraction, grillUserSchema } from "../agentInteraction.js";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";

const askContext = { user: { _id: "507f1f77bcf86cd799439011", role: "USER" }, scopes: ["tasks:write"], requestId: "ask-test" } as unknown as McpContext;
const call = (id: string, name: string, args: unknown) => ({ id, type: "function", function: { name, arguments: JSON.stringify(args) } });
const response = (...calls: unknown[]) => ({ choices: [{ message: { role: "assistant", content: null, tool_calls: calls } }] });
const done = { choices: [{message: { role: "assistant", content: "Done" }}] };
const createArgs = { title: "Test", categoryId: "507f1f77bcf86cd799439012", idempotencyKey: "1234567890abcdef" };

describe("Ask runner", () => {
  afterEach(() => { vi.restoreAllMocks(); completionCreate.mockReset(); });
  it("pauses a batched clarification and resumes only unresolved calls", async () => {
    const read = vi.spyOn(categoryService, "getAll").mockResolvedValue([]);
    completionCreate.mockResolvedValueOnce(response(
      call("read1", "orbit_list_categories", {}),
      call("ask1", "grill_user", { question: "Which?", options: [{ id: "a", label: "A" }, { id: "b", label: "B" }] }),
      call("read2", "orbit_list_categories", {}),
    )).mockResolvedValueOnce(done);
    let saved: ChatCompletionMessageParam[] = [];
    const first = await aiService.chatWithMcp("Help", askContext, {mode: "ask", checkpoint: async m => { saved = structuredClone(m); }});
    expect(typeof first).toBe("object");
    expect(read).toHaveBeenCalledTimes(1);
    expect(completionCreate).toHaveBeenCalledTimes(1);
    saved.push({role: "tool", tool_call_id: "ask1", content: '{"optionId":"a"}'});
    expect(await aiService.chatWithMcp("Help", askContext, {mode: "ask", resumeMessages: saved})).toBe("Done");
    expect(read).toHaveBeenCalledTimes(2);
  });
  it("blocks writes and executes only frozen approved arguments before requesting the model", async () => {
    vi.spyOn(categoryService, "getAll").mockResolvedValue([{_id: createArgs.categoryId, name: "Uncategorized"}] as never);
    const write = vi.spyOn(taskWriteService, "create").mockResolvedValue({task: {}} as never);
    completionCreate.mockResolvedValueOnce(response(call("write1", "orbit_create_task", createArgs))).mockResolvedValueOnce(done);
    let saved: ChatCompletionMessageParam[] = [];
    const first = await aiService.chatWithMcp("Create", askContext, {mode: "ask", checkpoint: async m => { saved = structuredClone(m); }});
    if (typeof first === "string") throw new Error("Expected confirmation");
    expect(write).not.toHaveBeenCalled();
    expect(first.interaction.approval?.args).toMatchObject({priority: "Medium", dueDate: null, projectId: null});
    expect(publicInteraction(first.interaction)).not.toHaveProperty("approval");
    const approved = {...first.interaction, status: "answered" as const, answer: {optionId: "confirm"}};
    await aiService.chatWithMcp("Create", askContext, {mode: "ask", resumeMessages: saved, interactions: [approved], approvedInteraction: approved});
    expect(write).toHaveBeenCalledOnce();
    expect(write.mock.calls[0][0]).toEqual(approved.approval?.args);
  });
  it("requires a fresh confirmation if the displayed reference changes", async () => {
    const categories = vi.spyOn(categoryService, "getAll").mockResolvedValue([{_id: createArgs.categoryId, name: "Before"}] as never);
    const write = vi.spyOn(taskWriteService, "create").mockResolvedValue({task: {}} as never);
    completionCreate.mockResolvedValueOnce(response(call("write1", "orbit_create_task", createArgs)));
    let saved: ChatCompletionMessageParam[] = [];
    const first = await aiService.chatWithMcp("Create", askContext, {mode: "ask", checkpoint: async m => { saved = structuredClone(m); }});
    if (typeof first === "string") throw new Error("Expected confirmation");
    categories.mockResolvedValue([{_id: createArgs.categoryId, name: "After"}] as never);
    const approved = {...first.interaction, status: "answered" as const, answer: {optionId: "confirm"}};
    const next = await aiService.chatWithMcp("Create", askContext, {mode: "ask", resumeMessages: saved, interactions: [approved], approvedInteraction: approved});
    expect(typeof next).toBe("object");
    expect(write).not.toHaveBeenCalled();
    expect(completionCreate).toHaveBeenCalledTimes(1);
  });
  it("closes every unanswered call when cancelling and rejects duplicate menu IDs", () => {
    const messages = [{role: "assistant", tool_calls: [call("a", "orbit_list_categories", {}), call("b", "orbit_list_categories", {})]}, {role: "tool", tool_call_id: "a", content: "ok"}] as ChatCompletionMessageParam[];
    expect(closePendingCalls(messages)).toHaveLength(3);
    expect(closePendingCalls(messages)[2]).toMatchObject({tool_call_id: "b"});
    expect(grillUserSchema.safeParse({question: "Choose", options: [{id: "a", label: "A"}, {id: "a", label: "B"}]}).success).toBe(false);
  });
});

import { writeRepository } from "../../mcp/repositories/writeRepository.js";
import { taskService } from "../taskService.js";

it("rechecks approval inside the write transaction and prevents mutation when stale", async () => {
  let inside = false;
  const tx = vi.spyOn(writeRepository, "transaction").mockImplementation(async (_user, run) => {
    inside = true;
    try { return await run(); } finally { inside = false; }
  });
  vi.spyOn(writeRepository, "findReceipt").mockResolvedValue(null);
  const create = vi.spyOn(taskService, "create");
  const beforeWrite = vi.fn(async () => {
    expect(inside).toBe(true);
    throw new Error("Stale approval");
  });
  try {
    await expect(taskWriteService.create(createArgs, {...askContext, beforeWrite})).rejects.toThrow("Stale approval");
    expect(tx).toHaveBeenCalledOnce();
    expect(beforeWrite).toHaveBeenCalledOnce();
    expect(create).not.toHaveBeenCalled();
  } finally { vi.restoreAllMocks(); }
});
