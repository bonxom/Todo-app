import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { AuthCacheBoundary } from "../AuthCacheBoundary";
import { useAuthStore } from "@/stores/useAuthStore";
import { taskKeys } from "@/features/tasks/api/taskKeys";

const Probe = () => {
  const client = useQueryClient();
  const tasks = client.getQueryData<Array<{ _id: string }>>(taskKeys.list({}));
  return <div data-testid="probe">{tasks ? tasks.map((t) => t._id).join(",") : "empty"}</div>;
};

describe("AuthCacheBoundary", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    localStorage.clear();
    useAuthStore.getState().clearSession();
  });

  it("clears query cache on clearSession", async () => {
    queryClient.setQueryData(taskKeys.list({}), [{ _id: "task-1" }]);

    render(
      <QueryClientProvider client={queryClient}>
        <AuthCacheBoundary>
          <Probe />
        </AuthCacheBoundary>
      </QueryClientProvider>
    );

    expect(screen.getByTestId("probe").textContent).toBe("task-1");

    await act(async () => {
      useAuthStore.getState().clearSession();
    });

    expect(screen.getByTestId("probe").textContent).toBe("empty");
  });

  it("clears query cache when a new session is set with a different identity", async () => {
    queryClient.setQueryData(taskKeys.list({}), [{ _id: "user-a-task" }]);

    render(
      <QueryClientProvider client={queryClient}>
        <AuthCacheBoundary>
          <Probe />
        </AuthCacheBoundary>
      </QueryClientProvider>
    );

    expect(screen.getByTestId("probe").textContent).toBe("user-a-task");

    await act(async () => {
      useAuthStore.getState().setSession({
        accessToken: "user-b-token",
        user: { email: "user-b@example.com", name: "User B", role: "USER" },
      });
    });

    expect(screen.getByTestId("probe").textContent).toBe("empty");
  });

  it("does NOT clear query cache on token refresh", async () => {
    useAuthStore.getState().setSession({
      accessToken: "token-1",
      refreshToken: "refresh-1",
      user: { email: "u@example.com", name: "U", role: "USER" },
    });

    queryClient.setQueryData(taskKeys.list({}), [{ _id: "keep-me" }]);

    render(
      <QueryClientProvider client={queryClient}>
        <AuthCacheBoundary>
          <Probe />
        </AuthCacheBoundary>
      </QueryClientProvider>
    );

    expect(screen.getByTestId("probe").textContent).toBe("keep-me");

    await act(async () => {
      useAuthStore.getState().updateTokens({
        accessToken: "token-2",
        refreshToken: "refresh-2",
      });
    });

    // Cache MUST stay intact
    expect(screen.getByTestId("probe").textContent).toBe("keep-me");
  });

  it("does NOT clear query cache on user profile sync", async () => {
    useAuthStore.getState().setSession({
      accessToken: "token-1",
      user: { email: "u@example.com", name: "Old Name", role: "USER" },
    });

    queryClient.setQueryData(taskKeys.list({}), [{ _id: "keep-me-sync" }]);

    render(
      <QueryClientProvider client={queryClient}>
        <AuthCacheBoundary>
          <Probe />
        </AuthCacheBoundary>
      </QueryClientProvider>
    );

    expect(screen.getByTestId("probe").textContent).toBe("keep-me-sync");

    await act(async () => {
      useAuthStore.getState().syncUser({
        email: "u@example.com",
        name: "New Name",
        role: "USER",
      });
    });

    expect(screen.getByTestId("probe").textContent).toBe("keep-me-sync");
  });
});
