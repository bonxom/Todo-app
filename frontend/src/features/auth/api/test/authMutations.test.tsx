import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLoginMutation, useLogoutMutation, useRegisterMutation } from "../authMutations";
import { authService } from "@/shared/services/authService";
import { useAuthStore } from "@/stores/useAuthStore";
import { taskKeys } from "@/features/tasks/api/taskKeys";

describe("authMutations", () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().clearSession();
    vi.restoreAllMocks();
  });

  it("login removes query cache and sets session in store and localStorage", async () => {
    const wrapper = createWrapper();
    queryClient.setQueryData(taskKeys.list({}), [{ _id: "old-task" }]);
    expect(queryClient.getQueryData(taskKeys.list({}))).toBeDefined();

    const user = { email: "test@example.com", name: "Test User", role: "USER" as const };
    vi.spyOn(authService, "login").mockResolvedValueOnce({
      accessToken: "new-access",
      refreshToken: "new-refresh",
      user,
    });

    const { result } = renderHook(() => useLoginMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ email: "test@example.com", password: "password" });
    });

    // Query cache must be cleared
    expect(queryClient.getQueryData(taskKeys.list({}))).toBeUndefined();
    expect(useAuthStore.getState().token).toBe("new-access");
    expect(useAuthStore.getState().user).toEqual(user);
    expect(localStorage.getItem("token")).toBe("new-access");
  });

  it("register removes query cache and sets session in store", async () => {
    const wrapper = createWrapper();
    queryClient.setQueryData(taskKeys.list({}), [{ _id: "old-task" }]);

    const user = { email: "new@example.com", name: "New", role: "USER" as const };
    vi.spyOn(authService, "register").mockResolvedValueOnce({
      accessToken: "reg-access",
      refreshToken: "reg-refresh",
      user,
    });

    const { result } = renderHook(() => useRegisterMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        email: "new@example.com",
        password: "password",
        name: "New",
        dob: "2000-01-01",
      });
    });

    expect(queryClient.getQueryData(taskKeys.list({}))).toBeUndefined();
    expect(useAuthStore.getState().token).toBe("reg-access");
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it("logout posts refresh token, clears query cache and clears store", async () => {
    const wrapper = createWrapper();
    useAuthStore.getState().setSession({
      accessToken: "t",
      refreshToken: "r",
      user: { email: "a@a.com", name: "A", role: "USER" },
    });
    queryClient.setQueryData(taskKeys.list({}), [{ _id: "t1" }]);

    const logoutSpy = vi.spyOn(authService, "logout").mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useLogoutMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(logoutSpy).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(taskKeys.list({}))).toBeUndefined();
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
