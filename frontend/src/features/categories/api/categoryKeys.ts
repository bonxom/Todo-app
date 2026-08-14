import type { EntityId } from "../../../shared/types/domain";

export const categoryKeys = {
  all: ["categories"] as const,
  list: () => [...categoryKeys.all, "list"] as const,
  detail: (categoryId: EntityId) => [...categoryKeys.all, "detail", categoryId] as const,
  tasks: (categoryId: EntityId) => [...categoryKeys.all, "tasks", categoryId] as const,
};
