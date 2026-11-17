import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AgentSessionContext,
  type AgentSessionContextValue,
} from "@/features/agent/agentSessionContext";
import V2AgentChatBubble from "../components/V2AgentChatBubble";
import { renderWithProviders, resetTestSession } from "./testSupport";

const newConversation = vi.fn().mockResolvedValue(true);
const openConversation = vi.fn().mockResolvedValue(true);

vi.mock("@/features/tasks/components/chat/ChatField", () => ({
  default: ({ disabled }: { disabled?: boolean }) => (
    <div data-testid="chat-field" data-disabled={String(Boolean(disabled))} />
  ),
}));

vi.mock("@/features/tasks/components/chat/RecentConversations", () => ({
  default: ({ onOpen }: { onOpen: (id: string) => void }) => (
    <button type="button" onClick={() => onOpen("conversation-2")}>
      recent conversation
    </button>
  ),
}));

function buildSession(): AgentSessionContextValue {
  return {
    chat: {
      messages: [],
      sending: false,
      loading: false,
      pending: null,
      error: null,
      locked: false,
      conversationId: "conversation-1",
      activities: [],
      context: null,
      discardRequest: false,
      resolveDiscard: vi.fn(),
      send: vi.fn(),
      newConversation,
      openConversation,
    },
    draft: { text: "", files: [], proposalDrafts: {} },
    setDraft: vi.fn(),
    setProposalDraft: vi.fn(),
    clearDraft: vi.fn(),
    proposalSessions: new Map(),
  } as unknown as AgentSessionContextValue;
}

function renderBubble(onDockChange?: (open: boolean, width: number) => void) {
  return renderWithProviders(
    <AgentSessionContext.Provider value={buildSession()}>
      <V2AgentChatBubble onDockChange={onDockChange} />
    </AgentSessionContext.Provider>,
    { initialEntries: ["/v2/dashboard"] },
  );
}

describe("V2 assistant bubble modes", () => {
  beforeEach(() => {
    resetTestSession();
    vi.clearAllMocks();
  });

  it("opens with the chat actions and switches directly between compact and docked", async () => {
    const user = userEvent.setup();
    const { container } = renderBubble();

    await user.click(screen.getByRole("button", { name: "Open assistant" }));

    expect(
      screen.getByRole("button", { name: "New chat" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "History" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open in Agents" }),
    ).toBeInTheDocument();

    const shell = container.querySelector(".v2-assistant");
    expect(shell).toHaveAttribute("data-mode", "compact");

    expect(
      screen.queryByRole("button", { name: "Expand chat" }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Dock chat to the side" }),
    );
    expect(shell).toHaveAttribute("data-mode", "docked");
    expect(screen.getByRole("separator")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Compact chat" }));
    expect(shell).toHaveAttribute("data-mode", "compact");
  });

  it("resizes the docked panel from the keyboard and closes below the minimum", async () => {
    const user = userEvent.setup();
    const { container } = renderBubble();

    await user.click(screen.getByRole("button", { name: "Open assistant" }));
    await user.click(
      screen.getByRole("button", { name: "Dock chat to the side" }),
    );

    const handle = screen.getByRole("separator");
    handle.focus();
    await user.keyboard("{ArrowLeft}");
    expect(handle).toHaveAttribute("aria-valuenow", "452");

    for (let index = 0; index < 6; index += 1) {
      await user.keyboard("{ArrowRight}");
    }
    await waitFor(() =>
      expect(screen.getByTestId("v2-assistant-panel")).not.toBeVisible(),
    );
    expect(container.querySelector(".v2-assistant")).toHaveAttribute(
      "data-mode",
      "compact",
    );
  });

  it("starts a new conversation and opens history entries", async () => {
    const user = userEvent.setup();
    renderBubble();

    await user.click(screen.getByRole("button", { name: "Open assistant" }));

    await user.click(screen.getByRole("button", { name: "New chat" }));
    expect(newConversation).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "History" }));
    expect(screen.getByText("recent conversation")).toBeInTheDocument();

    await user.click(screen.getByText("recent conversation"));
    expect(openConversation).toHaveBeenCalledWith("conversation-2");
  });

  it("reports the docked state so the shell can make room", async () => {
    const user = userEvent.setup();
    const onDockChange = vi.fn();
    renderBubble(onDockChange);

    await user.click(screen.getByRole("button", { name: "Open assistant" }));
    expect(onDockChange).toHaveBeenLastCalledWith(false, 420);

    await user.click(
      screen.getByRole("button", { name: "Dock chat to the side" }),
    );
    expect(onDockChange).toHaveBeenLastCalledWith(true, 420);

    await user.keyboard("{Escape}");
    expect(onDockChange).toHaveBeenLastCalledWith(false, 420);
  });

  it("closes the history popover before the panel on Escape", async () => {
    const user = userEvent.setup();
    renderBubble();

    await user.click(screen.getByRole("button", { name: "Open assistant" }));
    await user.click(screen.getByRole("button", { name: "History" }));
    expect(screen.getByText("recent conversation")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByText("recent conversation")).not.toBeInTheDocument();
    expect(screen.getByTestId("v2-assistant-panel")).toBeVisible();

    await user.keyboard("{Escape}");
    expect(screen.getByTestId("v2-assistant-panel")).not.toBeVisible();
  });
});

it("Escape from docked reopens as compact and restores the launcher focus", async () => {
  resetTestSession();
  const user = userEvent.setup();
  const { container } = renderBubble();
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  await user.click(
    screen.getByRole("button", { name: "Dock chat to the side" }),
  );
  await user.keyboard("{Escape}");
  await expect(
    screen.getByRole("button", { name: "Open assistant" }),
  ).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "Open assistant" }));
  expect(container.querySelector(".v2-assistant")).toHaveAttribute(
    "data-mode",
    "compact",
  );
});
