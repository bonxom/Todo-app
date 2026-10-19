import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/services/apiError";
import { useAuthStore } from "@/stores/useAuthStore";
import ChatBubble from "../chat";

const { send, load, create, answer } = vi.hoisted(() => ({ send: vi.fn(), load: vi.fn(), create: vi.fn(), answer: vi.fn() }));
vi.mock("@/shared/services/aiService", () => ({
  aiService: { getConversation: load, createConversation: create },
}));
const snapshot = (messages = []) => ({ conversationId: create.mock.calls.at(-1)?.[0], messages, before: null, pending: [] });
const message = (text, sender = "bot") => ({ id: text, text, sender, timestamp: new Date().toISOString() });
vi.mock("../../api/aiMutations", () => ({
  useInteractionMutation: () => ({ mutateAsync: answer }),
  useAgenticChatMutation: () => ({ mutateAsync: send }),
  useGenerateTasksMutation: () => ({ mutateAsync: vi.fn() }),
}));

beforeEach(() => {
  send.mockReset(); load.mockReset(); create.mockReset(); answer.mockReset();
  load.mockImplementation(async (id) => id ? snapshot() : null);
  create.mockImplementation(async (id) => id);
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
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
    load.mockResolvedValue(snapshot([message("Help me plan", "user"), message("Here is your plan")]));
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

it("expands and restores the same chat without losing the draft", async () => {
  const user = userEvent.setup();
  render(<ChatBubble />);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  await user.type(screen.getByRole("textbox"), "Draft message");
  await user.click(screen.getByRole("button", { name: "Expand chat" }));
  expect(screen.getByRole("region", { name: "Assistant chat" })).toHaveClass(
    "ui-assistant-panel--expanded",
  );
  expect(screen.getByRole("textbox")).toHaveValue("Draft message");
  await user.click(screen.getByRole("button", { name: "Restore chat size" }));
  expect(
    screen.getByRole("region", { name: "Assistant chat" }),
  ).not.toHaveClass("ui-assistant-panel--expanded");
  expect(screen.getByRole("textbox")).toHaveValue("Draft message");
});


it("creates lazily, retains context across modes, and restores latest history after remount", async () => {
  send.mockResolvedValue({ data: "Saved response" });
  load.mockImplementation(async () => snapshot([message("Saved response")]));
  const user = userEvent.setup();
  const first = render(<ChatBubble />);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  expect(screen.queryByRole("button", { name: "New conversation" })).not.toBeInTheDocument();
  expect(create).not.toHaveBeenCalled();
  expect(load).toHaveBeenCalled();
  await user.type(screen.getByRole("textbox"), "First message{Enter}");
  expect(await screen.findByText("Saved response")).toBeVisible();
  const firstId = create.mock.calls[0][0];
  await user.click(screen.getByRole("button", { name: "Tasks" }));
  await user.click(screen.getByRole("button", { name: "Chat", exact: true }));
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
  expect(original).toMatchObject({ conversationId: create.mock.calls[0][0], requestId: expect.any(String) });
  load.mockResolvedValue(snapshot([message("Create task", "user"), message("Created once")]));
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
  send.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const user = userEvent.setup();
  render(<ChatBubble />);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  await user.type(screen.getByRole("textbox"), "Private old account message{Enter}");
  await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
  load.mockResolvedValue(snapshot([message("New account history")]));
  await act(async () => {
    useAuthStore.setState((state) => ({ sessionRevision: state.sessionRevision + 1 }));
  });
  expect(await screen.findByText("New account history")).toBeVisible();
  expect(load).toHaveBeenCalled();
  await act(async () => { finish({ data: "Private old account reply" }); });
  expect(screen.queryByText("Private old account message")).not.toBeInTheDocument();
  expect(screen.queryByText("Private old account reply")).not.toBeInTheDocument();
});


it("allows recovery after validation failure instead of keeping an unexecutable retry", async () => {
  send.mockRejectedValueOnce(new ApiError("Invalid message", 422, "http"));
  const user = userEvent.setup();
  render(<ChatBubble />);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  await user.type(screen.getByRole("textbox"), "Rejected message{Enter}");
  expect(await screen.findByRole("alert")).toHaveTextContent("Invalid message");
  expect(screen.queryByRole("button", { name: "Check reply / Retry" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Reload conversation" }));
  await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  expect(screen.getByRole("textbox")).toBeEnabled();
});

const interaction = { id: "question-1", kind: "clarification", question: "Choose a plan", options: [{ id: "fast", label: "Quick plan" }, { id: "full", label: "Detailed plan" }], allowCustomAnswer: true, status: "pending" };
it("restores Ask, blocks new messages, and retries an answer with the same request ID", async () => {
  load.mockResolvedValue({ ...snapshot(), conversationId: "saved", mode: "ask", interaction });
  answer.mockRejectedValueOnce(new Error("Answer connection lost"));
  const user = userEvent.setup();
  render(<ChatBubble />);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  expect(await screen.findByText("Choose a plan")).toBeVisible();
  expect(screen.getByRole("combobox", { name: "Agent mode" })).toHaveValue("ask");
  expect(screen.getByRole("combobox", { name: "Agent mode" })).toBeDisabled();
  expect(screen.getByRole("textbox", { name: "Message" })).toBeDisabled();
  await user.click(screen.getByRole("radio", { name: "Quick plan" }));
  await user.click(screen.getByRole("button", { name: "Send answer" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Answer connection lost");
  const payload = answer.mock.calls[0][0];
  expect(payload).toMatchObject({ conversationId: "saved", interactionId: "question-1", optionId: "fast" });
  answer.mockResolvedValue({ data: "Plan ready", status: "completed" });
  load.mockResolvedValue({ ...snapshot([message("Plan ready")]), conversationId: "saved", mode: "ask" });
  await user.click(screen.getByRole("button", { name: "Check reply / Retry" }));
  expect(await screen.findByText("Plan ready")).toBeVisible();
  expect(answer.mock.calls[1][0]).toEqual(payload);
  expect(send).not.toHaveBeenCalled();
});

it("cancels confirmation through the cancellation endpoint payload", async () => {
  load.mockResolvedValue({ ...snapshot(), conversationId: "saved", mode: "ask", interaction: { ...interaction, kind: "confirmation", allowCustomAnswer: false, options: [{ id: "confirm", label: "Confirm change" }, { id: "cancel", label: "Cancel" }], details: [{ label: "Title", value: "My task" }] } });
  answer.mockResolvedValue({ data: "Cancelled", status: "cancelled" });
  const user = userEvent.setup();
  render(<ChatBubble />);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  expect(await screen.findByText("My task")).toBeVisible();
  expect(screen.queryByRole("textbox", { name: "Other answer" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Cancel", exact: true }));
  expect(answer).toHaveBeenCalledWith(expect.objectContaining({ cancel: true, interactionId: "question-1", requestId: expect.any(String) }));
});

it("sends selected mode and allows a custom clarification answer", async () => {
  send.mockResolvedValue({ data: "", status: "awaiting_user", interaction });
  const user = userEvent.setup();
  render(<ChatBubble />);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  await user.selectOptions(screen.getByRole("combobox", { name: "Agent mode" }), "ask");
  load.mockResolvedValue({ ...snapshot(), conversationId: "saved", mode: "ask", interaction });
  await user.type(screen.getByRole("textbox", { name: "Message" }), "Plan my day{Enter}");
  expect(await screen.findByText("Choose a plan")).toBeVisible();
  expect(send).toHaveBeenCalledWith(expect.objectContaining({ mode: "ask" }));
  await user.type(screen.getByRole("textbox", { name: "Other answer" }), "Only morning tasks");
  answer.mockResolvedValue({ data: "Done", status: "completed" });
  await user.click(screen.getByRole("button", { name: "Send answer" }));
  expect(answer).toHaveBeenCalledWith(expect.objectContaining({ customAnswer: "Only morning tasks" }));
  expect(answer.mock.calls[0][0]).not.toHaveProperty("optionId");
  await user.click(screen.getByRole("button", { name: "Tasks", exact: true }));
  expect(screen.queryByRole("combobox", { name: "Agent mode" })).not.toBeInTheDocument();
});

it("reloads a processing answer without replaying the original chat send", async () => {
  load.mockResolvedValue({ ...snapshot(), conversationId: "saved", mode: "ask", interaction });
  answer.mockRejectedValueOnce(new Error("Connection lost"));
  const user = userEvent.setup();
  render(<ChatBubble />);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  await user.click(await screen.findByRole("radio", { name: "Quick plan" }));
  await user.click(screen.getByRole("button", { name: "Send answer" }));
  expect(await screen.findByRole("alert")).toBeVisible();
  const original = answer.mock.calls[0][0];
  load.mockResolvedValue({ ...snapshot(), conversationId: "saved", mode: "ask", pending: [{ requestId: "original-chat", userInput: "Plan", mode: "ask" }] });
  await user.click(screen.getByRole("button", { name: "Reload conversation" }));
  await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  expect(screen.getByRole("combobox", { name: "Agent mode" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  answer.mockResolvedValue({ data: "", status: "processing" });
  await user.click(screen.getByRole("button", { name: "Check reply / Retry" }));
  expect(answer.mock.calls[1][0]).toEqual(original);
  expect(send).not.toHaveBeenCalled();
});

it("retains answer retry identity when processing response history reload fails", async () => {
  load.mockResolvedValue({ ...snapshot(), conversationId: "saved", mode: "ask", interaction });
  answer.mockResolvedValue({ data: "", status: "processing" });
  const user = userEvent.setup();
  render(<ChatBubble />);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  await user.click(await screen.findByRole("radio", { name: "Quick plan" }));
  load.mockRejectedValue(new Error("History unavailable"));
  await user.click(screen.getByRole("button", { name: "Send answer" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("History unavailable");
  expect(screen.getByRole("combobox", { name: "Agent mode" })).toBeDisabled();
  const original = answer.mock.calls[0][0];
  await user.click(screen.getByRole("button", { name: "Check reply / Retry" }));
  expect(answer.mock.calls[1][0]).toEqual(original);
  expect(send).not.toHaveBeenCalled();
});
