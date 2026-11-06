import { describe, expect, it } from "vitest";
import { validateAgentResponse } from "../../utils/agentProviderResponse.js";
import { prepareAgentProviderMessages } from "../../utils/agentProviderMessages.js";

describe("reasoning provider compatibility", () => {
  it("preserves provider reasoning through validation for tool and final messages", () => {
    for (const extra of [
      { content: "Answer" },
      {
        content: null,
        tool_calls: [
          {
            id: "call-one",
            type: "function",
            function: { name: "list_skills", arguments: "{}" },
          },
        ],
      },
    ]) {
      const message = validateAgentResponse(
        {
          role: "assistant",
          reasoning_content: "opaque provider state",
          ...extra,
        },
        false,
        new Set(),
      );
      expect(message).toHaveProperty(
        "reasoning_content",
        "opaque provider state",
      );
    }
  });
  it("fills synthetic and legacy DeepSeek messages without changing existing reasoning or stored history", () => {
    const history = [
      {
        role: "assistant" as const,
        content: null,
        tool_calls: [
          {
            id: "synthetic",
            type: "function" as const,
            function: { name: "list_skills", arguments: "{}" },
          },
        ],
      },
      { role: "assistant" as const, content: "old reply" },
      {
        role: "assistant" as const,
        content: "reply",
        reasoning_content: "original",
      },
    ];
    const payload = prepareAgentProviderMessages(
      history,
      "https://api.deepseek.com/v1",
    );
    expect(
      payload.map(
        (m) => (m as { reasoning_content?: string }).reasoning_content,
      ),
    ).toEqual(["", "", "original"]);
    expect(history[0]).not.toHaveProperty("reasoning_content");
    expect(
      prepareAgentProviderMessages(history, "https://api.openai.com/v1")[0],
    ).not.toHaveProperty("reasoning_content");
  });
});
