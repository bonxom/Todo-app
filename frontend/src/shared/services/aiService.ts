import axiosInstance from "./httpClient";
import type {
  ChatPayload,
  ConversationSnapshot,
  ChatResponse,
  GenerateTasksPayload,
  GenerateTasksResponse,
} from "../types/domain";

export const aiService = {
  getConversation: async (id?: string, before?: number): Promise<ConversationSnapshot | null> => {
    const response = await axiosInstance.get<{ data: ConversationSnapshot | null }>(
      id ? `/api/ai/conversations/${id}` : "/api/ai/conversations/latest",
      { params: before ? { before } : undefined },
    );
    return response.data.data;
  },
  createConversation: async (conversationId: string): Promise<string> => {
    const response = await axiosInstance.post<{ conversationId: string }>("/api/ai/conversations", { conversationId });
    return response.data.conversationId;
  },
  // Generate tasks based on user requirement
  generateTasks: async (
    requirementData: GenerateTasksPayload,
  ): Promise<GenerateTasksResponse> => {
    const response = await axiosInstance.post<GenerateTasksResponse>(
      "/api/ai/generate-tasks",
      requirementData,
    );
    return response.data;
  },

  // Get AI chat response
  getChatResponse: async (userInput: ChatPayload): Promise<ChatResponse> => {
    const response = await axiosInstance.post<ChatResponse>(
      "/api/ai/chat",
      userInput,
    );
    return response.data;
  },

  // Agentic AI chat response (MCP Server)
  getAgenticChatResponse: async (
    userInput: ChatPayload,
  ): Promise<ChatResponse> => {
    const response = await axiosInstance.post<ChatResponse>(
      "/api/ai/chat-mcp",
      userInput,
    );
    return response.data;
  },
};
