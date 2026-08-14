import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { categoryService } from "../../../shared/services/categoryService";
import type { Category, EntityId } from "../../../shared/types/domain";
import { categoryKeys } from "./categoryKeys";

export const useCategoriesQuery = (
  options?: Omit<UseQueryOptions<Category[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: categoryKeys.list(),
    queryFn: ({ signal }) => categoryService.getAllCategories({ signal }),
    ...options,
  });
};

export const useCategoryQuery = (
  categoryId: EntityId,
  options?: Omit<UseQueryOptions<Category, Error>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: categoryKeys.detail(categoryId),
    queryFn: ({ signal }) => categoryService.getCategoryById(categoryId, { signal }),
    enabled: Boolean(categoryId) && (options?.enabled ?? true),
    ...options,
  });
};
