import { z } from "zod";
import { normalizeTimeZone } from "../utils/agentTimeContext.js";
import { interactionSelectionSchema } from "./aiValidation.js";

export const startChatTurnParamsSchema = z.object({
  conversationId: z.uuid(),
});

export const startChatTurnBodySchema = z.object({
  userInput: z
    .string()
    .min(1)
    .max(2000)
    .refine((value) => Boolean(value.trim()), "A text message is required"),
  attachmentIds: z
    .array(z.uuid())
    .max(4)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "Attachment IDs must be unique",
    )
    .optional(),
  requestId: z.uuid(),
  mode: z.enum(["auto", "ask"]).default("auto"),
  intent: z.enum(["task_proposal"]).optional(),
  timeZone: z
    .string()
    .max(100)
    .refine(
      (value) => {
        try {
          normalizeTimeZone(value);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Invalid IANA time zone" },
    )
    .optional(),
  selection: interactionSelectionSchema.optional(),
});

export type StartChatTurnBody = z.infer<typeof startChatTurnBodySchema>;

export const chatTurnParamsSchema = z.object({
  conversationId: z.uuid(),
  turnId: z.string().min(1),
});

export const chatEventsParamsSchema = z.object({
  conversationId: z.uuid(),
  turnId: z.string().min(1),
});

export const cancelChatTurnParamsSchema = z.object({
  conversationId: z.uuid(),
  turnId: z.string().min(1),
});
