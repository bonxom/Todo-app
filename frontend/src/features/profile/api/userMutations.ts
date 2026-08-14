import { useMutation, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import { authService } from "../../../shared/services/authService";
import { useAuthStore } from "../../../stores/useAuthStore";
import type { ChangePasswordPayload, UpdateProfilePayload, User } from "../../../shared/types/domain";
import { userKeys } from "./userKeys";

export const useUpdateProfileMutation = (
  options?: UseMutationOptions<{ user?: User; [key: string]: unknown }, Error, UpdateProfilePayload>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => authService.updateInfo(payload),
    onSuccess: async (...args) => {
      const [data] = args;
      const normalizedUser = (data?.user ?? data) as User;
      if (normalizedUser && typeof normalizedUser === "object" && "email" in normalizedUser) {
        useAuthStore.getState().syncUser(normalizedUser);
        queryClient.setQueryData(userKeys.me(), normalizedUser);
      }
      await options?.onSuccess?.(...args);
    },
    ...options,
  });
};

export const useChangePasswordMutation = (
  options?: UseMutationOptions<unknown, Error, ChangePasswordPayload>
) => {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => authService.changePassword(payload),
    ...options,
  });
};
