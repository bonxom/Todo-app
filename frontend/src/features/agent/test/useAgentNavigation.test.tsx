import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { aiService } from "@/shared/services/aiService";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { AgentSessionProvider } from "../AgentSessionProvider";
import { useAgentSession } from "../agentSessionContext";
import { useAgentNavigation } from "../useAgentNavigation";

vi.mock("@/shared/services/aiService", () => ({
  aiService: {
    getConversation: vi.fn().mockImplementation((id?: string) =>
      Promise.resolve({
        conversationId: id || "conv-default",
        title: "Test Conversation",
        before: null,
        messages: [],
        mode: "auto",
        pending: [],
      }),
    ),
    getConversationCapabilities: vi
      .fn()
      .mockResolvedValue({ taskProposals: true }),
    createConversation: vi.fn().mockResolvedValue("conv-created"),
    listConversations: vi.fn().mockResolvedValue([]),
    applyProposalAction: vi.fn(),
  },
}));

vi.mock("@/features/tasks/api/aiMutations", () => ({
  useAgenticChatMutation: () => ({ mutateAsync: vi.fn() }),
  useGenerateTasksMutation: () => ({ mutateAsync: vi.fn() }),
}));

function NavigationTestComponent() {
  const { chat, draft, setDraft } = useAgentSession();
  const {
    selectConversation,
    startNewChat,
    discardPromptOpen,
    confirmDiscard,
    cancelDiscard,
    activeConversationId,
  } = useAgentNavigation();

  return (
    <div>
      <div data-testid="active-conv">{activeConversationId || "none"}</div>
      <div data-testid="chat-conv">{chat.conversationId || "none"}</div>
      <div data-testid="draft-text">{draft.text}</div>
      <button
        type="button"
        onClick={() => setDraft((d) => ({ ...d, text: "Unsaved text" }))}
      >
        Set Draft
      </button>
      <button type="button" onClick={() => selectConversation("conv-target")}>
        Select Target
      </button>
      <button type="button" onClick={() => startNewChat()}>
        New Chat
      </button>
      {discardPromptOpen && (
        <div data-testid="discard-dialog">
          <p>Discard unsaved draft?</p>
          <button type="button" onClick={confirmDiscard}>
            Confirm Discard
          </button>
          <button type="button" onClick={cancelDiscard}>
            Cancel Discard
          </button>
        </div>
      )}
    </div>
  );
}

describe("useAgentNavigation hook", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it("blocks Back between conversations until discard is confirmed", async () => {
    const router = createMemoryRouter(
      [
        {
          path: "/agent",
          element: (
            <QueryClientProvider client={queryClient}>
              <AgentSessionProvider>
                <NavigationTestComponent />
              </AgentSessionProvider>
            </QueryClientProvider>
          ),
        },
      ],
      {
        initialEntries: [
          "/agent?conversation=conv-1",
          "/agent?conversation=conv-2",
        ],
        initialIndex: 1,
      },
    );
    render(<RouterProvider router={router} />);
    await waitFor(() =>
      expect(screen.getByTestId("chat-conv")).toHaveTextContent("conv-2"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Set Draft" }));
    await act(async () => {
      await router.navigate(-1);
    });
    expect(screen.getByTestId("discard-dialog")).toBeInTheDocument();
    expect(router.state.location.search).toContain("conv-2");
    fireEvent.click(screen.getByRole("button", { name: "Cancel Discard" }));
    expect(screen.getByTestId("draft-text")).toHaveTextContent("Unsaved text");
    await act(async () => {
      await router.navigate(-1);
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Discard" }));
    await waitFor(() =>
      expect(screen.getByTestId("chat-conv")).toHaveTextContent("conv-1"),
    );
    expect(router.state.location.search).toContain("conv-1");
    expect(screen.getByTestId("draft-text")).toHaveTextContent("");
  });

  it("selects conversation directly when no draft exists", async () => {
    const router = createMemoryRouter(
      [
        {
          path: "/agent",
          element: (
            <QueryClientProvider client={queryClient}>
              <AgentSessionProvider>
                <NavigationTestComponent />
              </AgentSessionProvider>
            </QueryClientProvider>
          ),
        },
      ],
      { initialEntries: ["/agent"] },
    );

    render(<RouterProvider router={router} />);
    await waitFor(() => {
      expect(screen.getByTestId("chat-conv")).toHaveTextContent("conv-default");
    });

    const selectBtn = screen.getByRole("button", { name: "Select Target" });
    await act(async () => {
      fireEvent.click(selectBtn);
    });

    expect(screen.queryByTestId("discard-dialog")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.search).toContain(
        "conversation=conv-target",
      );
      expect(
        vi
          .mocked(aiService.getConversation)
          .mock.calls.filter(([id]) => id === "conv-target"),
      ).toHaveLength(1);
    });
  });

  it("prompts discard confirmation when draft exists on selectConversation", async () => {
    const router = createMemoryRouter(
      [
        {
          path: "/agent",
          element: (
            <QueryClientProvider client={queryClient}>
              <AgentSessionProvider>
                <NavigationTestComponent />
              </AgentSessionProvider>
            </QueryClientProvider>
          ),
        },
      ],
      { initialEntries: ["/agent"] },
    );

    render(<RouterProvider router={router} />);
    await waitFor(() => {
      expect(screen.getByTestId("chat-conv")).toHaveTextContent("conv-default");
    });

    // Add draft
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Set Draft" }));
    });
    expect(screen.getByTestId("draft-text")).toHaveTextContent("Unsaved text");

    // Try selecting another conversation
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Select Target" }));
    });

    // Discard dialog is opened
    expect(screen.getByTestId("discard-dialog")).toBeInTheDocument();
    // URL has not changed yet
    expect(router.state.location.search).not.toContain(
      "conversation=conv-target",
    );

    // Cancel discard
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cancel Discard" }));
    });

    expect(screen.queryByTestId("discard-dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("draft-text")).toHaveTextContent("Unsaved text");
    expect(router.state.location.search).not.toContain(
      "conversation=conv-target",
    );

    // Try selecting again and confirm discard
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Select Target" }));
    });
    expect(screen.getByTestId("discard-dialog")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm Discard" }));
    });

    expect(screen.queryByTestId("discard-dialog")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.search).toContain(
        "conversation=conv-target",
      );
      expect(
        vi
          .mocked(aiService.getConversation)
          .mock.calls.filter(([id]) => id === "conv-target"),
      ).toHaveLength(1);
    });
  });

  it("prompts discard confirmation when draft exists on startNewChat", async () => {
    const router = createMemoryRouter(
      [
        {
          path: "/agent",
          element: (
            <QueryClientProvider client={queryClient}>
              <AgentSessionProvider>
                <NavigationTestComponent />
              </AgentSessionProvider>
            </QueryClientProvider>
          ),
        },
      ],
      { initialEntries: ["/agent?conversation=conv-1"] },
    );

    render(<RouterProvider router={router} />);
    await waitFor(() => {
      expect(screen.getByTestId("chat-conv")).toHaveTextContent("conv-1");
    });

    // Add draft
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Set Draft" }));
    });

    // Try New Chat
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "New Chat" }));
    });

    expect(screen.getByTestId("discard-dialog")).toBeInTheDocument();

    // Confirm discard
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm Discard" }));
    });

    expect(screen.queryByTestId("discard-dialog")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/agent");
      expect(router.state.location.search).toBe("?conversation=conv-created");
    });
  });
});
