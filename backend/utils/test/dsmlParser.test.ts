import { describe, expect, it } from "vitest";
import { healDsmlToolCalls } from "../dsmlParser.js";
import { validateAgentResponse } from "../agentProviderResponse.js";

describe("healDsmlToolCalls", () => {
  it("heals leaked DSML tool calls matching the user screenshot payload", () => {
    const rawContent = `< | DSML | calls>
< | DSML | invoke name="present_ui">
< | DSML | parameter name="fallback_text" string="true">Từ 1/10 đến 12/11/2026: 6/12 buổi gym hoàn thành (50%).</ | DSML | parameter>
< | DSML | parameter name="components" string="false">[{"id": "root", "component": "Column", "children": ["headerCard"], "gap": "md"}]</ | DSML | parameter>
< | DSML | parameter name="displayData" string="false">{"headerText": "Bạn bắt đầu ghi buổi gym từ 19/10."}</ | DSML | parameter>
</ | DSML | invoke>
</ | DSML | calls>`;

    const result = healDsmlToolCalls({
      role: "assistant",
      content: rawContent,
    });

    expect(result.content).toBeNull();
    expect(result.tool_calls).toBeDefined();
    expect(result.tool_calls).toHaveLength(1);

    const call = result.tool_calls![0];
    expect(call.type).toBe("function");
    expect(call.function.name).toBe("present_ui");
    expect(call.id).toMatch(/^call_dsml_/);

    const args = JSON.parse(call.function.arguments);
    expect(args).toEqual({
      fallbackText: "Từ 1/10 đến 12/11/2026: 6/12 buổi gym hoàn thành (50%).",
      components: [
        {
          id: "root",
          component: "Column",
          children: ["headerCard"],
          gap: "md",
        },
      ],
      displayData: {
        headerText: "Bạn bắt đầu ghi buổi gym từ 19/10.",
      },
    });
  });

  it("handles fullwidth pipes and alternative tool_calls tag name", () => {
    const rawContent = `<｜DSML｜tool_calls>
<｜DSML｜invoke name="orbit_list_tasks">
<｜DSML｜parameter name="status" string="true">completed</｜DSML｜parameter>
<｜DSML｜parameter name="limit" string="false">10</｜DSML｜parameter>
</｜DSML｜invoke>
</｜DSML｜tool_calls>`;

    const result = healDsmlToolCalls({
      role: "assistant",
      content: rawContent,
    });

    expect(result.content).toBeNull();
    expect(result.tool_calls).toHaveLength(1);
    const call = result.tool_calls![0];
    expect(call.function.name).toBe("orbit_list_tasks");

    const args = JSON.parse(call.function.arguments);
    expect(args).toEqual({
      status: "completed",
      limit: 10,
    });
  });
  it("heals leaked DSML tool calls with double pipes (| |) from screenshot 2", () => {
    const rawContent = `< | DSML | | calls>
< | DSML | | invoke name="orbit_list_tasks">
< | DSML | | parameter name="status" string="true">pending</ | DSML | | parameter>
< | DSML | | parameter name="pageSize" string="false">50</ | DSML | | parameter>
</ | DSML | | invoke>
</ | DSML | | calls>`;

    const result = healDsmlToolCalls({
      role: "assistant",
      content: rawContent,
    });

    expect(result.content).toBeNull();
    expect(result.tool_calls).toHaveLength(1);
    const call = result.tool_calls![0];
    expect(call.function.name).toBe("orbit_list_tasks");
    expect(JSON.parse(call.function.arguments)).toEqual({
      status: "pending",
      pageSize: 50,
    });
  });

  it("normalizes display_data and fallback_text to camelCase", () => {
    const rawContent = `< | DSML | calls>
< | DSML | invoke name="present_ui">
< | DSML | parameter name="fallback_text" string="true">Sample fallback</ | DSML | parameter>
< | DSML | parameter name="display_data" string="false">{"key": "value"}</ | DSML | parameter>
</ | DSML | invoke>
</ | DSML | calls>`;

    const result = healDsmlToolCalls({
      role: "assistant",
      content: rawContent,
    });

    const args = JSON.parse(result.tool_calls![0].function.arguments);
    expect(args.fallbackText).toBe("Sample fallback");
    expect(args.displayData).toEqual({ key: "value" });
    expect(args.fallback_text).toBeUndefined();
    expect(args.display_data).toBeUndefined();
  });

  it("preserves non-DSML text before or after the tool calls", () => {
    const rawContent = `Dưới đây là kết quả thống kê của bạn:
< | DSML | calls>
< | DSML | invoke name="present_ui">
< | DSML | parameter name="fallback_text" string="true">Fallback</ | DSML | parameter>
</ | DSML | invoke>
</ | DSML | calls>
Hy vọng thông tin này hữu ích!`;

    const result = healDsmlToolCalls({
      role: "assistant",
      content: rawContent,
    });

    expect(result.content).toBe(
      "Dưới đây là kết quả thống kê của bạn:\n\nHy vọng thông tin này hữu ích!",
    );
    expect(result.tool_calls).toHaveLength(1);
  });

  it("does not modify message if tool_calls are already present", () => {
    const existingCalls = [
      {
        id: "call-1",
        type: "function" as const,
        function: { name: "present_ui", arguments: "{}" },
      },
    ];

    const result = healDsmlToolCalls({
      role: "assistant",
      content: "< | DSML | calls>...",
      tool_calls: existingCalls,
    });

    expect(result.tool_calls).toBe(existingCalls);
    expect(result.content).toBe("< | DSML | calls>...");
  });

  it("does not modify message if no DSML markup is present", () => {
    const result = healDsmlToolCalls({
      role: "assistant",
      content: "Xin chào, hôm nay bạn thế nào?",
    });

    expect(result.content).toBe("Xin chào, hôm nay bạn thế nào?");
    expect(result.tool_calls).toBeUndefined();
  });
});

describe("validateAgentResponse with DSML", () => {
  it("validates and heals DSML message into structured tool_calls", () => {
    const rawContent = `< | DSML | calls>
< | DSML | invoke name="present_ui">
< | DSML | parameter name="fallback_text" string="true">Summary</ | DSML | parameter>
< | DSML | parameter name="components" string="false">[]</ | DSML | parameter>
</ | DSML | invoke>
</ | DSML | calls>`;

    const message = validateAgentResponse(
      {
        role: "assistant",
        content: rawContent,
      },
      false,
      new Set(),
    );

    expect(message.content).toBeNull();
    expect(message.tool_calls).toHaveLength(1);
    expect(message.tool_calls![0].function.name).toBe("present_ui");
    expect(JSON.parse(message.tool_calls![0].function.arguments)).toEqual({
      fallbackText: "Summary",
      components: [],
    });
  });
});
