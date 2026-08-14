import React, { useEffect, useRef, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/useAuthStore';
import { userKeys } from '../features/profile/api/userKeys';
import { authService } from '../shared/services/authService';
import { ApiError } from '../shared/services/apiError';

export interface AuthBootstrapProps {
  children: ReactNode;
}

export const AuthBootstrap: React.FC<AuthBootstrapProps> = ({ children }) => {
  const token = useAuthStore((state) => state.token);
  const isAuthReady = useAuthStore((state) => state.isAuthReady);
  const syncUser = useAuthStore((state) => state.syncUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setAuthReady = useAuthStore((state) => state.setAuthReady);

  const initialTokenRef = useRef(token);

  const userQuery = useQuery({
    queryKey: userKeys.current(),
    queryFn: () => authService.getMe(),
    enabled: Boolean(token),
    retry: (failureCount, error) =>
      error instanceof ApiError && ![401, 403].includes(error.status ?? 0) && failureCount < 1,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!initialTokenRef.current) {
      if (!isAuthReady) {
        setAuthReady(true);
      }
      return;
    }

    if (userQuery.isSuccess && userQuery.data) {
      syncUser(userQuery.data);
      if (!isAuthReady) {
        setAuthReady(true);
      }
    } else if (userQuery.isError) {
      const error = userQuery.error;
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        clearSession();
      }
      if (!isAuthReady) {
        setAuthReady(true);
      }
    }
  }, [
    userQuery.isSuccess,
    userQuery.isError,
    userQuery.data,
    userQuery.error,
    isAuthReady,
    setAuthReady,
    syncUser,
    clearSession,
  ]);

  return <>{children}</>;
};

export default AuthBootstrap;
