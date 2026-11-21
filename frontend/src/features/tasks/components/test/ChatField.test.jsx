import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ChatField from "../chat/ChatField";

vi.mock("@/shared/services/aiService", () => ({
  aiService: { listConversations: vi.fn().mockResolvedValue([]) },
}));

describe("ChatField", () => {
  it("hides interaction reply bubbles while retaining the answer card and ordinary messages", () => {
    const timestamp = new Date().toISOString();
    render(
      <ChatField
        onSendMessage={vi.fn()}
        messages={[
          {
            id: "question",
            sender: "bot",
            timestamp,
            interaction: {
              id: "choice",
              status: "answered",
              question: "Choose a plan",
              options: [],
              answer: { customAnswer: "My custom plan" },
            },
          },
          {
            id: "answer",
            sender: "user",
            timestamp,
            text: "My custom plan",
            replyToInteractionId: "choice",
          },
          {
            id: "selection",
            sender: "user",
            timestamp,
            text: "Selected option",
            replyToInteractionId: "other-choice",
          },
          {
            id: "ordinary",
            sender: "user",
            timestamp,
            text: "Selected option",
          },
        ]}
      />,
    );
    expect(screen.getAllByText("My custom plan")).toHaveLength(1);
    expect(screen.getAllByText("Selected option")).toHaveLength(1);
    expect(screen.getByText("Choose a plan")).toBeVisible();
  });

  const defaultChat = {
    mode: "auto",
    setMode: vi.fn(),
    locked: false,
    loading: false,
    sending: false,
  };

  it("opens attachment options while keeping mode available", async () => {
    const user = userEvent.setup();
    const setMode = vi.fn();
    render(
      <ChatField
        messages={[]}
        onSendMessage={vi.fn()}
        chat={{ ...defaultChat, setMode }}
      />,
    );

    const toggleBtn = screen.getByRole("button", { name: "Expand options" });
    expect(toggleBtn).toBeVisible();
    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");

    // Click > to expand
    await user.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute("aria-expanded", "true");

    // Options are visible
    expect(
      screen.getByRole("button", { name: "Attach image" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Attach file" }),
    ).toBeInTheDocument();
    const mode = screen.getByRole("button", { name: /Agent mode:/ });
    expect(mode).toBeVisible();
    await user.click(mode);
    expect(setMode).toHaveBeenCalledWith("ask");
  });

  it("automatically collapses the menu back to > when clicking or focusing on the textarea", async () => {
    const user = userEvent.setup();
    render(
      <ChatField messages={[]} onSendMessage={vi.fn()} chat={defaultChat} />,
    );

    const toggleBtn = screen.getByRole("button", { name: "Expand options" });
    await user.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute("aria-expanded", "true");

    // Focus/click into textarea
    const textarea = screen.getByRole("textbox", { name: "Message" });
    await user.click(textarea);

    // Menu collapses back to >
    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
  });

  it("shows Ask in the visible mode selector and allows switching to Auto", async () => {
    const user = userEvent.setup();
    const setMode = vi.fn();
    render(
      <ChatField
        messages={[]}
        onSendMessage={vi.fn()}
        chat={{ ...defaultChat, mode: "ask", setMode }}
      />,
    );

    const toggleBtn = screen.getByRole("button", { name: "Expand options" });
    await user.click(toggleBtn);

    const mode = screen.getByRole("button", { name: /Agent mode:/ });
    expect(mode).toHaveAttribute("aria-pressed", "true");
    await user.click(mode);
    expect(setMode).toHaveBeenCalledWith("auto");
  });

  it("suggests skills when typing '/', selects skill into badge, and removes on Backspace", async () => {
    const user = userEvent.setup();
    const onSendMessage = vi.fn();
    render(
      <ChatField
        messages={[]}
        onSendMessage={onSendMessage}
        chat={defaultChat}
      />,
    );

    const textarea = screen.getByRole("textbox", { name: "Message" });
    await user.type(textarea, "/gym");

    // Suggestion popup is visible
    expect(screen.getByText("gym")).toBeInTheDocument();

    // Select with Enter
    await user.keyboard("{Enter}");

    // Badge is displayed
    expect(screen.getByText("gym")).toBeInTheDocument();
    expect(screen.getByLabelText("Remove skill gym")).toBeInTheDocument();
    expect(textarea).toHaveValue("");

    // Backspace removes badge
    await user.keyboard("{Backspace}");
    expect(screen.queryByLabelText("Remove skill gym")).not.toBeInTheDocument();
  });

  it("submits message with selected skill attached and renders skill badge on message", async () => {
    const user = userEvent.setup();
    const onSendMessage = vi.fn();
    const { rerender } = render(
      <ChatField
        messages={[]}
        onSendMessage={onSendMessage}
        chat={defaultChat}
      />,
    );

    const textarea = screen.getByRole("textbox", { name: "Message" });
    await user.type(textarea, "/ielts");
    await user.keyboard("{Enter}");

    // Type prompt
    await user.type(textarea, "Grade my essay");
    await user.keyboard("{Enter}");

    expect(onSendMessage).toHaveBeenCalledWith("[Skill: ielts] Grade my essay");

    // Rerender with user message having [Skill: ielts]
    rerender(
      <ChatField
        messages={[
          {
            id: "msg-1",
            sender: "user",
            text: "[Skill: ielts] Grade my essay",
            timestamp: new Date().toISOString(),
          },
        ]}
        onSendMessage={onSendMessage}
        chat={defaultChat}
      />,
    );

    expect(screen.getByText("ielts")).toBeInTheDocument();
    expect(screen.getByText("Grade my essay")).toBeInTheDocument();
  });

  it("handles pasting an image from clipboard by adding it to attached files", () => {
    render(
      <ChatField messages={[]} onSendMessage={vi.fn()} chat={defaultChat} />,
    );

    const textarea = screen.getByRole("textbox", { name: "Message" });
    const imageFile = new File(["dummy image content"], "screenshot.png", {
      type: "image/png",
    });

    fireEvent.paste(textarea, {
      clipboardData: {
        files: [imageFile],
        items: [
          {
            type: "image/png",
            getAsFile: () => imageFile,
          },
        ],
      },
    });

    expect(screen.getByText("screenshot.png")).toBeInTheDocument();
  });
});

it("keeps the stopped label on a saved partial response after reload", () => {
  render(
    <ChatField
      onSendMessage={vi.fn()}
      messages={[
        {
          id: "stopped:bot",
          sender: "bot",
          text: "Partial answer",
          timestamp: new Date().toISOString(),
          turnStatus: "cancelled",
        },
      ]}
    />,
  );
  expect(screen.getByText("Partial answer")).toBeVisible();
  expect(screen.getByTestId("run-status-cancelled")).toBeVisible();
});

it("shows live expanded thinking & tool process while streaming and collapses after completion", async () => {
  const user = userEvent.setup();
  const timestamp = new Date().toISOString();
  const activeRun = {
    turnId: "turn-live",
    conversationId: "conv-1",
    requestId: "req-1",
    status: "processing",
    partialResponse: "",
    lastEventSeq: 1,
    toolProgress: [],
    deadlineAt: new Date(Date.now() + 300_000).toISOString(),
  };

  const { rerender } = render(
    <ChatField
      onSendMessage={vi.fn()}
      workspaceComposer
      messages={[
        {
          id: "turn-live:user",
          sender: "user",
          text: "Plan my day",
          timestamp,
        },
        {
          id: "turn-live:bot",
          sender: "bot",
          text: "",
          timestamp,
          toolProgress: [],
        },
      ]}
      chat={{
        mode: "auto",
        setMode: vi.fn(),
        locked: true,
        loading: false,
        sending: false,
        activeRun,
        runStream: {
          snapshot: activeRun,
          connection: "live",
          streamingMessage: {
            id: "turn-live:bot",
            sender: "bot",
            text: "",
            timestamp,
            toolProgress: [],
          },
        },
        stop: vi.fn(),
      }}
    />,
  );

  // Minimal live thinking line is visible immediately before any tool starts or text streams
  const liveRegion = screen.getByTestId("agent-process-live");
  expect(liveRegion).toBeVisible();
  expect(screen.getByTestId("agent-process-thinking-step")).toHaveTextContent(
    /thinking/i,
  );

  // After completion with persisted toolProgress, panel defaults to collapsed and toggles open on click
  rerender(
    <ChatField
      onSendMessage={vi.fn()}
      workspaceComposer
      messages={[
        {
          id: "turn-live:user",
          sender: "user",
          text: "Plan my day",
          timestamp,
        },
        {
          id: "turn-live:bot",
          sender: "bot",
          text: "Here is your daily plan.",
          timestamp,
          toolProgress: [
            {
              toolCallId: "tc-1",
              label: "Searching tasks",
              status: "succeeded",
              summary: "Found 5 tasks",
            },
          ],
        },
      ]}
      chat={{
        mode: "auto",
        setMode: vi.fn(),
        locked: false,
        loading: false,
        sending: false,
        activeRun: null,
        runStream: {
          snapshot: null,
          connection: "idle",
          streamingMessage: null,
        },
        stop: vi.fn(),
      }}
    />,
  );

  const completedToggle = screen.getByTestId("agent-process-toggle");
  expect(completedToggle).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByTestId("tool-progress-tc-1")).not.toBeInTheDocument();

  await user.click(completedToggle);
  expect(completedToggle).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByTestId("tool-progress-tc-1")).toBeVisible();
  expect(screen.getByText("Searching tasks")).toBeVisible();
  expect(screen.getByText("Found 5 tasks")).toBeVisible();
});

