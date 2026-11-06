import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import ChatField from "../chat/ChatField";

vi.mock("@/shared/services/aiService", () => ({
  aiService: { listConversations: vi.fn().mockResolvedValue([]) },
}));
const chat = {
  mode: "ask",
  setMode: vi.fn(),
  locked: false,
  loading: false,
  sending: false,
};

it("uses distinct robot states without a dropdown, skill icon or mode hint", async () => {
  const { rerender } = render(
    <ChatField messages={[]} onSendMessage={vi.fn()} chat={chat} />,
  );
  await userEvent.click(screen.getByRole("button", { name: "Expand options" }));
  const robot = screen.getByRole("button", { name: "Agent mode: ask" });
  expect(robot).toHaveAttribute("aria-pressed", "true");
  expect(robot).toHaveClass("chat-mode-toggle--ask");
  await userEvent.click(robot);
  expect(chat.setMode).toHaveBeenCalledWith("auto");
  rerender(
    <ChatField
      messages={[]}
      onSendMessage={vi.fn()}
      chat={{ ...chat, mode: "auto" }}
    />,
  );
  expect(robot).toHaveAttribute("aria-pressed", "false");
  expect(robot).toHaveClass("chat-mode-toggle--auto");
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Choose skill" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText(/Clarifies your preferences/),
  ).not.toBeInTheDocument();
});

it("fills a starter prompt without sending it", async () => {
  const send = vi.fn();
  render(<ChatField messages={[]} onSendMessage={send} chat={chat} />);
  await userEvent.click(screen.getByRole("button", { name: "Plan my day" }));
  expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue(
    "Help me plan my tasks for today.",
  );
  expect(send).not.toHaveBeenCalled();
});

it("does not send while an IME composition is being confirmed", () => {
  const send = vi.fn();
  render(<ChatField messages={[]} onSendMessage={send} chat={chat} />);
  const input = screen.getByRole("textbox", { name: "Message" });
  fireEvent.change(input, { target: { value: "Tiếng Việt" } });
  fireEvent.keyDown(input, { key: "Enter", isComposing: true });
  expect(send).not.toHaveBeenCalled();
  expect(input).toHaveValue("Tiếng Việt");
});

it("keeps text and selected skill if the conversation cannot be created", async () => {
  const user = userEvent.setup();
  const send = vi.fn().mockResolvedValue(false);
  render(<ChatField messages={[]} onSendMessage={send} chat={chat} />);
  const input = screen.getByRole("textbox", { name: "Message" });
  await user.type(input, "/gym{Enter}Plan my week{Enter}");
  expect(send).toHaveBeenCalledWith("[Skill: gym] Plan my week");
  expect(input).toHaveValue("Plan my week");
  expect(screen.getByLabelText("Remove skill gym")).toBeVisible();
});

it("offers a way to check a processing request without sending it again", async () => {
  const reload = vi.fn();
  render(
    <ChatField
      messages={[]}
      onSendMessage={vi.fn()}
      chat={{ ...chat, pending: { requestId: "pending" }, reload }}
    />,
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Reload conversation" }),
  );
  expect(reload).toHaveBeenCalledOnce();
});

it("shows default avatars for both senders and falls back safely when images fail", () => {
  render(
    <ChatField
      messages={[
        {
          id: "user-avatar",
          sender: "user",
          text: "Hello",
          timestamp: new Date().toISOString(),
        },
        {
          id: "agent-avatar",
          sender: "bot",
          text: "Hi",
          timestamp: new Date().toISOString(),
        },
      ]}
      onSendMessage={vi.fn()}
    />,
  );
  const fallback =
    "https://i.pinimg.com/236x/16/d0/98/16d098f6a7b93394765e45962c0fb2d0.jpg";
  expect(screen.getByRole("img", { name: "Your avatar" })).toHaveAttribute(
    "src",
    fallback,
  );
  const agent = screen.getByRole("img", { name: "Agent avatar" });
  expect(agent).toHaveAttribute("src", fallback);
  fireEvent.error(agent);
  expect(screen.getByRole("img", { name: "Agent avatar" }).tagName).toBe(
    "SPAN",
  );
});
