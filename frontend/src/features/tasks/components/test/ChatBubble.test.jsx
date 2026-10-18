import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/services/apiError";
import { useAuthStore } from "@/stores/useAuthStore";
import ChatBubble from "../chat";

const { send, load, create } = vi.hoisted(() => ({ send: vi.fn(), load: vi.fn(), create: vi.fn() }));
vi.mock("@/shared/services/aiService", () => ({
  aiService: { getConversation: load, createConversation: create },
}));
const snapshot = (messages = []) => ({ conversationId: create.mock.calls.at(-1)?.[0], messages, before: null, pending: [] });
const message = (text, sender = "bot") => ({ id: text, text, sender, timestamp: new Date().toISOString() });
vi.mock("../../api/aiMutations", () => ({
  useAgenticChatMutation: () => ({ mutateAsync: send }),
  useGenerateTasksMutation: () => ({ mutateAsync: vi.fn() }),
}));

beforeEach(() => {
  send.mockReset(); load.mockReset(); create.mockReset();
  load.mockImplementation(async () => snapshot());
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


it("creates lazily, retains context across modes, and starts fresh after remount", async () => {
  send.mockResolvedValue({ data: "Saved response" });
  load.mockImplementation(async () => snapshot([message("Saved response")]));
  const user = userEvent.setup();
  const first = render(<ChatBubble />);
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  expect(screen.queryByRole("button", { name: "New conversation" })).not.toBeInTheDocument();
  expect(create).not.toHaveBeenCalled();
  expect(load).not.toHaveBeenCalled();
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
  expect(screen.queryByText("Saved response")).not.toBeInTheDocument();
  expect(create).toHaveBeenCalledTimes(1);
  await user.type(screen.getByRole("textbox"), "New session{Enter}");
  await waitFor(() => expect(send).toHaveBeenCalledTimes(3));
  expect(create.mock.calls[1][0]).not.toBe(firstId);
  expect(load.mock.calls.every(([id]) => Boolean(id))).toBe(true);
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
  expect(load).not.toHaveBeenCalled();
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
  expect(screen.queryByText("New account history")).not.toBeInTheDocument();
  expect(load).not.toHaveBeenCalled();
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
