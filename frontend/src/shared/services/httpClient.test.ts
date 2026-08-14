import { beforeEach, describe, expect, it } from "vitest";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import axiosInstance from "./httpClient";
import { useAuthStore } from "../../stores/useAuthStore";
import { ApiError } from "./apiError";

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

    mock.onGet("/api/test").reply((config) => {
      expect(config.headers?.Authorization).toBe("Bearer token-abc");
      return [200, { success: true }];
    });

    const response = await axiosInstance.get("/api/test");
    expect(response.data).toEqual({ success: true });
  });

  it("adjusts timeout to 60s for AI endpoints", async () => {
    mock.onPost("/api/ai/generate-tasks").reply((config) => {
      expect(config.timeout).toBe(60000);
      return [200, { success: true }];
    });

    await axiosInstance.post("/api/ai/generate-tasks", {});
  });

  it("normalizes HTTP error responses to ApiError", async () => {
    mock.onGet("/api/not-found").reply(404, { message: "Resource missing" });

    await expect(axiosInstance.get("/api/not-found")).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(404);
      expect(apiErr.message).toBe("Resource missing");
      expect(apiErr.kind).toBe("http");
      return true;
    });
  });

  it("handles single-flight token refresh for concurrent 401 requests", async () => {
    const user = { email: "u@example.com", name: "User", role: "USER" as const };
    useAuthStore.getState().setSession({
      accessToken: "expired-token",
      refreshToken: "valid-refresh-token",
      user,
    });

    let req1Count = 0;
    mock.onGet("/api/task/1").reply(() => {
      req1Count++;
      if (req1Count === 1) {
        return [401, { message: "Token expired" }];
      }
      return [200, { id: "1", title: "Task 1" }];
    });

    let req2Count = 0;
    mock.onGet("/api/task/2").reply(() => {
      req2Count++;
      if (req2Count === 1) {
        return [401, { message: "Token expired" }];
      }
      return [200, { id: "2", title: "Task 2" }];
    });

    let refreshCalls = 0;
    rootAxiosMock.onPost(/\/api\/auth\/refresh/).reply(() => {
      refreshCalls++;
      return [200, { accessToken: "new-access-token", refreshToken: "new-refresh-token" }];
    });

    const [res1, res2] = await Promise.all([
      axiosInstance.get("/api/task/1"),
      axiosInstance.get("/api/task/2"),
    ]);

    expect(res1.data).toEqual({ id: "1", title: "Task 1" });
    expect(res2.data).toEqual({ id: "2", title: "Task 2" });
    expect(refreshCalls).toBe(1);
    expect(useAuthStore.getState().token).toBe("new-access-token");
    expect(useAuthStore.getState().refreshToken).toBe("new-refresh-token");
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it("clears session and rejects queue on terminal refresh 401 failure", async () => {
    useAuthStore.getState().setSession({
      accessToken: "expired",
      refreshToken: "invalid-refresh",
      user: { email: "u@u.com", name: "U", role: "USER" },
    });

    mock.onGet("/api/secure").reply(401, { message: "Expired" });
    rootAxiosMock.onPost(/\/api\/auth\/refresh/).reply(401, { message: "Invalid refresh token" });

    await expect(axiosInstance.get("/api/secure")).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(401);
      return true;
    });

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("preserves session on transient 500 error during token refresh", async () => {
    const user = { email: "u@u.com", name: "U", role: "USER" as const };
    useAuthStore.getState().setSession({
      accessToken: "expired",
      refreshToken: "valid-refresh",
      user,
    });

    mock.onGet("/api/secure").reply(401, { message: "Expired" });
    rootAxiosMock.onPost(/\/api\/auth\/refresh/).reply(500, { message: "Internal server error" });

    await expect(axiosInstance.get("/api/secure")).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(500);
      return true;
    });

    // Session is NOT cleared on 500 server error
    expect(useAuthStore.getState().token).toBe("expired");
    expect(useAuthStore.getState().refreshToken).toBe("valid-refresh");
    expect(useAuthStore.getState().user).toEqual(user);
  });
});
