import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "../useAuthStore";
import type { User } from "@/shared/types/domain";

describe("useAuthStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().clearSession();
    useAuthStore.getState().setAuthReady(false);
  });

  it("rotates tokens in memory and in legacy storage without replacing the user", () => {
    const user: User = { email: "a@example.com", name: "A", role: "USER" as const };
    useAuthStore.getState().setSession({ accessToken: "old", refreshToken: "refresh-1", user });
    const revisionBefore = useAuthStore.getState().sessionRevision;

    useAuthStore.getState().updateTokens({ accessToken: "new", refreshToken: "refresh-2" });

    expect(useAuthStore.getState()).toMatchObject({ token: "new", refreshToken: "refresh-2", user });
    expect(localStorage.getItem("token")).toBe("new");
    expect(localStorage.getItem("refreshToken")).toBe("refresh-2");
    expect(JSON.parse(localStorage.getItem("user")!)).toEqual(user);
    // Token rotation is NOT a session identity change
    expect(useAuthStore.getState().sessionRevision).toBe(revisionBefore);
  });

  it("setSession updates memory, storage, marks ready, and increments revision", () => {
    const user: User = { email: "user@example.com", name: "User", role: "USER" };
    const rev0 = useAuthStore.getState().sessionRevision;

    useAuthStore.getState().setSession({ accessToken: "token-1", refreshToken: "refresh-1", user });

    expect(useAuthStore.getState()).toMatchObject({
      token: "token-1",
      refreshToken: "refresh-1",
      user,
      isAuthReady: true,
    });
    expect(useAuthStore.getState().sessionRevision).toBe(rev0 + 1);
    expect(localStorage.getItem("token")).toBe("token-1");
  });

  it("clearSession clears memory, storage, marks ready, and increments revision", () => {
    useAuthStore.getState().setSession({
      accessToken: "t",
      refreshToken: "r",
      user: { email: "e@e.com", name: "E", role: "USER" },
    });
    const revBefore = useAuthStore.getState().sessionRevision;

    useAuthStore.getState().clearSession();

    expect(useAuthStore.getState()).toMatchObject({
      token: null,
      refreshToken: null,
      user: null,
      isAuthReady: true,
    });
    expect(useAuthStore.getState().sessionRevision).toBe(revBefore + 1);
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });

  it("syncUser updates current user and storage without incrementing sessionRevision", () => {
    const user1: User = { email: "u1@example.com", name: "Name 1", role: "USER" };
    useAuthStore.getState().setSession({ accessToken: "t", refreshToken: "r", user: user1 });
    const revBefore = useAuthStore.getState().sessionRevision;

    const user2: User = { email: "u1@example.com", name: "Updated Name", role: "USER" };
    useAuthStore.getState().syncUser(user2);

    expect(useAuthStore.getState().user).toEqual(user2);
    expect(JSON.parse(localStorage.getItem("user")!)).toEqual(user2);
    expect(useAuthStore.getState().sessionRevision).toBe(revBefore);
  });

  it("setAuthReady updates ready status", () => {
    expect(useAuthStore.getState().isAuthReady).toBe(false);
    useAuthStore.getState().setAuthReady(true);
    expect(useAuthStore.getState().isAuthReady).toBe(true);
  });
});
