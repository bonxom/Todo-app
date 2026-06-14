import { createContext, useCallback, useEffect, useState } from 'react';
import { authService } from '../api/apiService';
import {
  clearStoredAuth,
  getStoredToken,
  getStoredUser,
  persistAuthSession,
  updateStoredUser,
} from '../api/authStorage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => getStoredUser());
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const restoreAuth = async () => {
      const storedToken = getStoredToken();

      if (!storedToken) {
        if (!isCancelled) {
          setToken(null);
          setUser(null);
          setIsAuthReady(true);
        }
        return;
      }

      try {
        const currentUser = await authService.getMe();

        if (!isCancelled) {
          setToken(storedToken);
          setUser(currentUser);
        }
      } catch {
        clearStoredAuth();

        if (!isCancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!isCancelled) {
          setIsAuthReady(true);
        }
      }
    };

    restoreAuth();

    return () => {
      isCancelled = true;
    };
  }, []);

  const setSession = useCallback((session) => {
    persistAuthSession(session);
    setToken(session?.token ?? null);
    setUser(session?.user ?? null);
  }, []);

  const clearSession = useCallback(() => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
  }, []);

  const syncUser = useCallback((nextUser) => {
    updateStoredUser(nextUser);
    setUser(nextUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: Boolean(token),
        isAuthReady,
        setSession,
        clearSession,
        syncUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
