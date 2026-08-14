import type { Project, ProjectWithSummary, Task, TaskMutationPayload } from "../types/domain";

export const normalizeEntityResponse = <T>(payload: unknown, entityKey: string): T => {
  if (payload && typeof payload === "object" && entityKey in payload) {
    const record = payload as Record<string, unknown>;
    return record[entityKey] as T;
  }

  return payload as T;
};

export const normalizeCollectionResponse = <T>(payload: unknown, collectionKey: string): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object" && collectionKey in payload) {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record[collectionKey])) {
      return record[collectionKey] as T[];
    }
  }

  return [];
};

export const buildTaskMutationPayload = (taskData: Partial<TaskMutationPayload> = {}): Partial<TaskMutationPayload> => {
  const payload: Record<string, unknown> = { ...taskData };

  if (payload.projectId === "") {
    payload.projectId = null;
  }

  if (payload.projectId === undefined) {
    delete payload.projectId;
  }

  return payload as Partial<TaskMutationPayload>;
};

export const normalizeProject = (payload: unknown): Project => normalizeEntityResponse<Project>(payload, "project");

export const normalizeProjects = (payload: unknown): ProjectWithSummary[] =>
  normalizeCollectionResponse<ProjectWithSummary>(payload, "projects");

export interface ProjectTasksResponse {
  project: Project | null;
  tasks: Task[];
  [key: string]: unknown;
}

export const normalizeProjectTasks = (payload: unknown): ProjectTasksResponse => {
  const normalizedPayload = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  return {
    ...normalizedPayload,
    project: normalizedPayload.project ? normalizeProject(normalizedPayload.project) : null,
    tasks: normalizeCollectionResponse<Task>(normalizedPayload.tasks, "tasks"),
  };
};
