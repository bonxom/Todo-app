import { useMutation, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import { categoryService } from "../../../shared/services/categoryService";
import type { Category, CategoryMutationPayload, EntityId } from "../../../shared/types/domain";
import { invalidateTaskDependents } from "../../tasks/api/invalidation";
import { categoryKeys } from "./categoryKeys";
import { taskKeys } from "../../tasks/api/taskKeys";
import { statKeys } from "../../statistics/api/statKeys";

export const useCreateCategoryMutation = (
  options?: UseMutationOptions<Category, Error, CategoryMutationPayload>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CategoryMutationPayload) => categoryService.createCategory(payload),
    onSuccess: async (...args) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
        queryClient.invalidateQueries({ queryKey: taskKeys.all }),
        queryClient.invalidateQueries({ queryKey: statKeys.all }),
      ]);
      await options?.onSuccess?.(...args);
    },
    ...options,
  });
};

export interface UpdateCategoryVariables {
  categoryId: EntityId;
  payload: CategoryMutationPayload;
}

export const useUpdateCategoryMutation = (
  options?: UseMutationOptions<Category, Error, UpdateCategoryVariables>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, payload }: UpdateCategoryVariables) =>
      categoryService.updateCategory(categoryId, payload),
    onSuccess: async (...args) => {
      await invalidateTaskDependents(queryClient);
      await options?.onSuccess?.(...args);
    },
    ...options,
  });
};

export const useDeleteCategoryMutation = (
  options?: UseMutationOptions<unknown, Error, EntityId>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: EntityId) => categoryService.deleteCategory(categoryId),
    onSuccess: async (...args) => {
      await invalidateTaskDependents(queryClient);
      await options?.onSuccess?.(...args);
    },
    ...options,
  });
};
