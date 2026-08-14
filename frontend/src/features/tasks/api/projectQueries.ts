import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { projectService } from "../../../shared/services/projectService";
import type { EntityId, Project, ProjectWithSummary } from "../../../shared/types/domain";
import type { ProjectTasksResponse } from "../../../shared/services/projectHelpers";
import { projectKeys } from "./projectKeys";

export const useProjectsQuery = (
  options?: Omit<UseQueryOptions<ProjectWithSummary[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: ({ signal }) => projectService.getAllProjects({ signal }),
    ...options,
  });
};

export const useProjectQuery = (
  projectId: EntityId,
  options?: Omit<UseQueryOptions<Project, Error>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: ({ signal }) => projectService.getProjectById(projectId, { signal }),
    enabled: Boolean(projectId) && (options?.enabled ?? true),
    ...options,
  });
};

export const useProjectTasksQuery = (
  projectId: EntityId,
  options?: Omit<UseQueryOptions<ProjectTasksResponse, Error>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: projectKeys.tasks(projectId),
    queryFn: ({ signal }) => projectService.getProjectTasks(projectId, { signal }),
    enabled: Boolean(projectId) && (options?.enabled ?? true),
    ...options,
  });
};
