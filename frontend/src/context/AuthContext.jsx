import React, { createContext, useCallback, useEffect, useSyncExternalStore } from 'react';
import { authService } from '../shared/services/authService';
import { useAuthStore } from '../stores/useAuthStore';
import { ApiError } from '../shared/services/apiError';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const token = useSyncExternalStore(
    useAuthStore.subscribe,
    () => useAuthStore.getState().token,
    () => useAuthStore.getState().token
  );
  const user = useSyncExternalStore(
    useAuthStore.subscribe,
    () => useAuthStore.getState().user,
    () => useAuthStore.getState().user
  );
  const isAuthReady = useSyncExternalStore(
    useAuthStore.subscribe,
    () => useAuthStore.getState().isAuthReady,
    () => useAuthStore.getState().isAuthReady
  );

  useEffect(() => {
    let isCancelled = false;

    const restoreAuth = async () => {
      const storedToken = useAuthStore.getState().token;

      if (!storedToken) {
        if (!isCancelled) {
          useAuthStore.getState().setAuthReady(true);
        }
        return;
      }

      try {
        const currentUser = await authService.getMe();
        if (!isCancelled) {
          useAuthStore.getState().syncUser(currentUser);
        }
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          if (!isCancelled) {
            useAuthStore.getState().clearSession();
          }
        }
      } finally {
        if (!isCancelled) {
          useAuthStore.getState().setAuthReady(true);
        }
      }
    };

    restoreAuth();

    return () => {
      isCancelled = true;
    };
  }, []);

  const setSession = useCallback((session) => {
    useAuthStore.getState().setSession(session);
  }, []);

  const clearSession = useCallback(() => {
    useAuthStore.getState().clearSession();
  }, []);

  const syncUser = useCallback((nextUser) => {
    useAuthStore.getState().syncUser(nextUser);
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
