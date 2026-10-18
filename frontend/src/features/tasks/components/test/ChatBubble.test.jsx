import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import ChatBubble from "../chat";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("../../api/aiMutations", () => ({
  useAgenticChatMutation: () => ({ mutateAsync: send }),
  useGenerateTasksMutation: () => ({ mutateAsync: vi.fn() }),
}));

beforeEach(() => {
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
