import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { MemoryRouter, Routes, Route, Link } from "react-router-dom";
import { AuthCacheBoundary } from "@/app/AuthCacheBoundary";
import { useAuthStore } from "@/stores/useAuthStore";
import { taskKeys } from "@/features/tasks/api/taskKeys";
import { useStartTaskMutation } from "@/features/tasks/api/taskMutations";
import { taskService } from "@/shared/services/taskService";
import type { Task, PaginatedResponse } from "@/shared/types/domain";
import { createDeferred } from "./testSupport";

vi.mock("@/shared/services/taskService");

const sampleTask: Task = {
  _id: "507f1f77bcf86cd799439099",
  title: "Shared Session Task",
  status: "pending",
  priority: "Medium",
  categoryId: null,
  projectId: null,
  startDate: "2026-11-14T08:00:00.000Z",
};

function V1Consumer() {
  const { data } = useQuery({
    queryKey: taskKeys.list({}),
    queryFn: () => taskService.getAllTasks({}),
  });

  return (
    <div>
      <h2 data-testid="v1-view">V1 View</h2>
      <div data-testid="v1-tasks">
        {data?.data?.map((t) => (
          <span key={t._id} data-testid={`task-${t._id}`}>
            {t.title} - {t.status}
          </span>
        ))}
      </div>
      <Link to="/v2/dashboard">Switch to V2</Link>
    </div>
  );
}

function V2Consumer() {
  const { data } = useQuery({
    queryKey: taskKeys.list({}),
    queryFn: () => taskService.getAllTasks({}),
  });

  const startMutation = useStartTaskMutation();

  return (
    <div>
      <h2 data-testid="v2-view">V2 View</h2>
      <div data-testid="v2-tasks">
        {data?.data?.map((t) => (
          <div key={t._id}>
            <span>
              {t.title} - {t.status}
            </span>
            {t.status === "pending" && (
              <button
                type="button"
                onClick={() => startMutation.mutateAsync(t._id)}
              >
                Start in V2
              </button>
            )}
          </div>
        ))}
      </div>
      <Link to="/dashboard">Switch to V1</Link>
    </div>
  );
}

