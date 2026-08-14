import axiosInstance, { type RequestOptions } from "./httpClient";
import { normalizeProject, normalizeProjects, normalizeProjectTasks, type ProjectTasksResponse } from "./projectHelpers";
import type { Project, ProjectMutationPayload, ProjectWithSummary } from "../types/domain";

export const projectService = {
  // Create new project
  createProject: async (projectData: ProjectMutationPayload): Promise<Project> => {
    const response = await axiosInstance.post<Project>("/api/projects", projectData);
    return normalizeProject(response.data);
  },

  // Get all projects
  getAllProjects: async (options?: RequestOptions): Promise<ProjectWithSummary[]> => {
    const response = await axiosInstance.get<ProjectWithSummary[]>("/api/projects", options);
    return normalizeProjects(response.data);
  },

  // Get project by ID
  getProjectById: async (projectId: string, options?: RequestOptions): Promise<Project> => {
    const response = await axiosInstance.get<Project>(`/api/projects/${projectId}`, options);
    return normalizeProject(response.data);
  },

  // Update project
  updateProject: async (projectId: string, projectData: ProjectMutationPayload): Promise<Project> => {
    const response = await axiosInstance.put<Project>(`/api/projects/${projectId}`, projectData);
    return normalizeProject(response.data);
  },

  // Delete project
  deleteProject: async (projectId: string): Promise<unknown> => {
    const response = await axiosInstance.delete(`/api/projects/${projectId}`);
    return response.data;
  },

  // Get tasks for a single project
  getProjectTasks: async (projectId: string, options?: RequestOptions): Promise<ProjectTasksResponse> => {
    const response = await axiosInstance.get<ProjectTasksResponse>(`/api/projects/${projectId}/tasks`, options);
    return normalizeProjectTasks(response.data);
  },
};
