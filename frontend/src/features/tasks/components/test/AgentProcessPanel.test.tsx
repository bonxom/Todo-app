import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "@/shared/i18n";
import AgentProcessPanel from "../chat/AgentProcessPanel";

describe("AgentProcessPanel", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders tool steps in English without Vietnamese leakage or duplicate wording when toolName is provided", async () => {
    await i18n.changeLanguage("en");
    const user = userEvent.setup();
    render(
      <AgentProcessPanel
        toolProgress={[
          {
            toolCallId: "tc-1",
            toolName: "orbit_list_tasks",
            label: "Đang tìm kiếm công việc",
            status: "succeeded",
            summary: "Đã tìm kiếm công việc",
            order: 2,
          },
          {
            toolCallId: "tc-2",
            toolName: "analyze_image",
            label: "Đang phân tích hình ảnh",
            status: "failed",
            summary: "Phân tích hình ảnh không thành công",
            order: 4,
          },
        ]}
        reasoningBlocks={[
          { blockId: "r0", text: "Let me check your tasks first.", order: 1 },
          { blockId: "r1", text: "Now inspect the attached photo.", order: 3 },
        ]}
      />,
    );

    const toggle = screen.getByTestId("agent-process-toggle");
    expect(toggle).toHaveTextContent(/Thought/i);
    expect(toggle).toHaveTextContent(/2 steps/i);

    await user.click(toggle);

    const stepsContainer = document.getElementById(
      toggle.getAttribute("aria-controls")!,
    )!;
    const text = stepsContainer.textContent ?? "";
    expect(text).not.toContain("Đang tìm kiếm");
    expect(text).not.toContain("Đã tìm kiếm");
    expect(text).toContain("Let me check your tasks first.");
    expect(text).toContain("Searched tasks");
    expect(text).not.toContain("Searching tasks");
    expect(text).toContain("Now inspect the attached photo.");
    expect(text).toContain("Failed to analyze image");

    // Chronological order: r0 -> tc-1 -> r1 -> tc-2
    expect(text.indexOf("Let me check your tasks first.")).toBeLessThan(
      text.indexOf("Searched tasks"),
    );
    expect(text.indexOf("Searched tasks")).toBeLessThan(
      text.indexOf("Now inspect the attached photo."),
    );
    expect(text.indexOf("Now inspect the attached photo.")).toBeLessThan(
      text.indexOf("Failed to analyze image"),
    );
  });

  it("renders localized Vietnamese tool labels cleanly without repeating Đang + Đã", async () => {
    await i18n.changeLanguage("vi");
    const user = userEvent.setup();
    render(
      <AgentProcessPanel
        toolProgress={[
          {
            toolCallId: "tc-1",
            toolName: "orbit_list_tasks",
            label: "Đang tìm kiếm công việc",
            status: "succeeded",
            summary: "Đã tìm kiếm công việc",
            order: 1,
          },
        ]}
      />,
    );

    await user.click(screen.getByTestId("agent-process-toggle"));
    const step = screen.getByTestId("tool-progress-tc-1");
    expect(step).toHaveTextContent("Đã tìm kiếm công việc");
    expect(step).not.toHaveTextContent("Đang tìm kiếm công việc");
  });

  it("streams live thinking blocks and suppresses redundant Thinking… spinner while reasoning text is visible", async () => {
    await i18n.changeLanguage("en");
    render(
      <AgentProcessPanel
        isLive
        hasResponseText={false}
        reasoningBlocks={[
          { blockId: "r0", text: "Planning the best schedule...", order: 1 },
        ]}
        toolProgress={[
          {
            toolCallId: "tc-1",
            toolName: "analyze_image",
            status: "started",
            order: 2,
          },
        ]}
      />,
    );

    expect(screen.getByTestId("reasoning-block-r0")).toHaveTextContent(
      "Planning the best schedule...",
    );
    expect(screen.getByTestId("tool-progress-tc-1")).toHaveTextContent(
      "Analyzing image",
    );
    expect(
      screen.queryByTestId("agent-process-thinking-step"),
    ).not.toBeInTheDocument();
  });

  it("renders thinking-only completed toggle when there are reasoning blocks but no tool calls", async () => {
    await i18n.changeLanguage("en");
    const user = userEvent.setup();
    render(
      <AgentProcessPanel
        reasoningBlocks={[
          { blockId: "r0", text: "Direct reasoning without tools.", order: 1 },
        ]}
      />,
    );

    const toggle = screen.getByTestId("agent-process-toggle");
    expect(toggle).toHaveTextContent("Thought");
    await user.click(toggle);
    expect(screen.getByTestId("reasoning-block-r0")).toHaveTextContent(
      "Direct reasoning without tools.",
    );
  });

  it("preserves legacy label and summary rendering when toolName is absent", async () => {
    await i18n.changeLanguage("en");
    const user = userEvent.setup();
    render(
      <AgentProcessPanel
        toolProgress={[
          {
            toolCallId: "legacy-1",
            label: "Searching tasks",
            status: "succeeded",
            summary: "Found 5 tasks",
          },
        ]}
      />,
    );

    await user.click(screen.getByTestId("agent-process-toggle"));
    expect(screen.getByText("Searching tasks")).toBeVisible();
    expect(screen.getByText("Found 5 tasks")).toBeVisible();
  });
});
