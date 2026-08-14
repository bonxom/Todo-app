import { useMutation, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import { authService } from "../../../shared/services/authService";
import { useAuthStore } from "../../../stores/useAuthStore";
import type { AuthSession, LoginPayload, RegisterPayload } from "../../../shared/types/domain";

export const useLoginMutation = (
  options?: UseMutationOptions<AuthSession, Error, LoginPayload>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credentials: LoginPayload) => {
      const response = await authService.login(credentials);
      queryClient.removeQueries();
      useAuthStore.getState().setSession(response);
      return response;
    },
    ...options,
  });
};

export const useRegisterMutation = (
  options?: UseMutationOptions<AuthSession, Error, RegisterPayload>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userData: RegisterPayload) => {
      const response = await authService.register(userData);
      queryClient.removeQueries();
      useAuthStore.getState().setSession(response);
      return response;
    },
    ...options,
  });
};

export const useLogoutMutation = (
  options?: UseMutationOptions<unknown, Error, void>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        return await authService.logout();
      } finally {
        queryClient.removeQueries();
        useAuthStore.getState().clearSession();
      }
    },
    ...options,
  });
};
