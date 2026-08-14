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
} from "../authStorage";

describe("authStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists full auth session", () => {
    persistAuthSession({
      accessToken: "tok-123",
      refreshToken: "ref-456",
      user: { email: "u@example.com", name: "User", role: "USER" },
    });

    expect(getStoredToken()).toBe("tok-123");
    expect(getStoredRefreshToken()).toBe("ref-456");
    expect(getStoredUser()).toEqual({ email: "u@example.com", name: "User", role: "USER" });
  });

  it("clears stored auth keys", () => {
    localStorage.setItem("token", "t");
    localStorage.setItem("refreshToken", "r");
    localStorage.setItem("user", JSON.stringify({ email: "e" }));

    clearStoredAuth();

    expect(getStoredToken()).toBeNull();
    expect(getStoredRefreshToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });

  it("updates stored tokens without affecting user", () => {
    localStorage.setItem("user", JSON.stringify({ email: "u@example.com" }));

    updateStoredTokens({ accessToken: "new-tok", refreshToken: "new-ref" });

    expect(getStoredToken()).toBe("new-tok");
    expect(getStoredRefreshToken()).toBe("new-ref");
    expect(getStoredUser()).toEqual({ email: "u@example.com" });
  });

  it("updates stored user without affecting tokens", () => {
    localStorage.setItem("token", "t1");
    localStorage.setItem("refreshToken", "r1");

    updateStoredUser({ email: "updated@example.com", name: "Up", role: "USER" });

    expect(getStoredToken()).toBe("t1");
    expect(getStoredRefreshToken()).toBe("r1");
    expect(getStoredUser()?.email).toBe("updated@example.com");
  });

  it("handles corrupted JSON in user storage safely", () => {
    localStorage.setItem("user", "invalid-json-{}");
    expect(getStoredUser()).toBeNull();
  });

  it("reads complete auth snapshot", () => {
    localStorage.setItem("token", "snap-tok");
    localStorage.setItem("refreshToken", "snap-ref");
    localStorage.setItem("user", JSON.stringify({ email: "snap@example.com" }));

    const snapshot = readAuthSnapshot();
    expect(snapshot.token).toBe("snap-tok");
    expect(snapshot.refreshToken).toBe("snap-ref");
    expect(snapshot.user?.email).toBe("snap@example.com");
  });
});
