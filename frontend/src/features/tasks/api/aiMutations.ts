import { useMutation, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import { aiService } from "../../../shared/services/aiService";
import type { ChatPayload, ChatResponse, GenerateTasksPayload, GenerateTasksResponse } from "../../../shared/types/domain";
import { invalidateWorkspaceQueries } from "./invalidation";

export const useGenerateTasksMutation = (
  options?: UseMutationOptions<GenerateTasksResponse, Error, GenerateTasksPayload>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GenerateTasksPayload) => aiService.generateTasks(payload),
    onSuccess: async (...args) => {
      await invalidateWorkspaceQueries(queryClient);
      await options?.onSuccess?.(...args);
    },
    ...options,
  });
};

export const useChatMutation = (
  options?: UseMutationOptions<ChatResponse, Error, ChatPayload>
) => {
  return useMutation({
    mutationFn: (payload: ChatPayload) => aiService.getChatResponse(payload),
    ...options,
  });
};
