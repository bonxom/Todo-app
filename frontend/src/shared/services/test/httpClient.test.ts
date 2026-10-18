import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import axiosInstance from "../httpClient";
import { useAuthStore } from "@/stores/useAuthStore";
import { ApiError } from "../apiError";

describe("httpClient", () => {
  let mock: MockAdapter;
  let rootAxiosMock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axiosInstance);
    rootAxiosMock = new MockAdapter(axios);
    window.history.replaceState({}, "", "/login");
    localStorage.clear();
    useAuthStore.getState().clearSession();
  });

  afterEach(() => { mock.restore(); rootAxiosMock.restore(); vi.unstubAllGlobals(); });

  it("injects Authorization header when token exists in store", async () => {
    useAuthStore.getState().setSession({ accessToken: "token-abc" });
    mock.onGet("/api/secure").reply((config) => {
      expect(config.headers?.Authorization).toBe("Bearer token-abc");
      return [200, { success: true }];
    });

    const res = await axiosInstance.get("/api/secure");
    expect(res.data).toEqual({ success: true });
  });

  it("refreshes token atomically on 401 and retries original request", async () => {
    useAuthStore.getState().setSession({
      accessToken: "expired-token",
      refreshToken: "refresh-token-1",
    });

    mock.onGet("/api/secure").replyOnce(401, { message: "Expired" });
    rootAxiosMock.onPost("http://localhost:4000/api/auth/refresh").reply(200, {
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
    });
    mock.onGet("/api/secure").replyOnce(200, { data: "success-after-refresh" });

    const res = await axiosInstance.get("/api/secure");
    expect(res.data).toEqual({ data: "success-after-refresh" });
    expect(useAuthStore.getState().token).toBe("new-access-token");
    expect(useAuthStore.getState().refreshToken).toBe("new-refresh-token");
  });

  it("shares one refresh call for multiple concurrent 401 requests", async () => {
    useAuthStore.getState().setSession({
      accessToken: "expired-token",
      refreshToken: "refresh-token-1",
    });

    let refreshCalls = 0;
    rootAxiosMock.onPost("http://localhost:4000/api/auth/refresh").reply(() => {
      refreshCalls += 1;
      return [200, { accessToken: "new-token", refreshToken: "new-refresh" }];
    });

    mock.onGet("/api/req-1").replyOnce(401);
    mock.onGet("/api/req-1").reply(200, { req: 1 });

    mock.onGet("/api/req-2").replyOnce(401);
    mock.onGet("/api/req-2").reply(200, { req: 2 });

    const [res1, res2] = await Promise.all([
      axiosInstance.get("/api/req-1"),
      axiosInstance.get("/api/req-2"),
    ]);

    expect(refreshCalls).toBe(1);
    expect(res1.data).toEqual({ req: 1 });
    expect(res2.data).toEqual({ req: 2 });
  });

  it("clears session and returns normalized ApiError on refresh 401 terminal error", async () => {
    useAuthStore.getState().setSession({
      accessToken: "expired-token",
      refreshToken: "invalid-refresh-token",
    });

    mock.onGet("/api/secure").reply(401, { message: "Expired" });
    rootAxiosMock.onPost("http://localhost:4000/api/auth/refresh").reply(401, {
      message: "Refresh token invalid",
    });

    await expect(axiosInstance.get("/api/secure")).rejects.toThrow(ApiError);
    expect(useAuthStore.getState().token).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("preserves session on transient 500 error during token refresh", async () => {
    useAuthStore.getState().setSession({
      accessToken: "expired",
      refreshToken: "valid-refresh",
    });

    mock.onGet("/api/secure").reply(401, { message: "Expired" });
    rootAxiosMock.onPost("http://localhost:4000/api/auth/refresh").reply(500, {
      message: "Database down",
    });

    await expect(axiosInstance.get("/api/secure")).rejects.toThrow(ApiError);
    // Session should NOT be wiped on temporary server failure
    expect(useAuthStore.getState().token).toBe("expired");
    expect(useAuthStore.getState().refreshToken).toBe("valid-refresh");
  });

  it("normalizes network errors into ApiError", async () => {
    mock.onGet("/api/network-fail").networkError();

    try {
      await axiosInstance.get("/api/network-fail");
      expect.unreachable("Should throw");
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.kind).toBe("network");
    }
  });
  it("refreshes an expired stored JWT before sending the first API request", async () => {
    const expired = `header.${btoa(JSON.stringify({ exp: 1 }))}.signature`;
    useAuthStore.getState().setSession({ accessToken: expired, refreshToken: "refresh" });
    rootAxiosMock.onPost("http://localhost:4000/api/auth/refresh").reply(200, {
      accessToken: "renewed", refreshToken: "rotated",
    });
    mock.onGet("/api/auth/me").reply((config) => {
      expect(config.headers?.Authorization).toBe("Bearer renewed");
      return [200, { name: "User" }];
    });
    await axiosInstance.get("/api/auth/me");
    expect(mock.history.get).toHaveLength(1);
    expect(localStorage.getItem("refreshToken")).toBe("rotated");
  });

  it("retries a delayed old-token 401 using the already refreshed token", async () => {
    useAuthStore.getState().setSession({ accessToken: "old", refreshToken: "refresh" });
    mock.onGet("/api/late").replyOnce(() => {
      useAuthStore.getState().updateTokens({ accessToken: "new", refreshToken: "rotated" });
      return [401];
    });
    mock.onGet("/api/late").reply((config) => {
      expect(config.headers?.Authorization).toBe("Bearer new");
      return [200];
    });
    await axiosInstance.get("/api/late");
    expect(rootAxiosMock.history.post).toHaveLength(0);
  });

  it("keeps the saved session if proactive refresh temporarily fails", async () => {
    const expired = `header.${btoa(JSON.stringify({ exp: 1 }))}.signature`;
    useAuthStore.getState().setSession({ accessToken: expired, refreshToken: "refresh" });
    rootAxiosMock.onPost("http://localhost:4000/api/auth/refresh").reply(503);
    await expect(axiosInstance.get("/api/auth/me")).rejects.toBeInstanceOf(ApiError);
    expect(useAuthStore.getState().refreshToken).toBe("refresh");
    expect(mock.history.get).toHaveLength(0);
  });

  it("reuses tokens rotated by another tab while waiting for the browser lock", async () => {
    const expired = `header.${btoa(JSON.stringify({ exp: 1 }))}.signature`;
    useAuthStore.getState().setSession({ accessToken: expired, refreshToken: "old-refresh" });
    vi.stubGlobal("navigator", { locks: { request: async (_name: string, callback: () => Promise<string>) => {
      localStorage.setItem("token", "other-tab-token");
      localStorage.setItem("refreshToken", "other-tab-refresh");
      return callback();
    } } });
    mock.onGet("/api/secure").reply((config) => {
      expect(config.headers?.Authorization).toBe("Bearer other-tab-token");
      return [200];
    });
    await axiosInstance.get("/api/secure");
    expect(rootAxiosMock.history.post).toHaveLength(0);
    expect(useAuthStore.getState().refreshToken).toBe("other-tab-refresh");
  });

  it("does not restore a session when logout happens during refresh", async () => {
    useAuthStore.getState().setSession({ accessToken: "old", refreshToken: "refresh" });
    mock.onGet("/api/secure").reply(401);
    rootAxiosMock.onPost("http://localhost:4000/api/auth/refresh").reply(() => {
      useAuthStore.getState().clearSession();
      return [200, { accessToken: "new", refreshToken: "rotated" }];
    });
    await expect(axiosInstance.get("/api/secure")).rejects.toBeInstanceOf(ApiError);
    expect(useAuthStore.getState().token).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
  });

});
