const AUTH_TOKEN_KEY = 'token';
const AUTH_USER_KEY = 'user';

const canUseStorage = () => typeof window !== 'undefined';

export const getStoredToken = () => {
  if (!canUseStorage()) {
    return null;
  }

  return localStorage.getItem(AUTH_TOKEN_KEY);
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

export const persistAuthSession = ({ token, user }) => {
  if (!canUseStorage()) {
    return;
  }

  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }

  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    return;
  }

  localStorage.removeItem(AUTH_USER_KEY);
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
  localStorage.removeItem(AUTH_USER_KEY);
};
