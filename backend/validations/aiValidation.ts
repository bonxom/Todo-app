import { z } from 'zod';

export const generateTasksSchema = z.object({
  userRequirement: z.string().min(1, 'userRequirement is required').max(2000),
});

export const chatSchema = z.object({
  userInput: z.string().min(1, 'userInput is required').max(2000),
});

export type GenerateTasksInput = z.infer<typeof generateTasksSchema>;
export type ChatInput = z.infer<typeof chatSchema>;
