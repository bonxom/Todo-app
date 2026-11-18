import i18n from "../i18n";
import axios from "axios";
import { env } from "../../config/env";
import { useAuthStore } from "../../stores/useAuthStore";
import { ApiError } from "./apiError";
import { readAuthSnapshot } from "./authStorage";
import { resetUserCache } from "./sessionCache";

let refreshPromise: Promise<string> | null = null;

export const isExpired = (token: string): boolean => {
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

export const handleTerminalAuthFailure = async (): Promise<void> => {
  await resetUserCache();
  useAuthStore.getState().clearSession();

  if (typeof window !== "undefined") {
    const currentPath = window.location.pathname;
    if (!["/login", "/register"].includes(currentPath)) {
      window.location.replace("/login");
    }
  }
};

export const refreshAccessToken = (): Promise<string> => {
  if (refreshPromise) return refreshPromise;
  const revision = useAuthStore.getState().sessionRevision;
  const previousToken = useAuthStore.getState().token;

  const rotate = async (): Promise<string> => {
    const stored = readAuthSnapshot();
    if (
      useAuthStore.getState().sessionRevision !== revision ||
      !stored.refreshToken
    ) {
      throw new ApiError(i18n.t("network.ended"), 401, "http");
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
      throw new ApiError(i18n.t("network.refresh"), 502, "http");
    }
    if (
      useAuthStore.getState().sessionRevision !== revision ||
      readAuthSnapshot().refreshToken !== stored.refreshToken
    ) {
      throw new ApiError(i18n.t("network.changed"), 401, "http");
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
      const status = error?.response?.status ?? error?.status;
      if (
        [401, 403].includes(status) &&
        useAuthStore.getState().sessionRevision === revision
      ) {
        await handleTerminalAuthFailure();
      }
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error?.response?.data?.message ||
          error?.message ||
          i18n.t("network.generic"),
        status,
        "http",
        error?.code,
        error,
      );
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

export const getAccessToken = async (): Promise<string | null> => {
  const token = useAuthStore.getState().token;
  if (token && !isExpired(token)) {
    return token;
  }
  if (useAuthStore.getState().refreshToken) {
    return await refreshAccessToken();
  }
  return null;
};
