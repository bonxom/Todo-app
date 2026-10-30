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
import { categoryService } from "../categoryService.js";
import type { McpContext } from "../../mcp/context.js";
import { agentService } from "../agentService.js";

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
      agentService.chatWithMcp("List categories", context),
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
import { completeMenuMessages } from "../../utils/agentMessages.js";
import { grillUserSchema } from "../../validations/agentValidation.js";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";

const askContext = {
  user: { _id: "507f1f77bcf86cd799439011", role: "USER" },
  scopes: ["tasks:write"],
  requestId: "ask-test",
} as unknown as McpContext;
const call = (id: string, name: string, args: unknown) => ({
  id,
  type: "function",
  function: { name, arguments: JSON.stringify(args) },
});
const response = (...calls: unknown[]) => ({
  choices: [
    { message: { role: "assistant", content: null, tool_calls: calls } },
  ],
});
const done = { choices: [{ message: { role: "assistant", content: "Done" } }] };
const createArgs = {
  title: "Test",
  categoryId: "507f1f77bcf86cd799439012",
  idempotencyKey: "1234567890abcdef",
};

describe("Ask runner", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    completionCreate.mockReset();
  });
  it("completes a menu tool call and starts the choice as a new user message", async () => {
    const read = vi.spyOn(categoryService, "getAll").mockResolvedValue([]);
    completionCreate
      .mockResolvedValueOnce(
        response(
          call("read1", "orbit_list_categories", {}),
          call("ask1", "grill_user", {
            question: "Which?",
            options: [
              { id: "a", label: "A" },
              { id: "b", label: "B" },
            ],
          }),
          call("read2", "orbit_list_categories", {}),
        ),
      )
      .mockResolvedValueOnce(done);
    let saved: ChatCompletionMessageParam[] = [];
    const first = await agentService.chatWithMcp("Help", askContext, {
      mode: "ask",
      checkpoint: async (m) => {
        saved = structuredClone(m);
      },
    });
    expect(typeof first).toBe("object");
    expect(read).toHaveBeenCalledTimes(1);
    expect(completionCreate).toHaveBeenCalledTimes(1);
    const results = saved.filter((message) => message.role === "tool");
    expect(results).toHaveLength(3);
    expect(
      results.find((message) => message.tool_call_id === "ask1")?.content,
    ).toContain("question_displayed");
    expect(
      results.find((message) => message.tool_call_id === "read2")?.content,
    ).toContain("skipped");
    expect(
      await agentService.chatWithMcp("A", askContext, {
        mode: "ask",
        history: saved,
      }),
    ).toBe("Done");
    expect(read).toHaveBeenCalledTimes(1);
    expect(completionCreate.mock.calls[1][0].messages).toEqual(
      expect.arrayContaining([{ role: "user", content: "A" }]),
    );
  });
  it("accepts a plan with more than eight tool calls and lets the model summarize", async () => {
    const write = vi.spyOn(taskWriteService, "create").mockResolvedValue({ task: {} } as never);
    completionCreate
      .mockResolvedValueOnce(response(...Array.from({ length: 10 }, (_, i) => call(`plan-${i}`, "orbit_create_task", { ...createArgs, title: `Task ${i}`, idempotencyKey: `unique-key-${i}-123456` }))))
      .mockResolvedValueOnce(done);
    expect(await agentService.chatWithMcp("Create a ten-task plan", askContext, { mode: "ask" })).toBe("Done");
    expect(write).toHaveBeenCalledTimes(10);
  });
  it("recovers from the malformed menu JSON seen in saved turns without replaying successful tools", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const write = vi.spyOn(taskWriteService, "create").mockResolvedValue({ task: {} } as never);
    const menu = { question: "Which direction?", options: [{ id: "a", label: "A" }, { id: "b", label: "B" }] };
    const invalid = call("broken-menu", "grill_user", menu);
    invalid.function.arguments += "]}";
    completionCreate
      .mockResolvedValueOnce(response(call("write-once", "orbit_create_task", createArgs), invalid));
    completionCreate.mockImplementationOnce(async ({ messages }) => {
      const result = messages.find((m: { role: string; tool_call_id?: string }) => m.role === "tool" && m.tool_call_id === "broken-menu");
      expect(JSON.parse(result.content)).toMatchObject({ code: "INVALID_TOOL_ARGUMENTS", executed: false });
      return response(call("fixed-menu", "grill_user", menu));
    });
    const result = await agentService.chatWithMcp("Help", askContext, { mode: "ask" });
    expect(result).toMatchObject({ interaction: { question: menu.question } });
    expect(write).toHaveBeenCalledOnce();
  });
  it("executes requested writes in Ask and returns the model response without a forced menu", async () => {
    const write = vi.spyOn(taskWriteService, "create").mockResolvedValue({ task: {} } as never);
    completionCreate
      .mockResolvedValueOnce(response(call("write", "orbit_create_task", createArgs)))
      .mockResolvedValueOnce(done);
    expect(await agentService.chatWithMcp("Create", askContext, { mode: "ask" })).toBe("Done");
    expect(write).toHaveBeenCalledOnce();
    expect(write.mock.calls[0][0]).toEqual(createArgs);
  });
  it("lets the model summarize after the final tool round instead of interrupting it", async () => {
    const write = vi.spyOn(taskWriteService, "create").mockResolvedValue({ task: {} } as never);
    vi.spyOn(categoryService, "getAll").mockResolvedValue([]);
    for (let i = 0; i < 4; i++) completionCreate.mockResolvedValueOnce(response(call(`read-${i}`, "orbit_list_categories", {})));
    completionCreate.mockResolvedValueOnce(response(call("last-write", "orbit_create_task", createArgs))).mockResolvedValueOnce(done);
    expect(await agentService.chatWithMcp("Create", askContext, { mode: "ask" })).toBe("Done");
    expect(write).toHaveBeenCalledOnce();
    expect(completionCreate.mock.calls[5][0].tool_choice).toBe("none");
    expect(completionCreate.mock.calls[5][0].messages.at(-1).role).toBe("tool");
  });
  it("closes remaining calls after displaying a menu and rejects duplicate option IDs", () => {
    const messages = [
      {
        role: "assistant",
        tool_calls: [
          call("a", "orbit_list_categories", {}),
          call("b", "orbit_list_categories", {}),
        ],
      },
      { role: "tool", tool_call_id: "a", content: "ok" },
    ] as ChatCompletionMessageParam[];
    const menu = {
      id: "menu",
      kind: "clarification" as const,
      status: "pending" as const,
      toolCallId: "b",
      question: "Choose",
      options: [],
      allowCustomAnswer: false,
    };
    expect(completeMenuMessages(messages, menu)).toHaveLength(4);
    expect(completeMenuMessages(messages, menu)[2]).toMatchObject({
      tool_call_id: "b",
    });
    expect(
      grillUserSchema.safeParse({
        question: "Choose",
        options: [
          { id: "a", label: "A" },
          { id: "a", label: "B" },
        ],
      }).success,
    ).toBe(false);
  });
});

import { writeRepository } from "../../mcp/repositories/writeRepository.js";
import { taskService } from "../taskService.js";

it("rechecks approval inside the write transaction and prevents mutation when stale", async () => {
  let inside = false;
  const tx = vi
    .spyOn(writeRepository, "transaction")
    .mockImplementation(async (_user, run) => {
      inside = true;
      try {
        return await run();
      } finally {
        inside = false;
      }
    });
  vi.spyOn(writeRepository, "findReceipt").mockResolvedValue(null);
  const create = vi.spyOn(taskService, "create");
  const beforeWrite = vi.fn(async () => {
    expect(inside).toBe(true);
    throw new Error("Stale approval");
  });
  try {
    await expect(
      taskWriteService.create(createArgs, { ...askContext, beforeWrite }),
    ).rejects.toThrow("Stale approval");
    expect(tx).toHaveBeenCalledOnce();
    expect(beforeWrite).toHaveBeenCalledOnce();
    expect(create).not.toHaveBeenCalled();
  } finally {
    vi.restoreAllMocks();
  }
});
