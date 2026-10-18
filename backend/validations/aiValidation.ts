import { z } from "zod";

export const generateTasksSchema = z.object({
  userRequirement: z.string().min(1, "userRequirement is required").max(2000),
});

export const chatSchema = z.object({
  userInput: z.string().min(1, "userInput is required").max(2000),
});

export type GenerateTasksInput = z.infer<typeof generateTasksSchema>;
export type ChatInput = z.infer<typeof chatSchema>;

export const conversationChatSchema = chatSchema.extend({
  conversationId: z.uuid(), requestId: z.uuid(),
});
export const conversationCreateSchema = z.object({ conversationId: z.uuid() });
export const conversationParamsSchema = z.object({ conversationId: z.uuid() });
export const conversationQuerySchema = z.object({ before: z.coerce.number().int().positive().optional() });
