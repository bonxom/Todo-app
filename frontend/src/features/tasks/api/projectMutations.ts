import { useMutation, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import { projectService } from "../../../shared/services/projectService";
import type { EntityId, Project, ProjectMutationPayload } from "../../../shared/types/domain";
import { invalidateTaskDependents } from "./invalidation";
import { projectKeys } from "./projectKeys";
import { taskKeys } from "./taskKeys";
import { statKeys } from "../../statistics/api/statKeys";

export const useCreateProjectMutation = (
  options?: UseMutationOptions<Project, Error, ProjectMutationPayload>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectMutationPayload) => projectService.createProject(payload),
    onSuccess: async (...args) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectKeys.all }),
        queryClient.invalidateQueries({ queryKey: taskKeys.all }),
        queryClient.invalidateQueries({ queryKey: statKeys.all }),
      ]);
      await options?.onSuccess?.(...args);
    },
    ...options,
  });
};

export interface UpdateProjectVariables {
  projectId: EntityId;
  payload: ProjectMutationPayload;
}

export const useUpdateProjectMutation = (
  options?: UseMutationOptions<Project, Error, UpdateProjectVariables>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, payload }: UpdateProjectVariables) =>
      projectService.updateProject(projectId, payload),
    onSuccess: async (...args) => {
      await invalidateTaskDependents(queryClient);
      await options?.onSuccess?.(...args);
    },
    ...options,
  });
};

export const useDeleteProjectMutation = (
  options?: UseMutationOptions<unknown, Error, EntityId>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: EntityId) => projectService.deleteProject(projectId),
    onSuccess: async (...args) => {
      await invalidateTaskDependents(queryClient);
      await options?.onSuccess?.(...args);
    },
    ...options,
  });
};
