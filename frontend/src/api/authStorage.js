const AUTH_TOKEN_KEY = 'token';
const AUTH_REFRESH_TOKEN_KEY = 'refreshToken';
const AUTH_USER_KEY = 'user';

const canUseStorage = () => typeof window !== 'undefined';

export const getStoredToken = () => {
  if (!canUseStorage()) {
    return null;
  }

  return localStorage.getItem(AUTH_TOKEN_KEY);
};

export const getStoredRefreshToken = () => {
  if (!canUseStorage()) {
    return null;
  }

  return localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
};

export const getStoredUser = () => {
  if (!canUseStorage()) {
    return null;
  }

  const storedUser = localStorage.getItem(AUTH_USER_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
};

export const persistAuthSession = ({ token, accessToken, refreshToken, user }) => {
  if (!canUseStorage()) {
    return;
  }

  const effectiveAccessToken = accessToken || token;

  if (effectiveAccessToken) {
    localStorage.setItem(AUTH_TOKEN_KEY, effectiveAccessToken);
  }

  if (refreshToken) {
    localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken);
  }

  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }
};

export const updateStoredTokens = ({ token, accessToken, refreshToken }) => {
  if (!canUseStorage()) {
    return;
  }

  const effectiveAccessToken = accessToken || token;

  if (effectiveAccessToken) {
    localStorage.setItem(AUTH_TOKEN_KEY, effectiveAccessToken);
  }

  if (refreshToken) {
    localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken);
  }
};

export const updateStoredUser = (user) => {
  if (!canUseStorage()) {
    return;
  }

  if (!user) {
    localStorage.removeItem(AUTH_USER_KEY);
    return;
  }

  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

export const clearStoredAuth = () => {
  if (!canUseStorage()) {
    return;
  }

  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
};
