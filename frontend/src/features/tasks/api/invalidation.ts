import type { QueryClient } from "@tanstack/react-query";
import { taskKeys } from "./taskKeys";
import { projectKeys } from "./projectKeys";
import { categoryKeys } from "../../categories/api/categoryKeys";
import { statKeys } from "../../statistics/api/statKeys";

export const invalidateTaskDependents = async (client: QueryClient): Promise<void> => {
  await Promise.all([
    client.invalidateQueries({ queryKey: taskKeys.all }),
    client.invalidateQueries({ queryKey: projectKeys.all }),
    client.invalidateQueries({ queryKey: categoryKeys.all }),
    client.invalidateQueries({ queryKey: statKeys.all }),
  ]);
};

export const invalidateWorkspaceQueries = async (client: QueryClient): Promise<void> => {
  await invalidateTaskDependents(client);
};
