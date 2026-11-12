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
import * as webSearchService from "../webSearchService.js";
import { WebSearchError } from "../../types/IWebSearch.js";

const context = {
  user: { _id: "507f1f77bcf86cd799439011", role: "USER" },
  requestId: "search-agent-test",
  scopes: ["tasks:write"],
} as unknown as McpContext;

describe("Agent Web Search Routing & Policy", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.unstubAllEnvs();
    process.env.WEB_SEARCH_ENABLED = "true";
    process.env.BRAVE_SEARCH_API_KEY = "test-brave-key";
    completionCreate.mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("exposes orbit_web_search tool when search is enabled", async () => {
    completionCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            role: "assistant",
            content: "Ready to search",
          },
        },
      ],
    });

    await agentService.chatWithMcp("Tìm tài liệu React", context);

    expect(completionCreate).toHaveBeenCalledTimes(1);
    const tools = completionCreate.mock.calls[0][0].tools;
    const toolNames = tools.map(
      (t: { function: { name: string } }) => t.function.name,
    );
    expect(toolNames).toContain("orbit_web_search");

    const systemMsg = completionCreate.mock.calls[0][0].messages.find(
      (m: { role: string }) => m.role === "system",
    );
    expect(systemMsg.content).toContain("Web search capability is enabled");
    expect(systemMsg.content).toContain("Cite sources using Markdown links");
    expect(systemMsg.content).toContain("If search succeeds with no results");
    expect(systemMsg.content).toContain("no matching sources were found");
    expect(systemMsg.content).toContain("If search fails");
    expect(systemMsg.content).not.toContain(
      "If search yields no results or fails",
    );
  });

  it("omits orbit_web_search tool when search is disabled", async () => {
    process.env.WEB_SEARCH_ENABLED = "false";

    completionCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            role: "assistant",
            content: "Web search is disabled",
          },
        },
      ],
    });

    await agentService.chatWithMcp("Tìm tài liệu", context);

    expect(completionCreate).toHaveBeenCalledTimes(1);
    const tools = completionCreate.mock.calls[0][0].tools;
    const toolNames = tools.map(
      (t: { function: { name: string } }) => t.function.name,
    );
    expect(toolNames).not.toContain("orbit_web_search");

    const systemMsg = completionCreate.mock.calls[0][0].messages.find(
      (m: { role: string }) => m.role === "system",
    );
    expect(systemMsg.content).toContain(
      "Web search capability is currently disabled",
    );
  });

  it("allows orbit_web_search in proposal mode", async () => {
    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "true");

    const searchSpy = vi
      .spyOn(webSearchService, "searchWeb")
      .mockResolvedValueOnce({
        query: "React course",
        searchedAt: "2026-11-12T00:00:00.000Z",
        results: [
          {
            title: "React Guide",
            url: "https://react.dev/learn",
            snippet: "Getting started guide",
          },
        ],
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
                  id: "call-search",
                  type: "function",
                  function: {
                    name: "orbit_web_search",
                    arguments: JSON.stringify({ query: "React course" }),
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
                  id: "call-prop",
                  type: "function",
                  function: {
                    name: "propose_tasks",
                    arguments: JSON.stringify({
                      items: [
                        {
                          title: "Study React",
                          priority: "Medium",
                        },
                      ],
                    }),
                  },
                },
              ],
            },
          },
        ],
      });

    const result = await agentService.chatWithMcp(
      "Lập kế hoạch học React từ web",
      context,
      {
        intent: "task_proposal",
      },
    );

    expect(searchSpy).toHaveBeenCalledTimes(1);
    expect(typeof result).toBe("object");
    expect(result).toHaveProperty("proposalItems");
  });

  it("handles search failure gracefully without crashing the turn", async () => {
    vi.spyOn(webSearchService, "searchWeb").mockRejectedValueOnce(
      new WebSearchError(
        "WEB_SEARCH_UNAVAILABLE",
        "Provider unreachable",
        true,
      ),
    );

    completionCreate
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call-search-fail",
                  type: "function",
                  function: {
                    name: "orbit_web_search",
                    arguments: JSON.stringify({ query: "failing query" }),
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
              content:
                "Không thể tra cứu web lúc này do dịch vụ tìm kiếm tạm thời gián đoạn.",
            },
          },
        ],
      });

    const result = await agentService.chatWithMcp("Tìm tin tức", context);
    expect(result).toContain("Không thể tra cứu web");
  });
});