describe("session continuity and cache integrity", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    useAuthStore.getState().clearSession();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: 60_000 },
        mutations: { retry: false },
      },
    });
  });

  it("shares query cache across V1 and V2 route transitions without refetching", async () => {
    useAuthStore.getState().setSession({
      accessToken: "token-user-a",
      user: {
        id: "user-a",
        email: "a@example.com",
        name: "User A",
        role: "USER",
      },
    });
    useAuthStore.getState().setAuthReady(true);

    vi.mocked(taskService.getAllTasks).mockResolvedValueOnce({
      data: [sampleTask],
      pageInfo: { pageNo: 1, pageSize: 10, totalCount: 1, totalPage: 1 },
    });

    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthCacheBoundary>
          <MemoryRouter initialEntries={["/dashboard"]}>
            <Routes>
              <Route path="/dashboard" element={<V1Consumer />} />
              <Route path="/v2/dashboard" element={<V2Consumer />} />
            </Routes>
          </MemoryRouter>
        </AuthCacheBoundary>
      </QueryClientProvider>,
    );

    // Initial load in V1
    await waitFor(() => {
      expect(screen.getByTestId("v1-view")).toBeInTheDocument();
      expect(
        screen.getByText(/Shared Session Task - pending/i),
      ).toBeInTheDocument();
    });
    expect(taskService.getAllTasks).toHaveBeenCalledTimes(1);

    // Navigate to V2
    await user.click(screen.getByRole("link", { name: /Switch to V2/i }));

    await waitFor(() => {
      expect(screen.getByTestId("v2-view")).toBeInTheDocument();
      expect(
        screen.getByText(/Shared Session Task - pending/i),
      ).toBeInTheDocument();
    });

    // Service was NOT called again; cached data survived the version switch
    expect(taskService.getAllTasks).toHaveBeenCalledTimes(1);
  });

  it("mutating task in V2 invalidates cache and updates V1-visible data", async () => {
    useAuthStore.getState().setSession({
      accessToken: "token-user-a",
      user: {
        id: "user-a",
        email: "a@example.com",
        name: "User A",
        role: "USER",
      },
    });
    useAuthStore.getState().setAuthReady(true);

    vi.mocked(taskService.getAllTasks)
      .mockResolvedValueOnce({
        data: [sampleTask],
        pageInfo: { pageNo: 1, pageSize: 10, totalCount: 1, totalPage: 1 },
      })
      .mockResolvedValueOnce({
        data: [{ ...sampleTask, status: "in-progress" }],
        pageInfo: { pageNo: 1, pageSize: 10, totalCount: 1, totalPage: 1 },
      });

    vi.mocked(taskService.startTask).mockResolvedValueOnce({
      ...sampleTask,
      status: "in-progress",
    });

    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthCacheBoundary>
          <MemoryRouter initialEntries={["/v2/dashboard"]}>
            <Routes>
              <Route path="/dashboard" element={<V1Consumer />} />
              <Route path="/v2/dashboard" element={<V2Consumer />} />
            </Routes>
          </MemoryRouter>
        </AuthCacheBoundary>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Shared Session Task - pending/i),
      ).toBeInTheDocument();
    });

    // Click Start in V2
    await user.click(screen.getByRole("button", { name: /Start in V2/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Shared Session Task - in-progress/i),
      ).toBeInTheDocument();
    });

    // Switch to V1
    await user.click(screen.getByRole("link", { name: /Switch to V1/i }));

    await waitFor(() => {
      expect(screen.getByTestId("v1-view")).toBeInTheDocument();
      expect(
        screen.getByText(/Shared Session Task - in-progress/i),
      ).toBeInTheDocument();
    });
  });

  it("logout and session replacement isolates data between user A and user B", async () => {
    useAuthStore.getState().setSession({
      accessToken: "token-user-a",
      user: {
        id: "user-a",
        email: "a@example.com",
        name: "User A",
        role: "USER",
      },
    });
    useAuthStore.getState().setAuthReady(true);

    vi.mocked(taskService.getAllTasks).mockResolvedValueOnce({
      data: [sampleTask],
      pageInfo: { pageNo: 1, pageSize: 10, totalCount: 1, totalPage: 1 },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthCacheBoundary>
          <MemoryRouter initialEntries={["/v2/dashboard"]}>
            <Routes>
              <Route path="/v2/dashboard" element={<V2Consumer />} />
            </Routes>
          </MemoryRouter>
        </AuthCacheBoundary>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Shared Session Task/i)).toBeInTheDocument();
    });

    // Logout User A
    await act(async () => {
      useAuthStore.getState().clearSession();
    });

    // Cache is cleared
    expect(queryClient.getQueryData(taskKeys.list({}))).toBeUndefined();

    // Deferred User A request completing after User B logs in
    const { promise: deferredPromise, resolve: resolveDeferred } =
      createDeferred<PaginatedResponse<Task>>();
    vi.mocked(taskService.getAllTasks).mockReturnValueOnce(deferredPromise);

    // User B logs in
    await act(async () => {
      useAuthStore.getState().setSession({
        accessToken: "token-user-b",
        user: {
          id: "user-b",
          email: "b@example.com",
          name: "User B",
          role: "USER",
        },
      });
    });

    // Resolve deferred A request
    resolveDeferred({
      data: [{ ...sampleTask, title: "Secret Task of User A" }],
      pageInfo: { pageNo: 1, pageSize: 10, totalCount: 1, totalPage: 1 },
    });

    // Wait for microtasks
    await act(async () => {
      await Promise.resolve();
    });

    // User B does not see User A's secret task
    expect(screen.queryByText("Secret Task of User A")).not.toBeInTheDocument();
  });
});
