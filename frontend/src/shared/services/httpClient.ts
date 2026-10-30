import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { env } from "../../config/env";
import { useAuthStore } from "../../stores/useAuthStore";
import { ApiError } from "./apiError";
import { readAuthSnapshot } from "./authStorage";
import { resetUserCache } from "./sessionCache";

export type RequestOptions = Pick<
  AxiosRequestConfig,
  "signal" | "headers" | "params"
>;

const axiosInstance = axios.create({
  baseURL: env.serverUrl,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<string> | null = null;

const isExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    return (
      typeof payload.exp === "number" &&
      payload.exp * 1000 <= Date.now() + 30_000
    );
  } catch {
    return false;
  }
};

const handleTerminalAuthFailure = async () => {
  await resetUserCache();
  useAuthStore.getState().clearSession();

  if (typeof window !== "undefined") {
    const currentPath = window.location.pathname;
    if (!["/login", "/register"].includes(currentPath)) {
      window.location.replace("/login");
    }
  }
};

const normalizeToApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<{ message?: string }>;
    const status = axiosErr.response?.status;
    const backendMessage = axiosErr.response?.data?.message;

    if (
      axiosErr.code === "ECONNABORTED" ||
      axiosErr.message?.toLowerCase().includes("timeout")
    ) {
      return new ApiError(
        backendMessage || "Request timed out",
        status,
        "timeout",
        axiosErr.code,
        axiosErr,
      );
    }

    if (!axiosErr.response) {
      if (axiosErr.request) {
        return new ApiError(
          "No response from server",
          undefined,
          "network",
          axiosErr.code,
          axiosErr,
        );
      }
      return new ApiError(
        axiosErr.message || "Network error",
        undefined,
        "network",
        axiosErr.code,
        axiosErr,
      );
    }

    return new ApiError(
      backendMessage || axiosErr.message || "An error occurred",
      status,
      "http",
      axiosErr.code,
      axiosErr,
    );
  }

  if (error instanceof Error) {
    return new ApiError(error.message, undefined, "http", undefined, error);
  }

  return new ApiError(
    "An unexpected error occurred",
    undefined,
    "http",
    undefined,
    error,
  );
};

// Serialize rotation within a tab and, where supported, across browser tabs.
const refreshAccessToken = (): Promise<string> => {
  if (refreshPromise) return refreshPromise;
  const revision = useAuthStore.getState().sessionRevision;
  const previousToken = useAuthStore.getState().token;
  const rotate = async (): Promise<string> => {
    const stored = readAuthSnapshot();
    if (
      useAuthStore.getState().sessionRevision !== revision ||
      !stored.refreshToken
    ) {
      throw new ApiError("Session ended", 401, "http");
    }
    if (
      stored.token &&
      stored.token !== previousToken &&
      !isExpired(stored.token)
    ) {
      useAuthStore.getState().updateTokens({
        accessToken: stored.token,
        refreshToken: stored.refreshToken,
      });
      return stored.token;
    }
    const response = await axios.post(
      `${env.serverUrl || ""}/api/auth/refresh`,
      {
        refreshToken: stored.refreshToken,
      },
      { timeout: 30000 },
    );
    const accessToken = response.data.accessToken || response.data.token;
    if (typeof accessToken !== "string" || !accessToken) {
      throw new ApiError("Invalid refresh response", 502, "http");
    }
    if (
      useAuthStore.getState().sessionRevision !== revision ||
      readAuthSnapshot().refreshToken !== stored.refreshToken
    ) {
      throw new ApiError("Session changed", 401, "http");
    }
    useAuthStore
      .getState()
      .updateTokens({ accessToken, refreshToken: response.data.refreshToken });
    return accessToken;
  };
  refreshPromise = Promise.resolve(
    typeof navigator !== "undefined" && navigator.locks
      ? navigator.locks.request("orbit-auth-refresh", rotate)
      : rotate(),
  )
    .then((token) => token)
    .catch(async (error) => {
      const normalized = normalizeToApiError(error);
      if (
        [401, 403].includes(normalized.status ?? 0) &&
        useAuthStore.getState().sessionRevision === revision
      ) {
        await handleTerminalAuthFailure();
      }
      throw normalized;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
};

const isPublicAuthEndpoint = (url: string) =>
  ["login", "register", "refresh", "logout"].some((name) =>
    url.includes(`/api/auth/${name}`),
  );

// Request interceptor
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (env.apiDebug) {
      console.log("Request:", config.method?.toUpperCase(), config.url);
      console.log("Request data:", config.data);
      console.log("Base URL:", config.baseURL);
    }

    // AI endpoints timeout is 10 minutes (600,000ms)
    if (config.url?.includes("/api/ai/")) {
      config.timeout = 600000;
    }

    let token = useAuthStore.getState().token;
    if (
      !isPublicAuthEndpoint(config.url ?? "") &&
      useAuthStore.getState().refreshToken &&
      (!token || isExpired(token))
    ) {
      token = await refreshAccessToken();
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => {
    if (env.apiDebug) {
      console.error("Request error:", error);
    }
    return Promise.reject(normalizeToApiError(error));
  },
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    if (env.apiDebug) {
      console.log("Response received:", response.status, response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error?.config as
      (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (env.apiDebug) {
      console.error("Response error:", error);
    }

    if (!axios.isAxiosError(error) || !error.response) {
      return Promise.reject(normalizeToApiError(error));
    }

    const { status } = error.response;
    const requestUrl = originalRequest?.url ?? "";

    if (status === 401) {
      if (isPublicAuthEndpoint(requestUrl)) {
        return Promise.reject(normalizeToApiError(error));
      }
      if (!originalRequest || originalRequest._retry) {
        await handleTerminalAuthFailure();
        return Promise.reject(normalizeToApiError(error));
      }
      originalRequest._retry = true;
      // A late 401 may belong to the token that another request already replaced.
      const currentToken = useAuthStore.getState().token;
      if (
        currentToken &&
        originalRequest.headers.Authorization !== `Bearer ${currentToken}`
      ) {
        return axiosInstance(originalRequest);
      }
      if (!useAuthStore.getState().refreshToken) {
        await handleTerminalAuthFailure();
        return Promise.reject(normalizeToApiError(error));
      }
      await refreshAccessToken();
      return axiosInstance(originalRequest);
    }

    return Promise.reject(normalizeToApiError(error));
  },
);

export default axiosInstance;
