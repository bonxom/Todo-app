import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { AuthCacheBoundary } from "./AuthCacheBoundary";
import { useAuthStore } from "../stores/useAuthStore";
import { taskKeys } from "../features/tasks/api/taskKeys";

const Probe = () => {
  const client = useQueryClient();
  const tasks = client.getQueryData<Array<{ _id: string }>>(taskKeys.list({}));
  return <div data-testid="probe">{tasks ? tasks.map((t) => t._id).join(",") : "empty"}</div>;
};

describe("AuthCacheBoundary", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().clearSession();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("clears query cache on session replacement without leaking previous user data to child probe", () => {
    // Seed user A session and query data
    useAuthStore.getState().setSession({
      accessToken: "token-a",
      user: { email: "a@a.com", name: "A", role: "USER" },
    });
    queryClient.setQueryData(taskKeys.list({}), [{ _id: "task-user-a" }]);

    render(
      <QueryClientProvider client={queryClient}>
        <AuthCacheBoundary fallback={<div data-testid="loading">Checking session...</div>}>
          <Probe />
        </AuthCacheBoundary>
      </QueryClientProvider>
    );

    expect(screen.getByTestId("probe").textContent).toBe("task-user-a");

    // Replace with user B session
    act(() => {
      useAuthStore.getState().setSession({
        accessToken: "token-b",
        user: { email: "b@b.com", name: "B", role: "USER" },
      });
    });

    // Probe must now show empty (user A data removed)
    expect(screen.getByTestId("probe").textContent).toBe("empty");
    expect(queryClient.getQueryData(taskKeys.list({}))).toBeUndefined();
  });

  it("clears query cache on clearSession", () => {
    useAuthStore.getState().setSession({
      accessToken: "token-a",
      user: { email: "a@a.com", name: "A", role: "USER" },
    });
    queryClient.setQueryData(taskKeys.list({}), [{ _id: "task-user-a" }]);

    render(
      <QueryClientProvider client={queryClient}>
        <AuthCacheBoundary>
          <Probe />
        </AuthCacheBoundary>
      </QueryClientProvider>
    );

    expect(screen.getByTestId("probe").textContent).toBe("task-user-a");

    act(() => {
      useAuthStore.getState().clearSession();
    });

    expect(screen.getByTestId("probe").textContent).toBe("empty");
  });

  it("preserves query cache on token rotation without activating gate", () => {
    useAuthStore.getState().setSession({
      accessToken: "token-1",
      refreshToken: "refresh-1",
      user: { email: "a@a.com", name: "A", role: "USER" },
    });
    queryClient.setQueryData(taskKeys.list({}), [{ _id: "task-user-a" }]);

    render(
      <QueryClientProvider client={queryClient}>
        <AuthCacheBoundary fallback={<div data-testid="loading">Loading...</div>}>
          <Probe />
        </AuthCacheBoundary>
      </QueryClientProvider>
    );

    act(() => {
      useAuthStore.getState().updateTokens({ accessToken: "token-2", refreshToken: "refresh-2" });
    });

    expect(screen.queryByTestId("loading")).toBeNull();
    expect(screen.getByTestId("probe").textContent).toBe("task-user-a");
    expect(queryClient.getQueryData(taskKeys.list({}))).toBeDefined();
  });

  it("preserves query cache on profile sync without activating gate", () => {
    const user = { email: "a@a.com", name: "A", role: "USER" as const };
    useAuthStore.getState().setSession({ accessToken: "token", user });
    queryClient.setQueryData(taskKeys.list({}), [{ _id: "task-user-a" }]);

    render(
      <QueryClientProvider client={queryClient}>
        <AuthCacheBoundary fallback={<div data-testid="loading">Loading...</div>}>
          <Probe />
        </AuthCacheBoundary>
      </QueryClientProvider>
    );

    act(() => {
      useAuthStore.getState().syncUser({ ...user, name: "A Updated" });
    });

    expect(screen.queryByTestId("loading")).toBeNull();
    expect(screen.getByTestId("probe").textContent).toBe("task-user-a");
    expect(queryClient.getQueryData(taskKeys.list({}))).toBeDefined();
  });
});
