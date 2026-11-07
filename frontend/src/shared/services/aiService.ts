import axiosInstance from "./httpClient";
import type {
  ChatPayload,
  ConversationSnapshot,
  ConversationContextResponse,
  ChatResponse,
  GenerateTasksPayload,
  GenerateTasksResponse,
} from "../types/domain";
import type {
  ProposalAction,
  ProposalEnvelope,
} from "../types/A2UI/taskProposal";

export const aiService = {
  getConversationCapabilities: async (): Promise<{
    taskProposals: boolean;
    uiComposition?: boolean;
  }> => {
    const response = await axiosInstance.get<{
      taskProposals: boolean;
      uiComposition?: boolean;
    }>("/api/ai/conversations/capabilities");
    return response.data;
  },
  applyProposalAction: async (
    conversationId: string,
    proposalId: string,
    action: ProposalAction,
  ): Promise<ProposalEnvelope> => {
    const response = await axiosInstance.post<{
      success: boolean;
      data: ProposalEnvelope;
    }>(
      `/api/ai/conversations/${conversationId}/proposals/${proposalId}/actions`,
      action,
    );
    return response.data.data;
  },
  listConversations: async (): Promise<
    Array<{ id: string; title: string; updatedAt: string }>
  > => {
    const response = await axiosInstance.get<{
      data: Array<{ id: string; title: string; updatedAt: string }>;
    }>("/api/ai/conversations");
    return response.data.data;
  },
  getConversation: async (
    id?: string,
    before?: number,
  ): Promise<ConversationSnapshot | null> => {
    const response = await axiosInstance.get<{
      data: ConversationSnapshot | null;
    }>(id ? `/api/ai/conversations/${id}` : "/api/ai/conversations/latest", {
      params: before ? { before } : undefined,
    });
    return response.data.data;
  },
  createConversation: async (conversationId: string): Promise<string> => {
    const response = await axiosInstance.post<{ conversationId: string }>(
      "/api/ai/conversations",
      { conversationId },
    );
    return response.data.conversationId;
  },
  updateConversationContext: async (
    conversationId: string,
    projectId: string | null,
  ): Promise<ConversationContextResponse> => {
    const response = await axiosInstance.patch<{
      data: ConversationContextResponse;
    }>(`/api/ai/conversations/${conversationId}/context`, { projectId });
    return response.data.data;
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
