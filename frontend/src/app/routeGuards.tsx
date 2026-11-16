import { useTranslation } from "react-i18next";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../stores/useAuthStore";
import {
  getProtectedDecision,
  getPublicOnlyDecision,
  getRootDecision,
} from "./guardDecisions";
import { resolveEntryTarget } from "@/shared/navigation/entryTarget";

export const AuthLoadingScreen = () => {
  const { t } = useTranslation("common");
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-canvas)] text-sm font-medium text-[var(--color-text-muted)]">
      {t("checkingSession")}
    </div>
  );
};

export const ProtectedGuard = () => {
  const location = useLocation();
  const isAuthReady = useAuthStore((state) => state.isAuthReady);
  const token = useAuthStore((state) => state.token);
  const decision = getProtectedDecision({ isAuthReady, token });

  if (decision === "loading") {
    return <AuthLoadingScreen />;
  }

  if (decision === "/login") {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          returnTo: location.pathname + location.search + location.hash,
        }}
      />
    );
  }

  return <Outlet />;
};

export const PublicOnlyGuard = () => {
  const location = useLocation();
  const isAuthReady = useAuthStore((state) => state.isAuthReady);
  const token = useAuthStore((state) => state.token);
  const decision = getPublicOnlyDecision({ isAuthReady, token });

  if (decision === "loading") {
    return <AuthLoadingScreen />;
  }

  if (decision === "/dashboard") {
    const returnTo = (location.state as { returnTo?: unknown } | null)
      ?.returnTo;
    const target = resolveEntryTarget(returnTo);
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
};

export const RootGuard = () => {
  const isAuthReady = useAuthStore((state) => state.isAuthReady);
  const token = useAuthStore((state) => state.token);
  const decision = getRootDecision({ isAuthReady, token });

  if (decision === "loading") {
    return <AuthLoadingScreen />;
  }

  if (decision === "/dashboard") {
    const target = resolveEntryTarget();
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
};
