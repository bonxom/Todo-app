import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";

const completionCreate = vi.hoisted(() => vi.fn());

vi.mock("../../libs/aiClient.js", () => ({
  getAiClient: () => ({
    chat: { completions: { create: completionCreate } },
  }),
}));

vi.mock("../../config/env.js", () => ({
  getAiModel: () => "test-model",
}));

import { agentService } from "../agentService.js";
import { categoryService } from "../categoryService.js";
import { personalSkillService } from "../personalSkillService.js";
import type { McpContext } from "../../mcp/context.js";

const fixturePath = resolve(
  process.cwd(),
  "../frontend/src/test/fixtures/ui-composition-spec.json",
);
const fixture = JSON.parse(readFileSync(fixturePath, "utf-8"));

const context = {
  user: { _id: "507f1f77bcf86cd799439011", role: "USER" },
  requestId: "ui-runtime-test",
} as unknown as McpContext;

const call = (id: string, name: string, args: unknown = {}) => ({
  id,
  type: "function" as const,
  function: { name, arguments: JSON.stringify(args) },
});

const response = (...calls: unknown[]) => ({
  choices: [
    { message: { role: "assistant", content: null, tool_calls: calls } },
  ],
});

const toolNames = (payload: { tools: { function: { name: string } }[] }) =>
  payload.tools.map((t) => t.function.name);

const toolResults = (messages: ChatCompletionMessageParam[]) =>
  messages
    .filter((m) => m.role === "tool")
    .map((m) => JSON.parse(m.content as string));