it("replaces Send with Stop in bubble chat composer when a run is active", async () => {
  const user = userEvent.setup();
  const stop = vi.fn().mockResolvedValue(null);
  const activeRun = {
    turnId: "turn-bubble",
    conversationId: "conv-1",
    requestId: "req-2",
    status: "processing",
    partialResponse: "",
    lastEventSeq: 1,
    toolProgress: [
      {
        toolCallId: "tc-bubble",
        label: "Checking tasks",
        status: "started",
      },
    ],
    deadlineAt: new Date(Date.now() + 300_000).toISOString(),
  };

  render(
    <ChatField
      onSendMessage={vi.fn()}
      disabled
      messages={[
        {
          id: "turn-bubble:bot",
          sender: "bot",
          text: "",
          timestamp: new Date().toISOString(),
          toolProgress: activeRun.toolProgress,
        },
      ]}
      chat={{
        mode: "auto",
        setMode: vi.fn(),
        locked: true,
        loading: false,
        sending: false,
        activeRun,
        runStream: {
          snapshot: activeRun,
          connection: "live",
          streamingMessage: {
            id: "turn-bubble:bot",
            sender: "bot",
            text: "",
            timestamp: new Date().toISOString(),
            toolProgress: activeRun.toolProgress,
          },
        },
        stop,
      }}
    />,
  );

  // Only one Stop button (inside the composer, replacing Send), and it must be enabled
  const stopButtons = screen.getAllByRole("button", { name: /^stop$/i });
  expect(stopButtons).toHaveLength(1);
  expect(stopButtons[0]).toHaveClass("chat-send");
  expect(stopButtons[0]).not.toBeDisabled();

  // Tool step renders once inside the collapsible panel (not duplicated in ChatRunStatus)
  expect(screen.getAllByTestId("tool-progress-tc-bubble")).toHaveLength(1);

  await user.click(stopButtons[0]);
  expect(stop).toHaveBeenCalledTimes(1);
});

