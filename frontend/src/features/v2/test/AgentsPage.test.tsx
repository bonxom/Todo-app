import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { aiService } from "@/shared/services/aiService";
import {
  AgentSessionContext,
  type AgentSessionContextValue,
} from "@/features/agent/agentSessionContext";
import AgentsPage from "../pages/AgentsPage";
import V2AgentChatBubble from "../components/V2AgentChatBubble";
import { renderWithProviders, resetTestSession } from "./testSupport";

const send = vi.fn().mockResolvedValue(true);

vi.mock("@/features/tasks/components/chat/ChatField", () => ({
  default: ({
    disabled,
    avatarAppearance = "default",
  }: {
    disabled?: boolean;
    avatarAppearance?: string;
  }) => (
    <div
      data-testid="chat-field"
      data-disabled={String(Boolean(disabled))}
      data-avatar-appearance={avatarAppearance}
    />
  ),
}));

let mockActiveConversationId: string | undefined = "conversation-1";

vi.mock("@/features/agent/useAgentNavigation", () => ({
  useAgentNavigation: () => ({
    activeConversationId: mockActiveConversationId,
    selectConversation: vi.fn(),
    startNewChat: vi.fn(),
    discardPromptOpen: false,
    confirmDiscard: vi.fn(),
    cancelDiscard: vi.fn(),
  }),
}));

vi.mock("@/features/tasks/api/projectQueries", () => ({
  useProjectsQuery: () => ({ data: [], status: "success" }),
}));

vi.mock("@/shared/services/aiService", () => ({
  aiService: {
    listConversations: vi.fn().mockResolvedValue([]),
    listConversationsPage: vi.fn().mockResolvedValue({
      items: [],
      nextCursor: null,
      hasMore: false,
    }),
  },
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
    mockActiveConversationId = "conversation-1";
  });

  it("renders the workspace with history and no context panel", () => {
    renderWithSession(<AgentsPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Agents" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recent" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Projects" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Context and activity" }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("chat-field")).toBeInTheDocument();
    expect(screen.getByTestId("chat-field")).toHaveAttribute(
      "data-avatar-appearance",
      "default",
    );
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

  it("immediately switches from starter stage to active zoom-out stage while sending first turn", () => {
    mockActiveConversationId = undefined;
    renderWithSession(
      <AgentsPage />,
      buildSession({
        conversationId: undefined,
        messages: [],
        sending: true,
      }),
    );

    const center = screen.getByRole("region", { name: "Agent conversation" });
    expect(center).toHaveAttribute("data-chat-stage", "active");
  });

  it("lazy loads more conversations on scroll and retries continuation failures", async () => {
    class MockObserver {
      static instances: MockObserver[] = [];
      callback: IntersectionObserverCallback;
      elements: Element[] = [];
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
        MockObserver.instances.push(this);
      }
      observe = (el: Element) => {
        this.elements.push(el);
      };
      disconnect = () => {
        this.elements = [];
      };
      trigger(isIntersecting: boolean) {
        if (this.elements.length === 0) return;
        this.callback(
          [
            { isIntersecting, target: this.elements[0] },
          ] as IntersectionObserverEntry[],
          this as unknown as IntersectionObserver,
        );
      }
    }
    vi.stubGlobal("IntersectionObserver", MockObserver);

    vi.mocked(aiService.listConversationsPage)
      .mockResolvedValueOnce({
        items: [
          {
            id: "conv-1",
            title: "First batch chat",
            updatedAt: "2026-11-25T10:00:00.000Z",
            projectId: null,
          },
        ],
        nextCursor: "next-cursor-1",
        hasMore: true,
      })
      .mockRejectedValueOnce(new Error("Network glitch"))
      .mockResolvedValueOnce({
        items: [
          {
            id: "conv-2",
            title: "Second batch chat",
            updatedAt: "2026-11-24T10:00:00.000Z",
            projectId: null,
          },
        ],
        nextCursor: null,
        hasMore: false,
      });

    try {
      const user = userEvent.setup();
      renderWithSession(<AgentsPage />);

      await waitFor(() => {
        expect(screen.getByText("First batch chat")).toBeInTheDocument();
      });

      const observer = MockObserver.instances.at(-1)!;
      act(() => {
        observer.trigger(true);
      });

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Try again" }),
        ).toBeInTheDocument();
      });
      expect(screen.getByText("First batch chat")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Try again" }));

      await waitFor(() => {
        expect(screen.getByText("Second batch chat")).toBeInTheDocument();
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("V2 assistant bubble", () => {
  beforeEach(() => {
    resetTestSession();
    vi.clearAllMocks();
    mockActiveConversationId = "conversation-1";
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
    expect(screen.getByTestId("chat-field")).toHaveAttribute(
      "data-avatar-appearance",
      "default",
    );
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    renderWithSession(<V2AgentChatBubble />);

    await user.click(screen.getByRole("button", { name: "Open assistant" }));
    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.getByTestId("v2-assistant-panel")).not.toBeVisible(),
    );
    expect(
      screen.getByRole("button", { name: "Open assistant" }),
    ).toHaveFocus();
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
