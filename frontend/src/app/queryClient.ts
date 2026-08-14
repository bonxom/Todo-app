import { QueryClient } from "@tanstack/react-query";

export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 0,
        gcTime: 10 * 60 * 1000,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
    },
  });

export const queryClient = createQueryClient();
