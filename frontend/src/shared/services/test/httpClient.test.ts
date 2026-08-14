import { beforeEach, describe, expect, it } from "vitest";
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
    localStorage.clear();
    useAuthStore.getState().clearSession();
  });

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
});
