import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useChangePasswordMutation, useUpdateProfileMutation } from "./userMutations";
import { authService } from "../../../shared/services/authService";
import { useAuthStore } from "../../../stores/useAuthStore";
import { userKeys } from "./userKeys";

describe("userMutations", () => {
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

  it("updates profile, synchronizes store user and updates query cache", async () => {
    const wrapper = createWrapper();
    const initialUser = { email: "u@example.com", name: "Initial", role: "USER" as const };
    useAuthStore.getState().setSession({ accessToken: "token", user: initialUser });
    queryClient.setQueryData(userKeys.me(), initialUser);

    const updatedUser = { email: "u@example.com", name: "Updated Name", role: "USER" as const };
    vi.spyOn(authService, "updateInfo").mockResolvedValueOnce({ user: updatedUser });

    const { result } = renderHook(() => useUpdateProfileMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ name: "Updated Name" });
    });

    expect(useAuthStore.getState().user).toEqual(updatedUser);
    expect(queryClient.getQueryData(userKeys.me())).toEqual(updatedUser);
    expect(JSON.parse(localStorage.getItem("user")!)).toEqual(updatedUser);
  });

  it("calls changePassword endpoint", async () => {
    const wrapper = createWrapper();
    const changeSpy = vi.spyOn(authService, "changePassword").mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useChangePasswordMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ currentPassword: "old", newPassword: "new" });
    });

    expect(changeSpy).toHaveBeenCalledWith({ currentPassword: "old", newPassword: "new" });
  });
});
