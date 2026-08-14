import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import {
  getProtectedDecision,
  getPublicOnlyDecision,
  getRootDecision,
} from './guardDecisions';

export const AuthLoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--color-canvas)] text-sm font-medium text-[var(--color-text-muted)]">
    Checking your session…
  </div>
);

export const ProtectedGuard = () => {
  const isAuthReady = useAuthStore((state) => state.isAuthReady);
  const token = useAuthStore((state) => state.token);
  const decision = getProtectedDecision({ isAuthReady, token });

  if (decision === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (decision === '/login') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export const PublicOnlyGuard = () => {
  const isAuthReady = useAuthStore((state) => state.isAuthReady);
  const token = useAuthStore((state) => state.token);
  const decision = getPublicOnlyDecision({ isAuthReady, token });

  if (decision === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (decision === '/dashboard') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export const RootGuard = () => {
  const isAuthReady = useAuthStore((state) => state.isAuthReady);
  const token = useAuthStore((state) => state.token);
  const decision = getRootDecision({ isAuthReady, token });

  if (decision === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (decision === '/dashboard') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
