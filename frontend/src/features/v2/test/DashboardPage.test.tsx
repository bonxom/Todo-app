import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Routes, Route, useLocation } from "react-router-dom";
import DashboardPage from "../pages/DashboardPage";
import { renderWithProviders, resetTestSession } from "./testSupport";
import {
  AgentSessionContext,
  type AgentSessionContextValue,
} from "@/features/agent/agentSessionContext";
import { taskService } from "@/shared/services/taskService";
import { statService } from "@/shared/services/statService";
import { projectService } from "@/shared/services/projectService";
import type {
  PaginatedResponse,
  ProjectWithSummary,
  Stat,
  Task,
} from "@/shared/types/domain";

vi.mock("@/shared/services/taskService");
vi.mock("@/shared/services/statService");
vi.mock("@/shared/services/projectService");

const createMockTask = (idNumber: number, overrides?: Partial<Task>): Task => ({
  _id: `507f1f77bcf86cd7994390${idNumber.toString().padStart(2, "0")}`,
  title: `Task #${idNumber}`,
  description: `Description for task ${idNumber}`,
  status: "pending",
  priority: "Medium",
  categoryId: { _id: "cat1", name: "Work" },
  projectId: {
    _id: "proj1",
    name: "Project Orbit",
    description: "",
    color: "#0284c7",
    status: "active",
  },
  startDate: "2026-11-14T08:00:00.000Z",
  dueDate: "2026-11-20T18:00:00.000Z",
  ...overrides,
});

const mockStats: Stat = {
  totalTasks: 42,
  completedTasks: 18,
  pendingTasks: 14,
  inProgressTasks: 10,
  givenUpTasks: 0,
  dailyStats: [],
};

const mockTasksPage1: PaginatedResponse<Task> = {
  data: Array.from({ length: 10 }, (_, i) => createMockTask(i + 1)),
  pageInfo: {
    pageNo: 1,
    pageSize: 10,
    totalCount: 15,
    totalPage: 2,
  },
};

const mockTasksPage2: PaginatedResponse<Task> = {
  data: Array.from({ length: 5 }, (_, i) => createMockTask(i + 11)),
  pageInfo: {
    pageNo: 2,
    pageSize: 10,
    totalCount: 15,
    totalPage: 2,
  },
};

const mockProjects: ProjectWithSummary[] = [
  {
    _id: "proj1",
    name: "Project Orbit",
    description: "Core V2 workspace",
    color: "#0284c7",
    status: "active",
    summary: {
      totalTasks: 10,
      finishedTasks: 6,
      pendingTasks: 2,
      inProgressTasks: 2,
      completedTasks: 6,
      givenUpTasks: 0,
      scheduledTasks: 8,
      canComplete: false,
      completionRate: 60,
    },
  },
];

