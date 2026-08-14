import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { authService } from "../../../shared/services/authService";
import type { User } from "../../../shared/types/domain";
import { userKeys } from "./userKeys";

export const useCurrentUserQuery = (
  options?: Omit<UseQueryOptions<User, Error>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: userKeys.me(),
    queryFn: ({ signal }) => authService.getMe({ signal }),
    ...options,
  });
};
