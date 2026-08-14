import React, { useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryClient as defaultQueryClient } from "./queryClient";
import { registerUserCacheReset } from "../shared/services/sessionCache";

export interface QueryProviderProps {
  children: ReactNode;
  client?: QueryClient;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children, client = defaultQueryClient }) => {
  useEffect(() => {
    const unregister = registerUserCacheReset(() => {
      client.removeQueries();
    });

    return unregister;
  }, [client]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

export default QueryProvider;
