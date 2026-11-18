import i18n from "../i18n";
import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { env } from "../../config/env";
import { useAuthStore } from "../../stores/useAuthStore";
import { ApiError } from "./apiError";
import {
  handleTerminalAuthFailure,
  isExpired,
  refreshAccessToken,
} from "./authSession";

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
        backendMessage || i18n.t("network.timeout"),
        status,
        "timeout",
        axiosErr.code,
        axiosErr,
      );
    }

    if (!axiosErr.response) {
      if (axiosErr.request) {
        return new ApiError(
          i18n.t("network.noResponse"),
          undefined,
          "network",
          axiosErr.code,
          axiosErr,
        );
      }
      return new ApiError(
        axiosErr.message || i18n.t("network.error"),
        undefined,
        "network",
        axiosErr.code,
        axiosErr,
      );
    }

    return new ApiError(
      backendMessage || axiosErr.message || i18n.t("network.generic"),
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
    i18n.t("unexpectedError"),
    undefined,
    "http",
    undefined,
    error,
  );
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
