import type { AuthSession, AuthSnapshot, User } from "../types/domain";

const AUTH_TOKEN_KEY = "token";
const AUTH_REFRESH_TOKEN_KEY = "refreshToken";
const AUTH_USER_KEY = "user";

const canUseStorage = (): boolean => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export const getStoredToken = (): string | null => {
  if (!canUseStorage()) return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

export const getStoredRefreshToken = (): string | null => {
  if (!canUseStorage()) return null;
  return localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
};

export const getStoredUser = (): User | null => {
  if (!canUseStorage()) return null;
  const storedUser = localStorage.getItem(AUTH_USER_KEY);
  if (!storedUser) return null;
  try {
    return JSON.parse(storedUser) as User;
  } catch {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
};

export const readAuthSnapshot = (): AuthSnapshot => ({
  token: getStoredToken(),
  refreshToken: getStoredRefreshToken(),
  user: getStoredUser(),
});

export const persistAuthSession = (session: AuthSession): AuthSnapshot => {
  if (!canUseStorage()) {
    const effectiveToken = session.accessToken || session.token || null;
    return {
      token: effectiveToken,
      refreshToken: session.refreshToken || null,
      user: session.user || null,
    };
  }

  const effectiveToken = session.accessToken || session.token || null;

  if (effectiveToken) {
    localStorage.setItem(AUTH_TOKEN_KEY, effectiveToken);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }

  if (session.refreshToken) {
    localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, session.refreshToken);
  } else {
    localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
  }

  if (session.user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
  } else {
    localStorage.removeItem(AUTH_USER_KEY);
  }

  return readAuthSnapshot();
};

export const updateStoredTokens = (tokens: {
  token?: string;
  accessToken?: string;
  refreshToken?: string;
}): { token: string | null; refreshToken: string | null } => {
  if (!canUseStorage()) {
    return {
      token: tokens.accessToken || tokens.token || null,
      refreshToken: tokens.refreshToken || null,
    };
  }

  const effectiveToken = tokens.accessToken || tokens.token;
  if (effectiveToken) {
    localStorage.setItem(AUTH_TOKEN_KEY, effectiveToken);
  }

  if (tokens.refreshToken) {
    localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, tokens.refreshToken);
  }

  return {
    token: getStoredToken(),
    refreshToken: getStoredRefreshToken(),
  };
};

export const updateStoredUser = (user: User | null): void => {
  if (!canUseStorage()) return;
  if (!user) {
    localStorage.removeItem(AUTH_USER_KEY);
  } else {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }
};

export const clearStoredAuth = (): void => {
  if (!canUseStorage()) return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
};