describe("DashboardPage integration", () => {
  beforeEach(() => {
    resetTestSession();
    vi.clearAllMocks();
    vi.mocked(projectService.getAllProjects).mockResolvedValue(mockProjects);
  });

  it("renders global statistics and initial task list", async () => {
    vi.mocked(statService.getUserStats).mockResolvedValue(mockStats);
    vi.mocked(taskService.getAllTasks).mockResolvedValue(mockTasksPage1);

    renderWithProviders(<DashboardPage />);

    // Global stats
    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument(); // Total
      expect(screen.getByText("10")).toBeInTheDocument(); // In progress
      expect(screen.getByText("18")).toBeInTheDocument(); // Completed
    });

    // Task items
    expect(screen.getByText("Task #1")).toBeInTheDocument();
    expect(screen.getByText("Task #10")).toBeInTheDocument();
    expect(screen.getAllByText(/Work/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Project Orbit/i).length).toBeGreaterThan(0);
  });

  it("renders zero statistics as '0'", async () => {
    vi.mocked(statService.getUserStats).mockResolvedValue({
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      inProgressTasks: 0,
      givenUpTasks: 0,
      dailyStats: [],
    });
    vi.mocked(taskService.getAllTasks).mockResolvedValue({
      data: [],
      pageInfo: { pageNo: 1, pageSize: 10, totalCount: 0, totalPage: 0 },
    });

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      const zeros = screen.getAllByText("0");
      expect(zeros.length).toBeGreaterThanOrEqual(3);
    });
  });

  it("submits search with Enter and resets page to 1", async () => {
    vi.mocked(statService.getUserStats).mockResolvedValue(mockStats);
    vi.mocked(taskService.getAllTasks).mockResolvedValue(mockTasksPage1);
    const user = userEvent.setup();

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Task #1")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search tasks/i);
    await user.type(searchInput, "  report  {Enter}");

    await waitFor(() => {
      expect(taskService.getAllTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          search: "report",
          pageNo: 1,
        }),
        expect.anything(),
      );
    });
  });

  it("changes status filter and resets page to 1", async () => {
    vi.mocked(statService.getUserStats).mockResolvedValue(mockStats);
    vi.mocked(taskService.getAllTasks).mockResolvedValue(mockTasksPage1);
    const user = userEvent.setup();

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Task #1")).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText(/Filter by status/i);
    await user.selectOptions(statusSelect, "in-progress");

    await waitFor(() => {
      expect(taskService.getAllTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "in-progress",
          pageNo: 1,
        }),
        expect.anything(),
      );
    });
  });

  it("navigates pagination next and previous", async () => {
    vi.mocked(statService.getUserStats).mockResolvedValue(mockStats);
    vi.mocked(taskService.getAllTasks)
      .mockResolvedValueOnce(mockTasksPage1)
      .mockResolvedValueOnce(mockTasksPage2);
    const user = userEvent.setup();

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Task #1")).toBeInTheDocument();
    });

    const nextBtn = screen.getByRole("button", { name: /Next/i });
    expect(nextBtn).toBeEnabled();
    const prevBtn = screen.getByRole("button", { name: /Previous/i });
    expect(prevBtn).toBeDisabled();

    await user.click(nextBtn);

    await waitFor(() => {
      expect(taskService.getAllTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          pageNo: 2,
        }),
        expect.anything(),
      );
    });
  });

  it("renders empty state when there are no tasks", async () => {
    vi.mocked(statService.getUserStats).mockResolvedValue({
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      inProgressTasks: 0,
      givenUpTasks: 0,
      dailyStats: [],
    });
    vi.mocked(taskService.getAllTasks).mockResolvedValue({
      data: [],
      pageInfo: { pageNo: 1, pageSize: 10, totalCount: 0, totalPage: 0 },
    });

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/No tasks yet/i)).toBeInTheDocument();
      expect(
        screen.getAllByRole("button", { name: "New task" }).length,
      ).toBeGreaterThan(0);
      expect(
        screen.queryByRole("link", { name: /V1/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("renders filtered empty state with clear filters action", async () => {
    vi.mocked(statService.getUserStats).mockResolvedValue(mockStats);
    vi.mocked(taskService.getAllTasks)
      .mockResolvedValueOnce(mockTasksPage1)
      .mockResolvedValueOnce({
        data: [],
        pageInfo: { pageNo: 1, pageSize: 10, totalCount: 0, totalPage: 0 },
      });
    const user = userEvent.setup();

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Task #1")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search tasks/i);
    await user.type(searchInput, "nonexistent{Enter}");

    await waitFor(() => {
      expect(screen.getByText(/No matching tasks/i)).toBeInTheDocument();
    });

    const clearBtn = screen.getByRole("button", { name: /Clear filters/i });
    await user.click(clearBtn);

    await waitFor(() => {
      expect(taskService.getAllTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          search: undefined,
          status: undefined,
          pageNo: 1,
        }),
        expect.anything(),
      );
    });
  });

  it("renders tasks error with retry while statistics stay usable", async () => {
    vi.mocked(statService.getUserStats).mockResolvedValue(mockStats);
    vi.mocked(taskService.getAllTasks).mockRejectedValueOnce(
      new Error("Network error loading tasks"),
    );

    renderWithProviders(<DashboardPage />);

    // Statistics remain usable
    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    // Task list shows error and retry
    expect(screen.getByText(/Failed to load tasks/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
  });

  it("renders Today's Focus, Projects Rail filtering, and Chat Now handoff to /v2/agents", async () => {
    vi.mocked(statService.getUserStats).mockResolvedValue(mockStats);
    vi.mocked(taskService.getAllTasks).mockResolvedValue(mockTasksPage1);
    const send = vi.fn().mockResolvedValue(true);
    const resetConversation = vi.fn().mockReturnValue(true);
    const session = {
      chat: {
        messages: [],
        sending: false,
        loading: false,
        pending: null,
        error: null,
        locked: false,
        conversationId: undefined,
        activities: [],
        context: null,
        discardRequest: false,
        resolveDiscard: vi.fn(),
        resetConversation,
        send,
      },
      draft: { text: "", files: [], proposalDrafts: {} },
      setDraft: vi.fn(),
      setProposalDraft: vi.fn(),
      clearDraft: vi.fn(),
      proposalSessions: new Map(),
    } as unknown as AgentSessionContextValue;

    function AgentsProbe() {
      const location = useLocation();
      return (
        <div
          data-testid="agents-route-probe"
          data-handoff={String(Boolean(location.state?.assistantHandoff))}
          data-transition={String(location.state?.entryTransition || "")}
        />
      );
    }

    const user = userEvent.setup();
    renderWithProviders(
      <AgentSessionContext.Provider value={session}>
        <Routes>
          <Route path="/v2/dashboard" element={<DashboardPage />} />
          <Route path="/v2/agents" element={<AgentsProbe />} />
        </Routes>
      </AgentSessionContext.Provider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("v2-dashboard-focus")).toBeInTheDocument();
      expect(screen.getByTestId("v2-dashboard-chat-now")).toBeInTheDocument();
      expect(
        screen.getByTestId("v2-dashboard-projects-rail"),
      ).toBeInTheDocument();
    });

    // Click project in rail to filter tasks by projectId
    const projectBtn = await screen.findByRole("button", {
      name: /Project Orbit.*6\/10/i,
    });
    await user.click(projectBtn);

    await waitFor(() => {
      expect(taskService.getAllTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: "proj1",
          pageNo: 1,
        }),
        expect.anything(),
      );
    });

    // Type message into Chat Now and submit -> sends message & navigates to /v2/agents
    const chatInput = screen.getByPlaceholderText(
      /Ask Orbit Agent anything|Hỏi Orbit Agent/i,
    );
    await user.type(chatInput, "Plan my afternoon focus{Enter}");

    await waitFor(() => {
      expect(resetConversation).toHaveBeenCalledWith("proj1");
      expect(send).toHaveBeenCalledWith("Plan my afternoon focus");
      expect(screen.getByTestId("agents-route-probe")).toHaveAttribute(
        "data-handoff",
        "true",
      );
      expect(screen.getByTestId("agents-route-probe")).toHaveAttribute(
        "data-transition",
        "zoom-out",
      );
    });
  });
});
