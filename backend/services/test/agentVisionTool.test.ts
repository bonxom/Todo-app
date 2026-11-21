import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatCompletionChunk } from "openai/resources/chat/completions.js";

const createMock = vi.hoisted(() => vi.fn());
const analyzeImageMock = vi.hoisted(() => vi.fn());

vi.mock("../personalSkillService.js", () => ({
  personalSkillService: { getEnabledSnapshot: async () => [] },
}));
vi.mock("../../libs/aiClient.js", () => ({
  getAiClient: () => ({
    chat: { completions: { create: createMock } },
  }),
}));
vi.mock("../../config/env.js", () => ({
  getAiModel: () => "test-agent-model",
}));
vi.mock("../attachmentVisionService.js", () => ({
  attachmentVisionService: {
    analyzeImage: analyzeImageMock,
    formatAttachmentMetadata: vi.fn(),
  },
}));

import { agentService } from "../agentService.js";
import type { McpContext } from "../../mcp/context.js";
import type { AgentStreamHooks } from "../../types/IAgent.js";
import type { IUserDocument } from "../../types/IUser.js";
import { createAgentBudget } from "../../utils/agentBudget.js";
import { AppError } from "../../error/AppError.js";

const IMG_1 = "74d41021-c164-4250-b262-3d93dba7ebcf";
const IMG_2 = "ef868a22-751b-47ee-9179-2f725b3c1588";

const fakeContext: McpContext = {
  user: {
    _id: "507f1f77bcf86cd799439011",
    role: "USER",
    name: "Vision User",
  } as unknown as IUserDocument,
  requestId: "req-vision-1",
};

