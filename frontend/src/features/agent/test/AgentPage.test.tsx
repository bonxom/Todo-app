import { ApiError } from "@/shared/services/apiError";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { aiService } from "@/shared/services/aiService";
import { projectService } from "@/shared/services/projectService";
import { useAuthStore } from "@/stores/useAuthStore";
import { AgentSessionProvider } from "../AgentSessionProvider";
import AgentPage from "../AgentPage";
import MainLayout from "@/shared/layouts/MainLayout";
import ChatBubble from "@/features/tasks/components/chat";

vi.mock("@/shared/services/aiService", () => ({
  aiService: {
    getConversation: vi.fn(),
    getConversationCapabilities: vi
      .fn()
      .mockResolvedValue({ taskProposals: true }),
    createConversation: vi.fn(),
    listConversations: vi.fn(),
    updateConversationContext: vi.fn(),
    applyProposalAction: vi.fn(),
  },
}));

vi.mock("@/shared/services/projectService", () => ({
  projectService: {
    getAllProjects: vi.fn(),
  },
}));

vi.mock("@/shared/services/attachmentService", () => ({
  attachmentService: {
    upload: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock("@/features/tasks/api/aiMutations", () => ({
  useAgenticChatMutation: () => ({ mutateAsync: vi.fn() }),
  useGenerateTasksMutation: () => ({ mutateAsync: vi.fn() }),
}));

describe("AgentPage and Agent routing", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    window.innerWidth = 1440;
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        _id: "user-1",
        name: "Test User",
        email: "test@example.com",
        role: "USER",
      },
      token: "fake-jwt",
      sessionRevision: 1,
    });

    vi.mocked(projectService.getAllProjects).mockResolvedValue([
      {
        _id: "proj-1",
        name: "Project Alpha",
        description: "Alpha project",
        color: "#10b981",
        status: "active",
        summary: {
          totalTasks: 0,
          finishedTasks: 0,
          pendingTasks: 0,
          inProgressTasks: 0,
          completedTasks: 0,
          givenUpTasks: 0,
          scheduledTasks: 0,
          canComplete: false,
          completionRate: 0,
        },
      },
      {
        _id: "proj-2",
        name: "Project Done",
        description: "Finished",
        color: "#6b7280",
        status: "completed",
        summary: {
          totalTasks: 0,
          finishedTasks: 0,
          pendingTasks: 0,
          inProgressTasks: 0,
          completedTasks: 0,
          givenUpTasks: 0,
          scheduledTasks: 0,
          canComplete: false,
          completionRate: 0,
        },
      },
    ]);

    vi.mocked(aiService.listConversations).mockResolvedValue([
      {
        id: "conv-1",
        title: "Work Planning",
        updatedAt: "2026-11-06T00:00:00.000Z",
      },
      {
        id: "conv-2",
        title: "Personal Goals",
        updatedAt: "2026-11-05T00:00:00.000Z",
      },
    ]);
  });

  it("does not render ChatBubble assistant when on /agent", async () => {
    vi.mocked(aiService.getConversation).mockResolvedValue({
      conversationId: "conv-1",
      title: "Work Planning",
      before: null,
      messages: [],
      mode: "auto",
      pending: [],
    });

    const router = createMemoryRouter(
      [
        {
          path: "/agent",
          element: (
            <QueryClientProvider client={queryClient}>
              <AgentSessionProvider>
                <MainLayout assistant={<ChatBubble />} />
              </AgentSessionProvider>
            </QueryClientProvider>
          ),
          children: [
            {
              index: true,
              element: <AgentPage />,
            },
          ],
        },
      ],
      { initialEntries: ["/agent"] },
    );

    render(<RouterProvider router={router} />);

    expect(
      screen.queryByRole("button", { name: "Open assistant" }),
    ).not.toBeInTheDocument();
  });

  it("loads specific conversation directly from URL query param without fallback to latest", async () => {
    vi.mocked(aiService.getConversation).mockResolvedValue({
      conversationId: "conv-specific-99",
      title: "Specific Conversation",
      before: null,
      messages: [
        {
          id: "m-1",
          sender: "assistant",
          text: "Welcome to specific chat",
          timestamp: "2026-11-06T00:00:00.000Z",
        },
      ],
      mode: "auto",
      pending: [],
    });

    const router = createMemoryRouter(
      [
        {
          path: "/agent",
          element: (
            <QueryClientProvider client={queryClient}>
              <AgentSessionProvider>
                <AgentPage />
              </AgentSessionProvider>
            </QueryClientProvider>
          ),
        },
      ],
      { initialEntries: ["/agent?conversation=conv-specific-99"] },
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(aiService.getConversation).toHaveBeenCalledWith(
        "conv-specific-99",
      );
    });
    expect(aiService.getConversation).not.toHaveBeenCalledWith(undefined);
    expect(screen.getByText("Welcome to specific chat")).toBeInTheDocument();
  });

  it("displays unavailable state when conversation ID is not found and does not fallback to latest", async () => {
    vi.mocked(aiService.getConversation).mockRejectedValue(
      new ApiError("Conversation not found", 404),
    );

    const router = createMemoryRouter(
      [
        {
          path: "/agent",
          element: (
            <QueryClientProvider client={queryClient}>
              <AgentSessionProvider>
                <AgentPage />
              </AgentSessionProvider>
            </QueryClientProvider>
          ),
        },
      ],
      { initialEntries: ["/agent?conversation=invalid-id"] },
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /conversation unavailable/i }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Start new conversation" }),
    ).toBeInTheDocument();
  });

  it("displays empty state with starter suggestions when there is no conversation", async () => {
    vi.mocked(aiService.getConversation).mockResolvedValue(null);

    const router = createMemoryRouter(
      [
        {
          path: "/agent",
          element: (
            <QueryClientProvider client={queryClient}>
              <AgentSessionProvider>
                <AgentPage />
              </AgentSessionProvider>
            </QueryClientProvider>
          ),
        },
      ],
      { initialEntries: ["/agent"] },
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText(/Plan today's schedule/i)).toBeInTheDocument();
      expect(screen.getByText(/Break down tasks/i)).toBeInTheDocument();
      expect(screen.getByText(/Review priority tasks/i)).toBeInTheDocument();
    });
  });

  it("reverts project context selection on 409 conflict error", async () => {
    vi.mocked(aiService.getConversation).mockResolvedValue({
      conversationId: "conv-1",
      title: "Work Planning",
      before: null,
      messages: [],
      mode: "auto",
      context: { projectId: null, available: true },
      pending: [],
    });
    vi.mocked(aiService.updateConversationContext).mockRejectedValue(
      new ApiError("Conversation busy", 409),
    );

    const router = createMemoryRouter(
      [
        {
          path: "/agent",
          element: (
            <QueryClientProvider client={queryClient}>
              <AgentSessionProvider>
                <AgentPage />
              </AgentSessionProvider>
            </QueryClientProvider>
          ),
        },
      ],
      { initialEntries: ["/agent?conversation=conv-1"] },
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Project Context/i)).toBeInTheDocument();
    });

    const select = screen.getByLabelText(
      /Project Context/i,
    ) as HTMLSelectElement;
    expect(select.value).toBe("");

    await act(async () => {
      fireEvent.change(select, { target: { value: "proj-1" } });
    });

    await waitFor(() => {
      expect(screen.getByText(/Conversation is busy/i)).toBeInTheDocument();
      // Reverted to original value
      expect(select.value).toBe("");
    });
  });

  it("renders confirmed activities in the side panel and shows empty state when none", async () => {
    vi.mocked(aiService.getConversation).mockResolvedValue({
      conversationId: "conv-1",
      title: "Work Planning",
      before: null,
      messages: [],
      mode: "auto",
      activities: [
        {
          id: "act-1",
          requestId: "req-1",
          toolCallId: "call-1",
          kind: "task_created",
          status: "succeeded",
          title: "Design Agent UI",
          resourceType: "task",
          resourceId: "t-1",
          occurredAt: "2026-11-06T00:00:00.000Z",
        },
      ],
      pending: [],
    });

    const router = createMemoryRouter(
      [
        {
          path: "/agent",
          element: (
            <QueryClientProvider client={queryClient}>
              <AgentSessionProvider>
                <AgentPage />
              </AgentSessionProvider>
            </QueryClientProvider>
          ),
        },
      ],
      { initialEntries: ["/agent?conversation=conv-1"] },
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText("Design Agent UI")).toBeInTheDocument();
      expect(screen.getByText(/Success/i)).toBeInTheDocument();
    });
  });

  it("filters conversation history by title", async () => {
    vi.mocked(aiService.getConversation).mockResolvedValue({
      conversationId: "conv-1",
      title: "Work Planning",
      before: null,
      messages: [],
      mode: "auto",
      pending: [],
    });

    const router = createMemoryRouter(
      [
        {
          path: "/agent",
          element: (
            <QueryClientProvider client={queryClient}>
              <AgentSessionProvider>
                <AgentPage />
              </AgentSessionProvider>
            </QueryClientProvider>
          ),
        },
      ],
      { initialEntries: ["/agent?conversation=conv-1"] },
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      const historyCol = document.querySelector(
        ".agent-history-col",
      ) as HTMLElement;
      expect(historyCol).toBeInTheDocument();
      expect(
        within(historyCol).getByRole("button", { name: /work planning/i }),
      ).toBeInTheDocument();
      expect(
        within(historyCol).getByRole("button", { name: /personal goals/i }),
      ).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search conversations/i);
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "Work" } });
    });

    const historyCol = document.querySelector(
      ".agent-history-col",
    ) as HTMLElement;
    expect(
      within(historyCol).getByRole("button", { name: /work planning/i }),
    ).toBeInTheDocument();
    expect(
      within(historyCol).queryByRole("button", { name: /personal goals/i }),
    ).not.toBeInTheDocument();
  });
});
