import axiosInstance, { type RequestOptions } from "./httpClient";
import { buildTaskMutationPayload } from "./projectHelpers";
import type { Task, TaskMutationPayload } from "../types/domain";

export const taskService = {
  // Create new task
  createTask: async (taskData: Partial<TaskMutationPayload>): Promise<Task> => {
    const response = await axiosInstance.post<Task>("/api/tasks", buildTaskMutationPayload(taskData));
    return response.data;
  },

  // Get all tasks
  getAllTasks: async (options?: RequestOptions): Promise<Task[]> => {
    const response = await axiosInstance.get<Task[]>("/api/tasks", options);
    return response.data;
  },

  // Get today's deadlines
  getTodayDeadlines: async (options?: RequestOptions): Promise<Task[]> => {
    const response = await axiosInstance.get<Task[]>("/api/tasks/today-deadlines", options);
    return response.data;
  },

  // Get tasks by date range
  getTasksByDateRange: async (startDate: string, endDate: string, options?: RequestOptions): Promise<Task[]> => {
    const response = await axiosInstance.get<Task[]>("/api/tasks", {
      ...options,
      params: { ...options?.params, startDate, endDate },
    });
    return response.data;
  },

  // Get tasks by status
  getTaskByStatus: async (status: string, options?: RequestOptions): Promise<Task[]> => {
    const response = await axiosInstance.get<Task[]>(`/api/tasks/status/${status}`, options);
    return response.data;
  },

  // Get tasks by category
  getTaskByCategory: async (categoryId: string, options?: RequestOptions): Promise<Task[]> => {
    const response = await axiosInstance.get<Task[]>(`/api/tasks/category/${categoryId}`, options);
    return response.data;
  },

  // Get task by ID
  getTaskById: async (taskId: string, options?: RequestOptions): Promise<Task> => {
    const response = await axiosInstance.get<Task>(`/api/tasks/${taskId}`, options);
    return response.data;
  },

  // Update task
  updateTask: async (taskId: string, taskData: Partial<TaskMutationPayload>): Promise<Task> => {
    const response = await axiosInstance.put<Task>(`/api/tasks/${taskId}`, buildTaskMutationPayload(taskData));
    return response.data;
  },

  // Start task
  startTask: async (taskId: string): Promise<Task> => {
    const response = await axiosInstance.put<Task>(`/api/tasks/${taskId}/start`);
    return response.data;
  },

  // Finish task
  finishTask: async (taskId: string): Promise<Task> => {
    const response = await axiosInstance.put<Task>(`/api/tasks/${taskId}/finish`);
    return response.data;
  },

  // Give up task
  giveUpTask: async (taskId: string): Promise<Task> => {
    const response = await axiosInstance.put<Task>(`/api/tasks/${taskId}/give-up`);
    return response.data;
  },

  // Restore task from given up to in progress
  restoreTask: async (taskId: string): Promise<Task> => {
    const response = await axiosInstance.put<Task>(
      `/api/tasks/${taskId}`,
      buildTaskMutationPayload({
        status: "in-progress",
      })
    );
    return response.data;
  },

  // Delete task
  deleteTask: async (taskId: string): Promise<unknown> => {
    const response = await axiosInstance.delete(`/api/tasks/${taskId}`);
    return response.data;
  },
};
