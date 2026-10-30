import { render, screen } from "@testing-library/react";
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
          { id: "question", sender: "bot", timestamp, interaction: {
            id: "choice", status: "answered", question: "Choose a plan",
            options: [], answer: { customAnswer: "My custom plan" },
          } },
          { id: "answer", sender: "user", timestamp, text: "My custom plan", replyToInteractionId: "choice" },
          { id: "selection", sender: "user", timestamp, text: "Selected option", replyToInteractionId: "other-choice" },
          { id: "ordinary", sender: "user", timestamp, text: "Selected option" },
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

  it("renders collapsed options menu (>) on the left of textarea and expands on click", async () => {
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
    expect(screen.getByRole("button", { name: "Attach image" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Attach file" })).toBeInTheDocument();
    const botBtn = screen.getByRole("button", { name: "Agent mode: auto" });
    expect(botBtn).toBeInTheDocument();

    // Clicking Bot toggles mode
    await user.click(botBtn);
    expect(setMode).toHaveBeenCalledWith("ask");
  });

  it("automatically collapses the menu back to > when clicking or focusing on the textarea", async () => {
    const user = userEvent.setup();
    render(
      <ChatField
        messages={[]}
        onSendMessage={vi.fn()}
        chat={defaultChat}
      />,
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

  it("renders Bot with ask outline style when mode is ask and toggles to auto", async () => {
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

    const botBtn = screen.getByRole("button", { name: "Agent mode: ask" });
    expect(botBtn).toBeInTheDocument();
    await user.click(botBtn);
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
    expect(
      screen.queryByLabelText("Remove skill gym"),
    ).not.toBeInTheDocument();
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

    expect(onSendMessage).toHaveBeenCalledWith(
      "[Skill: ielts] Grade my essay",
    );

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
});
