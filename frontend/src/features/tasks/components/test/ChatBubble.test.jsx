import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/services/apiError";
import { useAuthStore } from "@/stores/useAuthStore";
import ChatBubble from "../chat";
import { aiService } from "@/shared/services/aiService";

const { send, load, create } = vi.hoisted(() => ({
  send: vi.fn(),
  load: vi.fn(),
  create: vi.fn(),
}));
vi.mock("@/shared/services/aiService", () => ({
  aiService: { getConversation: load, createConversation: create, listConversations: vi.fn().mockResolvedValue([]) },
}));
const snapshot = (messages = []) => ({
  conversationId: create.mock.calls.at(-1)?.[0],
  messages,
  before: null,
  pending: [],
});
const message = (text, sender = "bot") => ({
  id: text,
  text,
  sender,
  timestamp: new Date().toISOString(),
});
vi.mock("../../api/aiMutations", () => ({
  useAgenticChatMutation: () => ({ mutateAsync: send }),
  useGenerateTasksMutation: () => ({ mutateAsync: vi.fn() }),
}));

beforeEach(() => {
  aiService.listConversations.mockResolvedValue([]);
  send.mockReset();
  load.mockReset();
  create.mockReset();
  load.mockImplementation(async (id) => (id ? snapshot() : null));
  create.mockImplementation(async (id) => id);
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

it("opens a previous conversation from the empty chat and continues in that conversation", async () => {
  aiService.listConversations.mockResolvedValue([
    { id: "previous", title: "Previous plan", updatedAt: new Date().toISOString() },
  ]);
  load.mockImplementation(async (id) => id === "previous"
    ? { ...snapshot([message("Previous reply")]), conversationId: "previous" }
    : null);
  send.mockResolvedValue({ data: "Continued" });
  const user = userEvent.setup();
  render(<ChatBubble />);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  await user.click(await screen.findByRole("button", { name: /Previous plan/ }));
  expect(await screen.findByText("Previous reply")).toBeVisible();
  await user.type(screen.getByRole("textbox", { name: "Message" }), "Continue this plan{Enter}");
  await waitFor(() => expect(send).toHaveBeenCalledWith(expect.objectContaining({
    conversationId: "previous", userInput: "Continue this plan",
  })));
  expect(create).not.toHaveBeenCalled();
});

it("keeps messages, pending replies and drafts when closed and reopened", async () => {
  let resolveReply;
  send.mockReturnValue(
    new Promise((resolve) => {
      resolveReply = resolve;
    }),
  );
  const user = userEvent.setup();
  render(<ChatBubble />);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  await user.type(screen.getByRole("textbox"), "Help me plan{Enter}");
  await user.type(screen.getByRole("textbox"), "My next question");
  await user.click(screen.getByRole("button", { name: "Close chat" }));
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  await act(async () => {
    load.mockResolvedValue(
      snapshot([message("Help me plan", "user"), message("Here is your plan")]),
    );
    resolveReply({ data: "Here is your plan" });
  });
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  expect(screen.getByText("Help me plan")).toBeVisible();
  expect(screen.getByText("Here is your plan")).toBeVisible();
  expect(screen.getByRole("textbox")).toHaveValue("My next question");
  await user.click(screen.getByRole("button", { name: "Close chat" }));
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  expect(screen.getByText("Here is your plan")).toBeVisible();
});

it("resizes the dock up to half the page and closes to the bubble at the minimum", async () => {
  const user = userEvent.setup();
  render(<div className="ui-workspace-layout"><ChatBubble /></div>);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  await user.type(screen.getByRole("textbox"), "Keep this draft");
  await user.click(screen.getByRole("button", { name: "Expand chat" }));
  await user.click(screen.getByRole("button", { name: "Dock chat to right" }));
  const panel = screen.getByRole("region", { name: "Assistant chat" });
  const handle = screen.getByRole("separator", { name: "Resize chat sidebar" });
  vi.spyOn(panel, "getBoundingClientRect").mockReturnValue({ width: 400 });
  // MouseEvent supplies coordinates in jsdom, which has no native PointerEvent.
  handle.setPointerCapture = vi.fn();
  fireEvent(handle, new MouseEvent("pointerdown", { bubbles: true, clientX: 624, button: 0 }));
  fireEvent(handle, new MouseEvent("pointermove", { bubbles: true, clientX: 100 }));
  expect(panel.style.getPropertyValue("--assistant-dock-preferred-width")).toBe(`${window.innerWidth / 2}px`);
  expect(panel.closest(".ui-workspace-layout").style.getPropertyValue("--assistant-dock-preferred-width")).toBe(`${window.innerWidth / 2}px`);
  fireEvent(handle, new MouseEvent("pointermove", { bubbles: true, clientX: 700 }));
  expect(panel.style.getPropertyValue("--assistant-dock-preferred-width")).toBe("324px");
  fireEvent(handle, new MouseEvent("pointermove", { bubbles: true, clientX: 760 }));
  expect(screen.getByRole("button", { name: "Open assistant" })).toBeVisible();
  expect(screen.queryByRole("region", { name: "Assistant chat" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  expect(screen.getByRole("textbox")).toHaveValue("Keep this draft");
});

it("cycles through expanded, docked and compact chat without losing the draft", async () => {
  const user = userEvent.setup();
  render(<ChatBubble />);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  await user.type(screen.getByRole("textbox"), "Draft message");
  await user.click(screen.getByRole("button", { name: "Expand chat" }));
  expect(screen.getByRole("region", { name: "Assistant chat" })).toHaveClass(
    "ui-assistant-panel--expanded",
  );
  expect(screen.getByRole("textbox")).toHaveValue("Draft message");
  await user.click(screen.getByRole("button", { name: "Dock chat to right" }));
  expect(screen.getByRole("region", { name: "Assistant chat" })).toHaveClass(
    "ui-assistant-panel--docked",
  );
  expect(screen.getByRole("textbox")).toHaveValue("Draft message");
  await user.click(screen.getByRole("button", { name: "Close chat" }));
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  expect(screen.getByRole("region", { name: "Assistant chat" })).toHaveClass(
    "ui-assistant-panel--docked",
  );
  await user.click(screen.getByRole("button", { name: "Restore chat size" }));
  expect(
    screen.getByRole("region", { name: "Assistant chat" }),
  ).not.toHaveClass("ui-assistant-panel--expanded");
  expect(screen.getByRole("region", { name: "Assistant chat" })).toHaveClass(
    "ui-assistant-panel--compact",
  );
  expect(screen.getByRole("textbox")).toHaveValue("Draft message");
});

it("creates lazily, retains context, and restores latest history after remount", async () => {
  send.mockResolvedValue({ data: "Saved response" });
  load.mockImplementation(async () => snapshot([message("Saved response")]));
  const user = userEvent.setup();
  const first = render(<ChatBubble />);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  expect(
    screen.queryByRole("button", { name: "New conversation" }),
  ).not.toBeInTheDocument();
  expect(create).not.toHaveBeenCalled();
  expect(load).toHaveBeenCalled();
  await user.type(screen.getByRole("textbox"), "First message{Enter}");
  expect(await screen.findByText("Saved response")).toBeVisible();
  const firstId = create.mock.calls[0][0];
  expect(screen.queryByRole("group", { name: "Assistant mode" })).not.toBeInTheDocument();
  expect(screen.getByText("Saved response")).toBeVisible();
  await user.type(screen.getByRole("textbox"), "Follow up{Enter}");
  await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
  expect(send.mock.calls[1][0].conversationId).toBe(firstId);
  expect(create).toHaveBeenCalledTimes(1);
  first.unmount();
  render(<ChatBubble />);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  expect(await screen.findByText("Saved response")).toBeVisible();
  expect(create).toHaveBeenCalledTimes(1);
  await user.type(screen.getByRole("textbox"), "New session{Enter}");
  await waitFor(() => expect(send).toHaveBeenCalledTimes(3));
  expect(create).toHaveBeenCalledTimes(1);
  expect(load.mock.calls.some(([id]) => id === undefined)).toBe(true);
});

it("retries an uncertain response with the same request ID", async () => {
  send.mockRejectedValueOnce(new Error("Connection lost"));
  const user = userEvent.setup();
  render(<ChatBubble />);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  await user.type(screen.getByRole("textbox"), "Create task{Enter}");
  expect(await screen.findByRole("alert")).toHaveTextContent("Connection lost");
  const original = send.mock.calls[0][0];
  expect(original).toMatchObject({
    conversationId: create.mock.calls[0][0],
    requestId: expect.any(String),
  });
  load.mockResolvedValue(
    snapshot([message("Create task", "user"), message("Created once")]),
  );
  send.mockResolvedValueOnce({ data: "Created once" });
  await user.click(screen.getByRole("button", { name: "Check reply / Retry" }));
  expect(await screen.findByText("Created once")).toBeVisible();
  expect(send.mock.calls[1][0]).toEqual(original);
});

it("reuses the creation ID after a network failure without loading an old conversation", async () => {
  create.mockRejectedValueOnce(new Error("offline"));
  send.mockResolvedValue({ data: "Recovered" });
  const user = userEvent.setup();
  render(<ChatBubble />);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  await user.type(screen.getByRole("textbox"), "Hello{Enter}");
  expect(await screen.findByRole("alert")).toHaveTextContent("offline");
  expect(send).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Reload conversation" }));
  expect(load).toHaveBeenCalled();
  await user.type(screen.getByRole("textbox"), "Hello again{Enter}");
  await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
  expect(create).toHaveBeenCalledTimes(2);
  expect(create.mock.calls[1][0]).toBe(create.mock.calls[0][0]);
});

it("clears account history and ignores the previous account's late reply", async () => {
  let finish;
  send.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const user = userEvent.setup();
  render(<ChatBubble />);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  await user.type(
    screen.getByRole("textbox"),
    "Private old account message{Enter}",
  );
  await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
  load.mockResolvedValue(snapshot([message("New account history")]));
  await act(async () => {
    useAuthStore.setState((state) => ({
      sessionRevision: state.sessionRevision + 1,
    }));
  });
  expect(await screen.findByText("New account history")).toBeVisible();
  expect(load).toHaveBeenCalled();
  await act(async () => {
    finish({ data: "Private old account reply" });
  });
  expect(
    screen.queryByText("Private old account message"),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText("Private old account reply"),
  ).not.toBeInTheDocument();
});

it("allows recovery after validation failure instead of keeping an unexecutable retry", async () => {
  send.mockRejectedValueOnce(new ApiError("Invalid message", 422, "http"));
  const user = userEvent.setup();
  render(<ChatBubble />);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  await user.type(screen.getByRole("textbox"), "Rejected message{Enter}");
  expect(await screen.findByRole("alert")).toHaveTextContent("Invalid message");
  expect(
    screen.queryByRole("button", { name: "Check reply / Retry" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Reload conversation" }));
  await waitFor(() =>
    expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
  );
  expect(screen.getByRole("textbox")).toBeEnabled();
});

const interaction = {
  id: "question-1",
  kind: "clarification",
  question: "Choose a plan",
  options: [
    { id: "fast", label: "Quick plan" },
    { id: "full", label: "Detailed plan" },
  ],
  allowCustomAnswer: true,
  status: "pending",
};
it("restores Ask, allows new messages, and retries a choice with the same request ID", async () => {
  load.mockResolvedValue({
    ...snapshot(),
    conversationId: "saved",
    mode: "ask",
    interaction,
  });
  send.mockRejectedValueOnce(new Error("Answer connection lost"));
  const user = userEvent.setup();
  render(<ChatBubble />);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  expect(await screen.findByText("Choose a plan")).toBeVisible();
  expect(screen.getByRole("combobox", { name: "Agent mode" })).toHaveValue(
    "ask",
  );
  expect(screen.getByRole("combobox", { name: "Agent mode" })).toBeEnabled();
  expect(screen.getByRole("textbox", { name: "Message" })).toBeEnabled();
  await user.click(screen.getByRole("radio", { name: "Quick plan" }));
  await user.click(screen.getByRole("button", { name: "Send answer" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Answer connection lost",
  );
  const payload = send.mock.calls[0][0];
  expect(payload).toMatchObject({
    conversationId: "saved",
    userInput: "Quick plan",
    mode: "ask",
    selection: { interactionId: "question-1", optionId: "fast" },
  });
  send.mockResolvedValue({ data: "Plan ready", status: "completed" });
  load.mockResolvedValue({
    ...snapshot([message("Plan ready")]),
    conversationId: "saved",
    mode: "ask",
  });
  await user.click(screen.getByRole("button", { name: "Check reply / Retry" }));
  expect(await screen.findByText("Plan ready")).toBeVisible();
  expect(send.mock.calls[1][0]).toEqual(payload);
});

it("cancels confirmation through a new chat message", async () => {
  load.mockResolvedValue({
    ...snapshot(),
    conversationId: "saved",
    mode: "ask",
    interaction: {
      ...interaction,
      kind: "confirmation",
      allowCustomAnswer: false,
      options: [
        { id: "confirm", label: "Confirm change" },
        { id: "cancel", label: "Cancel" },
      ],
      details: [{ label: "Title", value: "My task" }],
    },
  });
  send.mockResolvedValue({ data: "Cancelled", status: "completed" });
  const user = userEvent.setup();
  render(<ChatBubble />);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  expect(await screen.findByText("My task")).toBeVisible();
  expect(
    screen.queryByRole("textbox", { name: "Other answer" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Cancel", exact: true }));
  expect(send).toHaveBeenCalledWith(
    expect.objectContaining({
      userInput: "Hủy",
      selection: { cancel: true, interactionId: "question-1" },
      requestId: expect.any(String),
    }),
  );
});

it("sends selected mode and allows a custom clarification answer", async () => {
  send.mockResolvedValue({ data: "", status: "completed", interaction });
  const user = userEvent.setup();
  render(<ChatBubble />);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Agent mode" }),
    "ask",
  );
  load.mockResolvedValue({
    ...snapshot(),
    conversationId: "saved",
    mode: "ask",
    interaction,
  });
  await user.type(
    screen.getByRole("textbox", { name: "Message" }),
    "Plan my day{Enter}",
  );
  expect(await screen.findByText("Choose a plan")).toBeVisible();
  expect(send).toHaveBeenCalledWith(expect.objectContaining({ mode: "ask" }));
  await user.type(
    screen.getByRole("textbox", { name: "Other answer" }),
    "Only morning tasks",
  );
  send.mockResolvedValue({ data: "Done", status: "completed" });
  await user.click(screen.getByRole("button", { name: "Send answer" }));
  expect(send).toHaveBeenCalledWith(
    expect.objectContaining({
      userInput: "Only morning tasks",
      selection: {
        interactionId: "question-1",
        customAnswer: "Only morning tasks",
      },
    }),
  );
  expect(send.mock.calls[1][0].selection).not.toHaveProperty("optionId");
  expect(
    screen.queryByRole("button", { name: "Tasks", exact: true }),
  ).not.toBeInTheDocument();
});

it("reloads a processing answer without replaying the original chat send", async () => {
  load.mockResolvedValue({
    ...snapshot(),
    conversationId: "saved",
    mode: "ask",
    interaction,
  });
  send.mockRejectedValueOnce(new Error("Connection lost"));
  const user = userEvent.setup();
  render(<ChatBubble />);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  await user.click(await screen.findByRole("radio", { name: "Quick plan" }));
  await user.click(screen.getByRole("button", { name: "Send answer" }));
  expect(await screen.findByRole("alert")).toBeVisible();
  const original = send.mock.calls[0][0];
  load.mockResolvedValue({
    ...snapshot(),
    conversationId: "saved",
    mode: "ask",
    pending: [original],
  });
  await user.click(screen.getByRole("button", { name: "Reload conversation" }));
  await waitFor(() =>
    expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
  );
  expect(screen.getByRole("combobox", { name: "Agent mode" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  send.mockResolvedValue({ data: "", status: "processing" });
  await user.click(screen.getByRole("button", { name: "Check reply / Retry" }));
  expect(send.mock.calls[1][0]).toEqual(original);
});

it("retains answer retry identity when processing response history reload fails", async () => {
  load.mockResolvedValue({
    ...snapshot(),
    conversationId: "saved",
    mode: "ask",
    interaction,
  });
  send.mockResolvedValue({ data: "", status: "processing" });
  const user = userEvent.setup();
  render(<ChatBubble />);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  await user.click(await screen.findByRole("radio", { name: "Quick plan" }));
  load.mockRejectedValue(new Error("History unavailable"));
  await user.click(screen.getByRole("button", { name: "Send answer" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "History unavailable",
  );
  expect(screen.getByRole("combobox", { name: "Agent mode" })).toBeDisabled();
  const original = send.mock.calls[0][0];
  await user.click(screen.getByRole("button", { name: "Check reply / Retry" }));
  expect(send.mock.calls[1][0]).toEqual(original);
});

it("allows a new message to replace a menu without treating text as approval", async () => {
  load.mockResolvedValue({
    ...snapshot(),
    conversationId: "saved",
    mode: "ask",
    interaction,
  });
  send.mockResolvedValue({ data: "New response", status: "completed" });
  const user = userEvent.setup();
  render(<ChatBubble />);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  expect(await screen.findByText("Choose a plan")).toBeVisible();
  load.mockResolvedValue({
    ...snapshot([message("New response")]),
    conversationId: "saved",
    mode: "ask",
  });
  await user.type(
    screen.getByRole("textbox", { name: "Message" }),
    "Change my request{Enter}",
  );
  expect(await screen.findByText("New response")).toBeVisible();
  expect(send.mock.calls[0][0]).toMatchObject({
    userInput: "Change my request",
    mode: "ask",
  });
  expect(send.mock.calls[0][0]).not.toHaveProperty("selection");
  expect(screen.queryByText("Choose a plan")).not.toBeInTheDocument();
});

it("starts a fresh conversation and clears the draft with the plus button", async () => {
  load.mockResolvedValue({ ...snapshot([message("Old conversation")]), conversationId: "old" });
  const user = userEvent.setup();
  render(<ChatBubble />);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  await screen.findByText("Old conversation");
  await user.type(screen.getByRole("textbox"), "Unsent draft");
  await user.click(screen.getByRole("button", { name: "New chat" }));
  await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue(""));
  expect(screen.queryByText("Old conversation")).not.toBeInTheDocument();
  expect(screen.getByText("No messages yet. Start a conversation!")).toBeVisible();
  const newId = create.mock.calls[0][0];
  send.mockResolvedValue({ data: "Fresh reply" });
  load.mockResolvedValue({ ...snapshot(), conversationId: newId });
  await user.type(screen.getByRole("textbox"), "Hello{Enter}");
  await waitFor(() => expect(send).toHaveBeenCalledWith(expect.objectContaining({ conversationId: newId })));
  expect(create).toHaveBeenCalledTimes(1);
});

it("preserves history and draft when creating a new chat fails", async () => {
  load.mockResolvedValue({ ...snapshot([message("Keep history")]), conversationId: "old" });
  create.mockRejectedValue(new Error("Unavailable"));
  const user = userEvent.setup();
  render(<ChatBubble />);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  await screen.findByText("Keep history");
  await user.type(screen.getByRole("textbox"), "Keep draft");
  await user.click(screen.getByRole("button", { name: "New chat" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not create a new conversation");
  expect(screen.getByText("Keep history")).toBeVisible();
  expect(screen.getByRole("textbox")).toHaveValue("Keep draft");
});
