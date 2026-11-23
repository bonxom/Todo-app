import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import ChatField from "../chat/ChatField";
import { useConversationChat } from "../../hooks/useConversationChat";

const mutateAsync = vi
  .fn()
  .mockResolvedValue({ status: "completed", data: "Done" });
vi.mock("@/features/tasks/api/aiMutations", () => ({
  useAgenticChatMutation: () => ({ mutateAsync }),
  useStartChatTurnMutation: () => ({
    mutateAsync: vi.fn().mockRejectedValue(new Error("fallback to legacy")),
  }),
}));

const mockSession = {
  messages: [],
  setMessages: vi.fn(),
  conversationId: "conv-1",
  setConversationId: vi.fn(),
  mode: "auto",
  setMode: vi.fn(),
  interaction: {
    id: "clarify-1",
    kind: "clarification",
    question: "Which project?",
    options: [{ id: "proj-1", label: "Project 1" }],
    allowCustomAnswer: false,
    status: "pending",
  },
  capabilities: null,
  before: null,
  loading: false,
  sending: false,
  setSending: vi.fn(),
  error: null,
  setError: vi.fn(),
  pending: null,
  setPending: vi.fn(),
  busy: { current: false },
  isCurrent: () => true,
  acknowledgeSelection: vi.fn(),
  receive: vi.fn(),
  load: vi.fn(),
  reload: vi.fn(),
  loadEarlier: vi.fn(),
  newConversation: vi.fn(),
  openConversation: vi.fn(),
  setActiveRun: vi.fn(),
  proposalDirty: false,
  setProposalDirty: vi.fn(),
  discardRequest: null,
  resolveDiscard: vi.fn(),
  confirmDiscard: vi.fn(),
  context: null,
  setContext: vi.fn(),
  setContextForConversation: vi.fn(),
  activities: [],
  setActivities: vi.fn(),
};

vi.mock("../../hooks/useConversationSession", () => ({
  useConversationSession: () => mockSession,
}));

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

it("submits a pending Auto clarification preserving auto mode and selection", async () => {
  const { result } = renderHook(() => useConversationChat());
  await act(async () => {
    await result.current.answer({ optionId: "proj-1" });
  });
  expect(mutateAsync).toHaveBeenCalledWith(
    expect.objectContaining({
      mode: "auto",
      selection: {
        interactionId: "clarify-1",
        optionId: "proj-1",
      },
    }),
  );
});

it("preserves custom clarification text across change request and back, skips with cancel, and sends replacement without selection", async () => {
  const user = userEvent.setup();
  const onSendMessage = vi.fn().mockResolvedValue(true);
  const answer = vi.fn();
  const customInteraction = {
    id: "clarify-custom-1",
    kind: "clarification",
    question: "Which time slot?",
    options: [{ id: "opt-1", label: "Option 1" }],
    allowCustomAnswer: true,
    status: "pending",
  };

  const testChat = {
    ...chat,
    interaction: customInteraction,
    answer,
  };

  render(
    <ChatField messages={[]} onSendMessage={onSendMessage} chat={testChat} />,
  );

  // Select custom answer radio and type
  const customRadio = screen.getByRole("radio", {
    name: "Write my own answer",
  });
  await user.click(customRadio);
  const customInput = screen.getByRole("textbox", { name: "Your answer" });
  await user.type(customInput, "My special time");

  // Click Change request
  await user.click(screen.getByRole("button", { name: "Change request" }));

  // Main composer is now shown, InteractionCard is hidden
  const messageInput = screen.getByRole("textbox", { name: "Message" });
  expect(messageInput).toHaveFocus();

  // Return via "Back to question"
  await user.click(screen.getByRole("button", { name: /Back to question/i }));

  // Assert textarea still retains the text
  expect(screen.getByRole("textbox", { name: "Your answer" })).toHaveValue(
    "My special time",
  );
  expect(customInput).toHaveFocus();

  // Click Change request again
  await user.click(screen.getByRole("button", { name: "Change request" }));

  // From alternate composer, click "Skip question"
  await user.click(screen.getByRole("button", { name: "Skip question" }));
  expect(answer).toHaveBeenCalledWith(undefined, true);

  // The question stays pending until the server accepts the skip.
  expect(messageInput).toBeVisible();
  await user.type(messageInput, "Create a different task instead");
  await user.click(screen.getByRole("button", { name: "Send message" }));
  expect(onSendMessage).toHaveBeenCalledWith("Create a different task instead");
});
