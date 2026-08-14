import axiosInstance from "./httpClient";
import type { ChatPayload, ChatResponse, GenerateTasksPayload, GenerateTasksResponse } from "../types/domain";

export const aiService = {
  // Generate tasks based on user requirement
  generateTasks: async (requirementData: GenerateTasksPayload): Promise<GenerateTasksResponse> => {
    const response = await axiosInstance.post<GenerateTasksResponse>("/api/ai/generate-tasks", requirementData);
    return response.data;
  },

  // Get AI chat response
  getChatResponse: async (userInput: ChatPayload): Promise<ChatResponse> => {
    const response = await axiosInstance.post<ChatResponse>("/api/ai/chat", userInput);
    return response.data;
  },
};
