import { z } from "zod";

export const generateTasksSchema = z.object({
  userRequirement: z.string().min(1, "userRequirement is required").max(2000),
});

export const chatSchema = z.object({
  userInput: z.string().min(1, "userInput is required").max(2000),
});

export type GenerateTasksInput = z.infer<typeof generateTasksSchema>;
export type ChatInput = z.infer<typeof chatSchema>;

export const interactionSelectionSchema = z
  .strictObject({
    interactionId: z.uuid(),
    optionId: z.string().trim().min(1).max(100).optional(),
    customAnswer: z.string().trim().min(1).max(2000).optional(),
    cancel: z.literal(true).optional(),
  })
  .refine(
    (value) =>
      [
        Boolean(value.optionId),
        Boolean(value.customAnswer),
        Boolean(value.cancel),
      ].filter(Boolean).length === 1,
    { message: "Provide exactly one option, custom answer or cancellation" },
  );

export const conversationChatSchema = chatSchema.extend({
  conversationId: z.uuid(),
  requestId: z.uuid(),
  mode: z.enum(["auto", "ask"]).default("auto"),
  selection: interactionSelectionSchema.optional(),
});
export const conversationCreateSchema = z.object({ conversationId: z.uuid() });
export const conversationParamsSchema = z.object({ conversationId: z.uuid() });
export const conversationQuerySchema = z.object({
  before: z.coerce.number().int().positive().optional(),
});
