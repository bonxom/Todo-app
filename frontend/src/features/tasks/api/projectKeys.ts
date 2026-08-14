import type { EntityId } from "../../../shared/types/domain";

export const projectKeys = {
  all: ["projects"] as const,
  list: () => [...projectKeys.all, "list"] as const,
  detail: (projectId: EntityId) => [...projectKeys.all, "detail", projectId] as const,
  tasks: (projectId: EntityId) => [...projectKeys.all, "tasks", projectId] as const,
};