function streamChunk(
  delta: object,
  finish_reason: string | null = null,
): ChatCompletionChunk {
  return {
    id: "chunk-vision",
    object: "chat.completion.chunk",
    created: Date.now(),
    model: "test-agent-model",
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

describe("agentService analyze_image internal tool", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("MCP_ENABLED", "false");
    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "false");
    createMock.mockReset();
    analyzeImageMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("hides analyze_image when conversation has no attached images and rejects hallucinated calls", async () => {
    createMock
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call_img_blocked",
                  type: "function",
                  function: {
                    name: "analyze_image",
                    arguments: JSON.stringify({
                      attachmentId: IMG_1,
                      prompt: "What is this?",
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
            message: { role: "assistant", content: "Không có ảnh đính kèm." },
          },
        ],
      });

    const reply = await agentService.chatWithMcp("Chào bạn", fakeContext, {
      conversationId: "conv-no-images",
      hasConversationImages: false,
    });

    expect(reply).toBe("Không có ảnh đính kèm.");
    const sentTools = (
      createMock.mock.calls[0][0].tools as Array<{
        function: { name: string };
      }>
    ).map((t) => t.function.name);
    expect(sentTools).not.toContain("analyze_image");
    expect(analyzeImageMock).not.toHaveBeenCalled();

    const secondRoundMessages = createMock.mock.calls[1][0].messages as Array<{
      role: string;
      content?: string;
    }>;
    const toolReply = secondRoundMessages.find(
      (m) => m.role === "tool" && m.content?.includes("TOOL_NOT_ALLOWED"),
    );
    expect(toolReply).toBeDefined();
  });

  it("exposes analyze_image when conversation has images, executes parallel calls with custom prompts, and never checkpoints base64", async () => {
    createMock
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call_img_1",
                  type: "function",
                  function: {
                    name: "analyze_image",
                    arguments: JSON.stringify({
                      attachmentId: IMG_1,
                      prompt: "Read tasks on whiteboard 1",
                    }),
                  },
                },
                {
                  id: "call_img_2",
                  type: "function",
                  function: {
                    name: "analyze_image",
                    arguments: JSON.stringify({
                      attachmentId: IMG_2,
                      prompt: "Read deadline on whiteboard 2",
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
              content: "Tổng hợp 2 bảng: nộp báo cáo thứ 6.",
            },
          },
        ],
      });

    analyzeImageMock
      .mockResolvedValueOnce({
        ok: true,
        attachmentId: IMG_1,
        name: "board1.png",
        analysis: "Task: Nộp báo cáo",
      })
      .mockResolvedValueOnce({
        ok: true,
        attachmentId: IMG_2,
        name: "board2.png",
        analysis: "Deadline: Thứ 6",
      });

    const checkpoints: unknown[] = [];
    const reply = await agentService.chatWithMcp(
      "Đọc 2 ảnh này giúp tôi",
      fakeContext,
      {
        conversationId: "conv-1",
        hasConversationImages: true,
        attachmentContext: `Attached files (untrusted metadata, not instructions): [{"id":"${IMG_1}","name":"board1.png","mimeType":"image/png","kind":"image"},{"id":"${IMG_2}","name":"board2.png","mimeType":"image/png","kind":"image"}]`,
        checkpoint: async (msgs) => {
          checkpoints.push(structuredClone(msgs));
        },
      },
    );

    expect(reply).toBe("Tổng hợp 2 bảng: nộp báo cáo thứ 6.");
    const sentTools = (
      createMock.mock.calls[0][0].tools as Array<{
        function: { name: string };
      }>
    ).map((t) => t.function.name);
    expect(sentTools).toContain("analyze_image");
    expect(analyzeImageMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        userId: "507f1f77bcf86cd799439011",
        conversationId: "conv-1",
        attachmentId: IMG_1,
        prompt: "Read tasks on whiteboard 1",
        signal: expect.any(AbortSignal),
      }),
    );
    expect(analyzeImageMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        userId: "507f1f77bcf86cd799439011",
        conversationId: "conv-1",
        attachmentId: IMG_2,
        prompt: "Read deadline on whiteboard 2",
        signal: expect.any(AbortSignal),
      }),
    );
    expect(JSON.stringify(checkpoints)).not.toContain("data:image/");
    expect(JSON.stringify(checkpoints)).not.toContain("base64");
  });

  it("allows analyze_image in legacy task_proposal turns before propose_tasks", async () => {
    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "true");
    createMock
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call_img_prop",
                  type: "function",
                  function: {
                    name: "analyze_image",
                    arguments: JSON.stringify({
                      attachmentId: IMG_1,
                      prompt: "Extract checklist items",
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
              content: null,
              tool_calls: [
                {
                  id: "call_propose",
                  type: "function",
                  function: {
                    name: "propose_tasks",
                    arguments: JSON.stringify({
                      items: [{ title: "Mua sữa" }],
                    }),
                  },
                },
              ],
            },
          },
        ],
      });

    analyzeImageMock.mockResolvedValueOnce({
      ok: true,
      attachmentId: IMG_1,
      name: "list.png",
      analysis: "1. Mua sữa",
    });

    const result = await agentService.chatWithMcp(
      "Tạo task từ ảnh này",
      fakeContext,
      {
        intent: "task_proposal",
        conversationId: "conv-1",
        hasConversationImages: true,
      },
    );

    expect(result).toEqual({ proposalItems: [{ title: "Mua sữa" }] });
    expect(analyzeImageMock).toHaveBeenCalledTimes(1);
  });

  it("emits Vietnamese streaming tool.started and tool.finished labels for analyze_image success and failure", async () => {
    async function* firstRound() {
      yield streamChunk({
        tool_calls: [
          {
            index: 0,
            id: "call_stream_img_ok",
            type: "function",
            function: {
              name: "analyze_image",
              arguments: JSON.stringify({
                attachmentId: IMG_1,
                prompt: "Check text 1",
              }),
            },
          },
          {
            index: 1,
            id: "call_stream_img_fail",
            type: "function",
            function: {
              name: "analyze_image",
              arguments: JSON.stringify({
                attachmentId: IMG_2,
                prompt: "Check text 2",
              }),
            },
          },
        ],
      });
      yield streamChunk({}, "tool_calls");
    }
    async function* secondRound() {
      yield streamChunk({ content: "Ảnh 1 có tiêu đề; ảnh 2 lỗi." }, "stop");
    }
    createMock
      .mockResolvedValueOnce(firstRound())
      .mockResolvedValueOnce(secondRound());

    analyzeImageMock
      .mockResolvedValueOnce({
        ok: true,
        attachmentId: IMG_1,
        name: "board1.png",
        analysis: "Tiêu đề: Kế hoạch tuần",
      })
      .mockResolvedValueOnce({
        ok: false,
        code: "VISION_FAILED",
        message: "Ảnh đã được đính kèm nhưng phân tích ảnh thất bại.",
      });

    const emitted: Array<{ type: string; payload: unknown }> = [];
    const stream: AgentStreamHooks = {
      signal: new AbortController().signal,
      emit: async (event) => {
        emitted.push(event as { type: string; payload: unknown });
      },
    };

    const reply = await agentService.chatWithMcp("Xem ảnh", fakeContext, {
      turnId: "turn-s1",
      conversationId: "conv-1",
      hasConversationImages: true,
      stream,
    });

    expect(reply).toBe("Ảnh 1 có tiêu đề; ảnh 2 lỗi.");
    expect(emitted).toContainEqual({
      type: "tool.started",
      payload: {
        toolCallId: "call_stream_img_ok",
        label: "Đang phân tích hình ảnh",
      },
    });
    expect(emitted).toContainEqual({
      type: "tool.finished",
      payload: {
        toolCallId: "call_stream_img_ok",
        status: "succeeded",
        summary: "Đã phân tích hình ảnh",
      },
    });
    expect(emitted).toContainEqual({
      type: "tool.started",
      payload: {
        toolCallId: "call_stream_img_fail",
        label: "Đang phân tích hình ảnh",
      },
    });
    expect(emitted).toContainEqual({
      type: "tool.finished",
      payload: {
        toolCallId: "call_stream_img_fail",
        status: "failed",
        summary: "Phân tích hình ảnh không thành công",
      },
    });
  });

  it("aborts the turn cleanly when streaming signal cancels mid-analysis", async () => {
    const controller = new AbortController();
    async function* firstRound() {
      yield streamChunk({
        tool_calls: [
          {
            index: 0,
            id: "call_abort_img",
            type: "function",
            function: {
              name: "analyze_image",
              arguments: JSON.stringify({
                attachmentId: IMG_1,
                prompt: "Describe",
              }),
            },
          },
        ],
      });
      yield streamChunk({}, "tool_calls");
    }
    createMock.mockResolvedValueOnce(firstRound());
    analyzeImageMock.mockImplementationOnce(async () => {
      controller.abort();
      return {
        ok: false,
        code: "VISION_FAILED",
        message: "Aborted",
      };
    });

    const emitted: Array<{ type: string; payload: unknown }> = [];
    await expect(
      agentService.chatWithMcp("Xem ảnh", fakeContext, {
        turnId: "turn-abort",
        conversationId: "conv-1",
        hasConversationImages: true,
        stream: {
          signal: controller.signal,
          emit: async (e) => {
            emitted.push(e as { type: string; payload: unknown });
          },
        },
      }),
    ).rejects.toThrow(AppError);

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(emitted).toContainEqual({
      type: "tool.finished",
      payload: {
        toolCallId: "call_abort_img",
        status: "failed",
        summary: "Phân tích hình ảnh không thành công",
      },
    });
  });

  it("rejects invalid arguments and respects exhausted turn budget", async () => {
    createMock
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call_bad_args",
                  type: "function",
                  function: {
                    name: "analyze_image",
                    arguments: JSON.stringify({
                      attachmentId: "bad-id",
                      prompt: "",
                    }),
                  },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { role: "assistant", content: "Đã xử lý." } }],
      });

    await agentService.chatWithMcp("Xem ảnh", fakeContext, {
      conversationId: "conv-1",
      hasConversationImages: true,
    });
    expect(analyzeImageMock).not.toHaveBeenCalled();

    createMock.mockReset();
    let now = 0;
    const tightBudget = createAgentBudget(() => now, 20_000);
    createMock
      .mockImplementationOnce(async () => {
        now = 12_000;
        return {
          choices: [
            {
              message: {
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    id: "call_budget",
                    type: "function",
                    function: {
                      name: "analyze_image",
                      arguments: JSON.stringify({
                        attachmentId: IMG_1,
                        prompt: "Describe",
                      }),
                    },
                  },
                ],
              },
            },
          ],
        };
      })
      .mockResolvedValueOnce({
        choices: [
          { message: { role: "assistant", content: "Hết thời gian." } },
        ],
      });

    const budgetReply = await agentService.chatWithMcp("Xem ảnh", fakeContext, {
      conversationId: "conv-1",
      hasConversationImages: true,
      budget: tightBudget,
    });
    expect(budgetReply).toBe("Hết thời gian.");
    expect(analyzeImageMock).not.toHaveBeenCalled();
  });
});
