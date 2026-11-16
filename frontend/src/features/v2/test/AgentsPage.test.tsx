import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AgentSessionContext,
  type AgentSessionContextValue,
} from "@/features/agent/agentSessionContext";
import AgentsPage from "../pages/AgentsPage";
import V2AgentChatBubble from "../components/V2AgentChatBubble";
import { renderWithProviders, resetTestSession } from "./testSupport";

const send = vi.fn().mockResolvedValue(true);

vi.mock("@/features/tasks/components/chat/ChatField", () => ({
  default: ({ disabled }: { disabled?: boolean }) => (
    <div data-testid="chat-field" data-disabled={String(Boolean(disabled))} />
  ),
}));

vi.mock("@/features/agent/useAgentNavigation", () => ({
  useAgentNavigation: () => ({
    activeConversationId: undefined,
    selectConversation: vi.fn(),
    startNewChat: vi.fn(),
    discardPromptOpen: false,
    confirmDiscard: vi.fn(),
    cancelDiscard: vi.fn(),
  }),
}));

vi.mock("@/features/agent/AgentHistoryList", () => ({
  AgentHistoryList: () => <div data-testid="agent-history" />,
}));

vi.mock("@/features/agent/AgentContextPanel", () => ({
  AgentContextPanel: () => <div data-testid="agent-context" />,
}));

vi.mock("@/features/agent/AgentActivityList", () => ({
  AgentActivityList: () => <div data-testid="agent-activity" />,
}));

vi.mock("@/features/agent/AgentDiscardDialog", () => ({
  AgentDiscardDialog: () => null,
}));

function buildSession(overrides: Record<string, unknown> = {}) {
  const chat = {
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
    send,
    ...overrides,
  };
  return {
    chat,
    draft: { text: "", files: [], proposalDrafts: {} },
    setDraft: vi.fn(),
    setProposalDraft: vi.fn(),
    clearDraft: vi.fn(),
    proposalSessions: new Map(),
  } as unknown as AgentSessionContextValue;
}

function renderWithSession(ui: React.ReactElement, session = buildSession()) {
  return renderWithProviders(
    <AgentSessionContext.Provider value={session}>
      {ui}
    </AgentSessionContext.Provider>,
    { initialEntries: ["/v2/agents"] },
  );
}

describe("V2 Agents page", () => {
  beforeEach(() => {
    resetTestSession();
    vi.clearAllMocks();
  });

  it("renders the workspace regions with one heading", () => {
    renderWithSession(<AgentsPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: /Your agent/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("agent-history")).toBeInTheDocument();
    expect(screen.getByTestId("agent-context")).toBeInTheDocument();
    expect(screen.getByTestId("agent-activity")).toBeInTheDocument();
    expect(screen.getByTestId("chat-field")).toBeInTheDocument();
  });

  it("disables the composer while the session is locked", () => {
    renderWithSession(<AgentsPage />, buildSession({ locked: true }));

    expect(screen.getByTestId("chat-field")).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });

  it("shows the unavailable state when the conversation cannot be loaded", () => {
    renderWithSession(
      <AgentsPage />,
      buildSession({ error: "Unable to load conversation", messages: [] }),
    );

    expect(
      screen.getByText(/This conversation is unavailable/i),
    ).toBeInTheDocument();
  });
});

describe("V2 assistant bubble", () => {
  beforeEach(() => {
    resetTestSession();
    vi.clearAllMocks();
  });

  it("is closed by default and toggles open on click", async () => {
    const user = userEvent.setup();
    renderWithSession(<V2AgentChatBubble />);

    const trigger = screen.getByRole("button", { name: "Open assistant" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByTestId("v2-assistant-panel")).not.toBeVisible();

    await user.click(trigger);

    expect(screen.getByTestId("v2-assistant-panel")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Open assistant" }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("chat-field")).toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    renderWithSession(<V2AgentChatBubble />);

    await user.click(screen.getByRole("button", { name: "Open assistant" }));
    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.getByTestId("v2-assistant-panel")).not.toBeVisible(),
    );
    expect(screen.getByRole("button", { name: "Open assistant" })).toHaveFocus();
  });

  it("renders the live chat session in the panel", async () => {
    const user = userEvent.setup();
    renderWithSession(<V2AgentChatBubble />, buildSession({ locked: true }));

    await user.click(screen.getByRole("button", { name: "Open assistant" }));

    expect(screen.getByTestId("chat-field")).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });
});
