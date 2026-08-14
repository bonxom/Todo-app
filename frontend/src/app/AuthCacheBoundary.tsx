import React, { useLayoutEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../stores/useAuthStore";

export interface AuthCacheBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

const DefaultAuthLoading = () => (
  <div className="auth-loading-screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
    <div className="auth-loading-spinner" />
    <p>Checking session...</p>
  </div>
);

export const AuthCacheBoundary: React.FC<AuthCacheBoundaryProps> = ({
  children,
  fallback = <DefaultAuthLoading />,
}) => {
  const sessionRevision = useAuthStore((state) => state.sessionRevision);
  const [handledRevision, setHandledRevision] = useState(sessionRevision);
  const queryClient = useQueryClient();

  useLayoutEffect(() => {
    if (sessionRevision !== handledRevision) {
      queryClient.removeQueries();
      setHandledRevision(sessionRevision);
    }
  }, [sessionRevision, handledRevision, queryClient]);

  if (sessionRevision !== handledRevision) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default AuthCacheBoundary;
