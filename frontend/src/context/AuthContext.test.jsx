import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "./useAuth";
import { useAuthStore } from "../stores/useAuthStore";
import { authService } from "../shared/services/authService";
import { ApiError } from "../shared/services/apiError";

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

describe("AuthContext bridge", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().clearSession();
    useAuthStore.getState().setAuthReady(false);
    vi.restoreAllMocks();
  });

  it("marks auth ready when no token exists", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthReady).toBe(true);
    });

    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("hydrates and syncs user when token exists and getMe succeeds", async () => {
    const user = { email: "test@example.com", name: "Tester", role: "USER" };
    useAuthStore.getState().setSession({ accessToken: "token-123" });
    useAuthStore.getState().setAuthReady(false);

    vi.spyOn(authService, "getMe").mockResolvedValueOnce(user);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthReady).toBe(true);
    });

    expect(result.current.token).toBe("token-123");
    expect(result.current.user).toEqual(user);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("clears session on 401 error from getMe during restoration", async () => {
    useAuthStore.getState().setSession({ accessToken: "invalid-token" });
    useAuthStore.getState().setAuthReady(false);

    vi.spyOn(authService, "getMe").mockRejectedValueOnce(new ApiError("Unauthorized", 401));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthReady).toBe(true);
    });

    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("retains token on 500 error from getMe during restoration", async () => {
    useAuthStore.getState().setSession({ accessToken: "valid-token" });
    useAuthStore.getState().setAuthReady(false);

    vi.spyOn(authService, "getMe").mockRejectedValueOnce(new ApiError("Server Error", 500));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthReady).toBe(true);
    });

    expect(result.current.token).toBe("valid-token");
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("updates store and context when setSession, syncUser, clearSession are called", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    const user = { email: "new@example.com", name: "New User", role: "USER" };
    act(() => {
      result.current.setSession({ accessToken: "t-1", refreshToken: "r-1", user });
    });

    expect(result.current.token).toBe("t-1");
    expect(result.current.user).toEqual(user);
    expect(useAuthStore.getState().token).toBe("t-1");

    act(() => {
      result.current.syncUser({ ...user, name: "Updated Name" });
    });

    expect(result.current.user.name).toBe("Updated Name");
    expect(useAuthStore.getState().user.name).toBe("Updated Name");

    act(() => {
      result.current.clearSession();
    });

    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
  });
});
