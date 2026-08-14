import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import { env } from "../../config/env";
import { useAuthStore } from "../../stores/useAuthStore";
import { ApiError } from "./apiError";
import { resetUserCache } from "./sessionCache";

export type RequestOptions = Pick<AxiosRequestConfig, "signal" | "headers" | "params">;

const axiosInstance = axios.create({
  baseURL: env.serverUrl,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: ApiError) => void;
}> = [];

const processQueue = (error: ApiError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });

  failedQueue = [];
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

    if (axiosErr.code === "ECONNABORTED" || axiosErr.message?.toLowerCase().includes("timeout")) {
      return new ApiError(backendMessage || "Request timed out", status, "timeout", axiosErr.code, axiosErr);
    }

    if (!axiosErr.response) {
      if (axiosErr.request) {
        return new ApiError("No response from server", undefined, "network", axiosErr.code, axiosErr);
      }
      return new ApiError(axiosErr.message || "Network error", undefined, "network", axiosErr.code, axiosErr);
    }

    return new ApiError(backendMessage || axiosErr.message || "An error occurred", status, "http", axiosErr.code, axiosErr);
  }

  if (error instanceof Error) {
    return new ApiError(error.message, undefined, "http", undefined, error);
  }

  return new ApiError("An unexpected error occurred", undefined, "http", undefined, error);
};

// Request interceptor
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (env.apiDebug) {
      console.log("Request:", config.method?.toUpperCase(), config.url);
      console.log("Request data:", config.data);
      console.log("Base URL:", config.baseURL);
    }

    // AI endpoints timeout is 60s
    if (config.url?.includes("/api/ai/")) {
      config.timeout = 60000;
    }

    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    if (env.apiDebug) {
      console.error("Request error:", error);
    }
    return Promise.reject(normalizeToApiError(error));
  }
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
    const originalRequest = error?.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (env.apiDebug) {
      console.error("Response error:", error);
    }

    if (!axios.isAxiosError(error) || !error.response) {
      return Promise.reject(normalizeToApiError(error));
    }

    const { status } = error.response;
    const requestUrl = originalRequest?.url ?? "";

    if (status === 401) {
      const isAuthEndpoint =
        requestUrl.includes("/api/auth/login") ||
        requestUrl.includes("/api/auth/register") ||
        requestUrl.includes("/api/auth/refresh");

      if (isAuthEndpoint || originalRequest?._retry) {
        await handleTerminalAuthFailure();
        const message = (error.response.data as { message?: string })?.message || "Authentication failed";
        return Promise.reject(new ApiError(message, 401, "http", error.code, error));
      }

      const refreshToken = useAuthStore.getState().refreshToken;

      if (!refreshToken) {
        await handleTerminalAuthFailure();
        const message = (error.response.data as { message?: string })?.message || "Session expired";
        return Promise.reject(new ApiError(message, 401, "http", error.code, error));
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            if (originalRequest) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return axiosInstance(originalRequest);
            }
            return Promise.reject(new ApiError("Original request missing configuration", undefined, "http"));
          })
          .catch((err) => Promise.reject(normalizeToApiError(err)));
      }

      if (originalRequest) {
        originalRequest._retry = true;
      }
      isRefreshing = true;

      try {
        const refreshBaseUrl = env.serverUrl || "";
        const refreshResponse = await axios.post(`${refreshBaseUrl}/api/auth/refresh`, {
          refreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken, token: fallbackToken } = refreshResponse.data;
        const effectiveToken = newAccessToken || fallbackToken;

        useAuthStore.getState().updateTokens({
          accessToken: effectiveToken,
          refreshToken: newRefreshToken,
        });

        axiosInstance.defaults.headers.common.Authorization = `Bearer ${effectiveToken}`;
        if (originalRequest) {
          originalRequest.headers.Authorization = `Bearer ${effectiveToken}`;
        }

        processQueue(null, effectiveToken);

        if (originalRequest) {
          return axiosInstance(originalRequest);
        }
        return refreshResponse;
      } catch (refreshErr) {
        const normalizedRefreshErr = normalizeToApiError(refreshErr);
        processQueue(normalizedRefreshErr, null);

        // Terminal auth failures on refresh are 401 or 403
        if (normalizedRefreshErr.status === 401 || normalizedRefreshErr.status === 403) {
          await handleTerminalAuthFailure();
        }

        return Promise.reject(normalizedRefreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(normalizeToApiError(error));
  }
);

export default axiosInstance;