describe("agentUiRuntime", () => {
  it("rejects a leaked proposal on round six before checkpointing it", async () => {
    const readCategories = vi
      .spyOn(categoryService, "getAll")
      .mockResolvedValue([]);
    const checkpoints: ChatCompletionMessageParam[][] = [];
    for (let i = 0; i < 5; i++) {
      completionCreate.mockResolvedValueOnce(
        response(call(`read-${i}`, "orbit_list_categories")),
      );
    }
    completionCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            role: "assistant",
            content:
              '<｜｜DSML｜｜calls><｜｜DSML｜｜invoke name="propose_tasks"><｜｜DSML｜｜parameter name="items" string="false">[{"title":"Work"}]</｜｜DSML｜｜parameter></｜｜DSML｜｜invoke></｜｜DSML｜｜calls>',
          },
        },
      ],
    });

    await expect(
      agentService.chatWithMcp("Plan next week", context, {
        checkpoint: async (messages) => {
          checkpoints.push(structuredClone(messages));
        },
      }),
    ).rejects.toMatchObject({ code: "AI_0005" });
    expect(completionCreate).toHaveBeenCalledTimes(6);
    expect(completionCreate.mock.calls[5][0].tool_choice).toBe("none");
    expect(readCategories).toHaveBeenCalledTimes(5);
    expect(JSON.stringify(checkpoints)).not.toContain("DSML");
    expect(JSON.stringify(checkpoints)).not.toContain('"name":"propose_tasks"');
  });

  beforeEach(() => {
    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "true");
    vi.stubEnv("A2UI_COMPOSITION_ENABLED", "true");
    vi.spyOn(personalSkillService, "getEnabledSnapshot").mockResolvedValue([]);
  });

  afterEach(() => {
    completionCreate.mockReset();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("executes load guidance -> read data -> present_ui and checkpoints terminal result", async () => {
    const readCategories = vi
      .spyOn(categoryService, "getAll")
      .mockResolvedValue([]);
    let checkpointedMessages: ChatCompletionMessageParam[] = [];

    completionCreate
      .mockImplementationOnce(async (payload) => {
        expect(toolNames(payload)).toContain("load_skill");
        expect(toolNames(payload)).not.toContain("present_ui");
        const messagesText = JSON.stringify(payload.messages);
        expect(messagesText).not.toContain("Orbit UI Composition Guidance");
        expect(messagesText).not.toContain('"skillId":"ui-composition"');
        return response(
          call("load-1", "load_skill", { skillId: "ui-composition" }),
          call("read-1", "orbit_list_categories", {}),
        );
      })
      .mockImplementationOnce(async (payload) => {
        expect(toolNames(payload)).toContain("present_ui");
        return response(call("ui-1", "present_ui", fixture.readonly));
      });

    const result = await agentService.chatWithMcp("Show study plan", context, {
      checkpoint: async (messages) => {
        checkpointedMessages = structuredClone(messages);
      },
    });

    expect(readCategories).toHaveBeenCalledOnce();
    expect(result).toEqual({ surfaceSpec: fixture.readonly });
    expect(toolResults(checkpointedMessages).at(-1)).toMatchObject({
      status: "presented",
      componentCount: fixture.readonly.components.length,
    });
  });
  it("does not preload full UI guidance or synthetic UI loader exchanges on initial request or greeting", async () => {
    completionCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            role: "assistant",
            content: "Xin chào! Mình có thể giúp gì cho bạn?",
          },
        },
      ],
    });

    const result = await agentService.chatWithMcp("Hôm nay ngày mấy?", context);
    expect(result).toBe("Xin chào! Mình có thể giúp gì cho bạn?");

    const firstPayload = completionCreate.mock.calls[0][0];
    expect(toolNames(firstPayload)).not.toContain("present_ui");
    const payloadStr = JSON.stringify(firstPayload.messages);
    expect(payloadStr).not.toContain("Orbit UI Composition Guidance");
    expect(payloadStr).not.toContain('"skillId":"ui-composition"');
  });

  it("heals leaked DSML present_ui call from content and presents valid surface", async () => {
    completionCreate
      .mockImplementationOnce(async () => {
        return response(
          call("load-1", "load_skill", { skillId: "ui-composition" }),
        );
      })
      .mockImplementationOnce(async () => {
        const dsmlContent = `< | DSML | calls>
< | DSML | invoke name="present_ui">
< | DSML | parameter name="fallback_text" string="true">${fixture.readonly.fallbackText}</ | DSML | parameter>
< | DSML | parameter name="components" string="false">${JSON.stringify(fixture.readonly.components)}</ | DSML | parameter>
< | DSML | parameter name="displayData" string="false">${JSON.stringify(fixture.readonly.displayData)}</ | DSML | parameter>
</ | DSML | invoke>
</ | DSML | calls>`;
        return {
          choices: [
            {
              message: {
                role: "assistant",
                content: dsmlContent,
              },
            },
          ],
        };
      });

    const result = await agentService.chatWithMcp("Tình hình tập gym", context);
    expect(result).toEqual({ surfaceSpec: fixture.readonly });
  });

  it("heals leaked DSML business tool call and continues agent loop to final response", async () => {
    const readCategories = vi
      .spyOn(categoryService, "getAll")
      .mockResolvedValue([]);

    completionCreate
      .mockImplementationOnce(async () => {
        const dsmlContent = `< | DSML | | calls>
< | DSML | | invoke name="orbit_list_categories">
</ | DSML | | invoke>
</ | DSML | | calls>`;
        return {
          choices: [
            {
              message: {
                role: "assistant",
                content: dsmlContent,
              },
            },
          ],
        };
      })
      .mockImplementationOnce(async () => {
        return {
          choices: [
            {
              message: {
                role: "assistant",
                content: "Danh sách danh mục của bạn trống.",
              },
            },
          ],
        };
      });

    const result = await agentService.chatWithMcp(
      "Liệt kê categories",
      context,
    );
    expect(readCategories).toHaveBeenCalledOnce();
    expect(result).toBe("Danh sách danh mục của bạn trống.");
  });

  it("executes load guidance -> propose_tasks with presentation", async () => {
    const validItems = [
      { title: "Study Vocabulary", priority: "High" as const },
    ];

    completionCreate
      .mockImplementationOnce(async (payload) => {
        const proposeTool = payload.tools.find(
          (t: { function: { name: string } }) =>
            t.function.name === "propose_tasks",
        );
        expect(proposeTool.function.parameters.properties).not.toHaveProperty(
          "presentation",
        );
        return response(
          call("load-1", "load_skill", { skillId: "ui-composition" }),
        );
      })
      .mockImplementationOnce(async (payload) => {
        const proposeTool = payload.tools.find(
          (t: { function: { name: string } }) =>
            t.function.name === "propose_tasks",
        );
        expect(proposeTool.function.parameters.properties).toHaveProperty(
          "presentation",
        );
        return response(
          call("prop-1", "propose_tasks", {
            items: validItems,
            presentation: fixture.proposal,
          }),
        );
      });

    const result = await agentService.chatWithMcp("Propose tasks", context);
    expect(result).toEqual({
      proposalItems: validItems,
      text: fixture.proposal.fallbackText,
      presentation: fixture.proposal,
    });
  });

  it("drops forged or invalid optional presentation without discarding valid task items", async () => {
    const validItems = [
      { title: "Read chapter 1", priority: "Medium" as const },
    ];

    // Forged presentation without loading ui-composition first
    completionCreate.mockResolvedValueOnce(
      response(
        call("forged-prop", "propose_tasks", {
          items: validItems,
          presentation: fixture.proposal,
        }),
      ),
    );

    const result = await agentService.chatWithMcp("Propose tasks", context);
    expect(result).toMatchObject({ proposalItems: validItems });
    expect(result).not.toHaveProperty("presentation");

    // Loaded guidance, but malformed presentation -> still keeps validItems
    completionCreate.mockReset();
    completionCreate
      .mockResolvedValueOnce(
        response(call("load-1", "load_skill", { skillId: "ui-composition" })),
      )
      .mockResolvedValueOnce(
        response(
          call("bad-pres-prop", "propose_tasks", {
            items: validItems,
            presentation: {
              fallbackText: "Bad",
              components: [
                { id: "root", component: "Card", children: ["missing"] },
              ],
              displayData: {},
            },
          }),
        ),
      );

    const result2 = await agentService.chatWithMcp("Propose tasks", context);
    expect(result2).toMatchObject({ proposalItems: validItems });
    expect(result2).not.toHaveProperty("presentation");
  });

  it("returns structured INVALID_UI_SPEC feedback on malformed present_ui and allows correction", async () => {
    completionCreate
      .mockResolvedValueOnce(
        response(call("load-1", "load_skill", { skillId: "ui-composition" })),
      )
      .mockResolvedValueOnce(
        response(
          call("bad-ui", "present_ui", {
            fallbackText: "Broken",
            components: [
              { id: "root", component: "Card", children: ["nonexistent"] },
            ],
            displayData: {},
          }),
        ),
      )
      .mockImplementationOnce(async (payload) => {
        const lastToolResult = toolResults(payload.messages).at(-1);
        expect(lastToolResult).toMatchObject({
          isError: true,
          code: "INVALID_UI_SPEC",
          executed: false,
        });
        expect(lastToolResult.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: "components.0.children.0",
            }),
          ]),
        );
        return response(call("fixed-ui", "present_ui", fixture.readonly));
      });

    const result = await agentService.chatWithMcp("Show table", context);
    expect(result).toEqual({ surfaceSpec: fixture.readonly });
  });

  it("returns useful text fallback on budget exhaustion without claiming UI rendered", async () => {
    completionCreate.mockResolvedValueOnce(
      response(call("load-1", "load_skill", { skillId: "ui-composition" })),
    );
    for (let i = 0; i < 4; i++) {
      completionCreate.mockResolvedValueOnce(
        response(
          call(`bad-ui-${i}`, "present_ui", {
            fallbackText: "Broken",
            components: [{ id: "root", component: "Card", children: ["root"] }],
            displayData: {},
          }),
        ),
      );
    }
    completionCreate.mockImplementationOnce(async (payload) => {
      expect(payload.tool_choice).toBe("none");
      return {
        choices: [
          {
            message: {
              role: "assistant",
              content:
                "Here is your study schedule in plain text:\n- Monday: Reading (2h)",
            },
          },
        ],
      };
    });

    const result = await agentService.chatWithMcp("Show schedule", context);
    expect(result).toBe(
      "Here is your study schedule in plain text:\n- Monday: Reading (2h)",
    );
  });

  it("rejects unauthorized write attempts inside UI properties and blocks present_ui before guidance is loaded", async () => {
    completionCreate
      .mockResolvedValueOnce(
        response(call("early-ui", "present_ui", fixture.readonly)),
      )
      .mockImplementationOnce(async (payload) => {
        expect(toolResults(payload.messages).at(-1)).toMatchObject({
          isError: true,
          code: "SKILL_REQUIRED",
          executed: false,
        });
        return response(
          call("load-1", "load_skill", { skillId: "ui-composition" }),
        );
      })
      .mockResolvedValueOnce(
        response(
          call("write-ui", "present_ui", {
            fallbackText: "Attempt write",
            components: [{ id: "root", component: "TaskProposalForm" }],
            displayData: {},
          }),
        ),
      )
      .mockImplementationOnce(async (payload) => {
        expect(toolResults(payload.messages).at(-1)).toMatchObject({
          isError: true,
          code: "INVALID_UI_SPEC",
          executed: false,
        });
        return {
          choices: [
            { message: { role: "assistant", content: "Plain text answer." } },
          ],
        };
      });

    const result = await agentService.chatWithMcp("Attempt UI", context);
    expect(result).toBe("Plain text answer.");
  });

  it("preserves companion assistant text emitted before or alongside present_ui", async () => {
    completionCreate
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: "Để mình tổng hợp lịch học cho bạn nhé.",
              tool_calls: [
                call("load-1", "load_skill", { skillId: "ui-composition" }),
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
              content: "Dưới đây là bảng lịch chi tiết:",
              tool_calls: [call("ui-1", "present_ui", fixture.readonly)],
            },
          },
        ],
      });

    const result = await agentService.chatWithMcp("Show study plan", context);
    expect(result).toEqual({
      surfaceSpec: fixture.readonly,
      companionText:
        "Để mình tổng hợp lịch học cho bạn nhé.\n\nDưới đây là bảng lịch chi tiết:",
    });
  });

  it("preserves companion assistant text emitted alongside propose_tasks", async () => {
    completionCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            role: "assistant",
            content: "Mình gợi ý chia thành 2 buổi tập chính:",
            tool_calls: [
              call("prop-1", "propose_tasks", {
                items: [{ title: "Upper body" }],
              }),
            ],
          },
        },
      ],
    });

    const result = await agentService.chatWithMcp("Plan gym", context);
    expect(result).toEqual({
      proposalItems: [{ title: "Upper body" }],
      companionText: "Mình gợi ý chia thành 2 buổi tập chính:",
    });
  });

  it("keeps the read-only answer supplied with a tool-only A2UI response", async () => {
    const companionText = "Reading takes most of your study time this week.";
    completionCreate
      .mockResolvedValueOnce(
        response(call("load-1", "load_skill", { skillId: "ui-composition" })),
      )
      .mockResolvedValueOnce(
        response(
          call("ui-1", "present_ui", { ...fixture.readonly, companionText }),
        ),
      )
      .mockResolvedValueOnce({
        choices: [
          { message: { role: "assistant", content: "Plain fallback" } },
        ],
      });

    const result = await agentService.chatWithMcp(
      "Summarize my study week",
      context,
    );
    expect(result).toEqual({ surfaceSpec: fixture.readonly, companionText });
    const tool = completionCreate.mock.calls[1][0].tools.find(
      (tool: { function: { name: string } }) =>
        tool.function.name === "present_ui",
    );
    expect(tool.function.parameters.required).toContain("companionText");
  });

  it("keeps the reason for a tool-only proposal even without a composed surface", async () => {
    const companionText =
      "I started with a short reading exercise to fit your 15-minute window.";
    completionCreate.mockResolvedValueOnce(
      response(
        call("prop-1", "propose_tasks", {
          companionText,
          items: [{ title: "Practice reading for 15 minutes" }],
        }),
      ),
    );

    const result = await agentService.chatWithMcp(
      "Suggest something I can do in 15 minutes",
      context,
    );
    expect(result).toEqual({
      proposalItems: [{ title: "Practice reading for 15 minutes" }],
      companionText,
    });
    const tool = completionCreate.mock.calls[0][0].tools.find(
      (tool: { function: { name: string } }) =>
        tool.function.name === "propose_tasks",
    );
    expect(tool.function.parameters.required).toContain("companionText");
  });
});