it("renders companionText markdown above an A2UI surface without duplicating fallback text", async () => {
  const composedFixture = (
    await import("@/test/fixtures/a2ui-composition-v09.json")
  ).default;
  const surface = structuredClone(composedFixture.readonly);

  const { rerender } = render(
    <ChatField
      onSendMessage={vi.fn()}
      messages={[
        {
          id: "a2ui-with-text:bot",
          sender: "bot",
          text: surface.text,
          companionText: "Mình đã phân tích xong lịch học tuần này cho bạn:",
          surface,
          timestamp: new Date().toISOString(),
        },
      ]}
    />,
  );

  expect(
    screen.getByText("Mình đã phân tích xong lịch học tuần này cho bạn:"),
  ).toBeVisible();
  expect(
    await screen.findByRole("heading", { name: "Weekly Study Plan" }),
  ).toBeInTheDocument();

  // Without companionText, only the A2UI surface renders (no duplicate fallbackText paragraph)
  rerender(
    <ChatField
      onSendMessage={vi.fn()}
      messages={[
        {
          id: "a2ui-only:bot",
          sender: "bot",
          text: surface.text,
          surface,
          timestamp: new Date().toISOString(),
        },
      ]}
    />,
  );

  expect(
    screen.queryByText("Mình đã phân tích xong lịch học tuần này cho bạn:"),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("Monday: Reading (2h)")).not.toBeInTheDocument();
});
