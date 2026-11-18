import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChatRunStatus } from "../chat/ChatRunStatus";
import type { TurnSnapshot } from "@/shared/types/chatStream";
import "@/shared/i18n"; // initialize i18n

describe("ChatRunStatus component", () => {
  const baseRun: TurnSnapshot = {
    turnId: "turn-123",
    conversationId: "conv-456",
    requestId: "req-789",
    status: "processing",
    partialResponse: "Xin chào, tôi đang",
    lastEventSeq: 3,
    toolProgress: [],
    deadlineAt: new Date(Date.now() + 300_000).toISOString(),
  };

  it("renders active processing state with accessible Stop button and aria-label", async () => {
    const onStop = vi.fn().mockResolvedValue(null);
    render(
      <ChatRunStatus
        run={baseRun}
        connection="live"
        onStop={onStop}
        onReconnect={vi.fn()}
      />,
    );

    const stopBtn = screen.getByRole("button", { name: /dừng|stop/i });
    expect(stopBtn).toBeInTheDocument();
    expect(stopBtn).not.toBeDisabled();

    fireEvent.click(stopBtn);
    expect(onStop).toHaveBeenCalledTimes(1);

    // Transitions to Stopping...
    await waitFor(() => {
      expect(screen.getByText(/đang dừng|stopping/i)).toBeInTheDocument();
    });
  });

  it("handles stop cancellation failure without falsely displaying cancelled", async () => {
    const onStop = vi.fn().mockRejectedValue(new Error("Network failed"));
    render(
      <ChatRunStatus
        run={baseRun}
        connection="live"
        onStop={onStop}
        onReconnect={vi.fn()}
      />,
    );

    const stopBtn = screen.getByRole("button", { name: /dừng|stop/i });
    fireEvent.click(stopBtn);
    expect(onStop).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      // Must not show "Đã dừng" if stop failed
      expect(
        screen.queryByTestId("run-status-cancelled"),
      ).not.toBeInTheDocument();
    });
  });

  it("renders terminal statuses correctly (cancelled, failed, timed_out, interrupted)", () => {
    const statuses: Array<TurnSnapshot["status"]> = [
      "cancelled",
      "failed",
      "timed_out",
      "interrupted",
    ];

    for (const status of statuses) {
      const { unmount } = render(
        <ChatRunStatus
          run={{ ...baseRun, status }}
          connection="idle"
          onStop={vi.fn()}
          onReconnect={vi.fn()}
        />,
      );

      const statusEl = screen.getByTestId(`run-status-${status}`);
      expect(statusEl).toBeInTheDocument();
      unmount();
    }
  });

  it("renders live tool progress in an accessible region without raw args/results", () => {
    const runWithTools: TurnSnapshot = {
      ...baseRun,
      toolProgress: [
        {
          toolCallId: "tool-1",
          label: "Tạo công việc",
          status: "succeeded",
          summary: "Đã tạo: Mua sữa",
        },
        {
          toolCallId: "tool-2",
          label: "Tìm kiếm thông tin",
          status: "running" as unknown as "succeeded", // in progress
        },
        {
          toolCallId: "tool-3",
          label: "Cập nhật công việc",
          status: "failed",
          summary: "Không tìm thấy công việc",
        },
        {
          toolCallId: "tool-4",
          label: "Xóa danh mục",
          status: "unknown",
        },
      ],
    };

    render(
      <ChatRunStatus
        run={runWithTools}
        connection="live"
        onStop={vi.fn()}
        onReconnect={vi.fn()}
      />,
    );

    const liveRegion = screen.getByRole("status");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");

    // Labels and summaries present
    expect(screen.getByText("Tạo công việc")).toBeInTheDocument();
    expect(screen.getByText("Đã tạo: Mua sữa")).toBeInTheDocument();
    expect(screen.getByText("Tìm kiếm thông tin")).toBeInTheDocument();
    expect(screen.getByText("Cập nhật công việc")).toBeInTheDocument();
    expect(screen.getByText("Không tìm thấy công việc")).toBeInTheDocument();
    expect(screen.getByText("Xóa danh mục")).toBeInTheDocument();

    // Verify raw arguments or raw database keys are NOT in document
    expect(screen.queryByText(/executionToken/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/runnerInstanceId/i)).not.toBeInTheDocument();
  });

  it("renders offline banner when connection is offline", () => {
    render(
      <ChatRunStatus
        run={baseRun}
        connection="offline"
        onStop={vi.fn()}
        onReconnect={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /mất kết nối mạng|offline/i,
    );
  });

  it("renders connection error banner and calls onReconnect when clicked", async () => {
    const onReconnect = vi.fn().mockResolvedValue(undefined);
    render(
      <ChatRunStatus
        run={baseRun}
        connection="error"
        onStop={vi.fn()}
        onReconnect={onReconnect}
      />,
    );

    const reconnectBtn = screen.getByTestId("reconnect-button");
    expect(reconnectBtn).toBeInTheDocument();

    fireEvent.click(reconnectBtn);
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });
});

describe("Streaming Markdown resilience", () => {
  it("does not crash when rendering partial/unclosed mermaid code block", async () => {
    const { default: MarkdownText } = await import("../chat/MarkdownText");
    const partialMermaid = "```mermaid\ngraph TD\n  A[Start] --> B";

    // Should render gracefully as CodeBlock without throwing mermaid syntax error
    const { container } = render(<MarkdownText text={partialMermaid} />);
    expect(container).toBeInTheDocument();
    expect(screen.getByText(/graph TD/)).toBeInTheDocument();
  });
});
