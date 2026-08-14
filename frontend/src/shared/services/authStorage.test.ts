import { beforeEach, describe, expect, it } from "vitest";
import {
  clearStoredAuth,
  getStoredRefreshToken,
  getStoredToken,
  getStoredUser,
  persistAuthSession,
  readAuthSnapshot,
  updateStoredTokens,
  updateStoredUser,
} from "./authStorage";
import type { User } from "../types/domain";

describe("authStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reads empty snapshot when storage is empty", () => {
    expect(readAuthSnapshot()).toEqual({
      token: null,
      refreshToken: null,
      user: null,
    });
    expect(getStoredToken()).toBeNull();
    expect(getStoredRefreshToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });

  it("persists full auth session and normalizes access token / token alias", () => {
    const user: User = { email: "test@example.com", name: "Test User", role: "USER" };
    const snapshot = persistAuthSession({
      accessToken: "access-token-123",
      refreshToken: "refresh-token-456",
      user,
    });

    expect(snapshot).toEqual({
      token: "access-token-123",
      refreshToken: "refresh-token-456",
      user,
    });
    expect(localStorage.getItem("token")).toBe("access-token-123");
    expect(localStorage.getItem("refreshToken")).toBe("refresh-token-456");
    expect(JSON.parse(localStorage.getItem("user")!)).toEqual(user);
    expect(getStoredToken()).toBe("access-token-123");
    expect(getStoredRefreshToken()).toBe("refresh-token-456");
    expect(getStoredUser()).toEqual(user);
  });

  it("persists auth session using fallback token property", () => {
    const snapshot = persistAuthSession({
      token: "fallback-token",
    });

    expect(snapshot.token).toBe("fallback-token");
    expect(localStorage.getItem("token")).toBe("fallback-token");
  });

  it("persistAuthSession replaces session and removes omitted fields", () => {
    localStorage.setItem("token", "old-token");
    localStorage.setItem("refreshToken", "old-refresh");
    localStorage.setItem("user", JSON.stringify({ email: "old@example.com", name: "Old", role: "USER" }));

    const nextSnapshot = persistAuthSession({
      accessToken: "new-token",
    });

    expect(nextSnapshot).toEqual({
      token: "new-token",
      refreshToken: null,
      user: null,
    });
    expect(localStorage.getItem("token")).toBe("new-token");
    expect(localStorage.getItem("refreshToken")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });

  it("updates stored tokens without touching stored user", () => {
    const user: User = { email: "u@example.com", name: "U", role: "USER" };
    persistAuthSession({ accessToken: "a1", refreshToken: "r1", user });

    const updated = updateStoredTokens({ accessToken: "a2", refreshToken: "r2" });
    expect(updated).toEqual({
      token: "a2",
      refreshToken: "r2",
    });
    expect(localStorage.getItem("token")).toBe("a2");
    expect(localStorage.getItem("refreshToken")).toBe("r2");
    expect(JSON.parse(localStorage.getItem("user")!)).toEqual(user);
  });

  it("updates stored user and clears if null/empty", () => {
    const user: User = { email: "u@example.com", name: "U", role: "USER" };
    updateStoredUser(user);
    expect(getStoredUser()).toEqual(user);

    updateStoredUser(null);
    expect(getStoredUser()).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });

  it("clears stored auth", () => {
    persistAuthSession({ accessToken: "a", refreshToken: "r", user: { email: "e@e.com", name: "E", role: "USER" } });
    clearStoredAuth();

    expect(readAuthSnapshot()).toEqual({
      token: null,
      refreshToken: null,
      user: null,
    });
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });

  it("handles corrupted JSON in user storage gracefully", () => {
    localStorage.setItem("user", "invalid-json{");
    expect(getStoredUser()).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });
});
