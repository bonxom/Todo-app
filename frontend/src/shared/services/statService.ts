import axiosInstance, { type RequestOptions } from "./httpClient";
import type { Stat, Task } from "../types/domain";

export const statService = {
  // Get user stats
  getUserStats: async (options?: RequestOptions): Promise<Stat> => {
    const response = await axiosInstance.get<Stat>("/api/stats/", options);
    return response.data;
  },

  // Get completed tasks for a heatmap day
  getCompletedTasksByDate: async (date: string, options?: RequestOptions): Promise<Task[]> => {
    const response = await axiosInstance.get<{ date: string; tasks: Task[] } | Task[]>("/api/stats/completed-tasks", {
      ...options,
      params: { ...options?.params, date },
    });
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return (response.data as { tasks: Task[] })?.tasks || [];
  },
};
