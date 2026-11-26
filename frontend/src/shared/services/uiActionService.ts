import { z } from "zod";
import type {
  UiActionInput,
  UiActionLocation,
  UiActionResult,
} from "../types/A2UI/uiAction";
import axiosInstance from "./httpClient";

const objectIdRegex = /^[a-fA-F0-9]{24}$/;
const isoDatetimeSchema = z.string().datetime({ offset: true });

export const taskDtoSchema = z
  .object({
    id: z.string().regex(objectIdRegex),
    title: z.string(),
    description: z.string().nullable(),
    status: z.enum(["pending", "in-progress", "completed", "given-up"]),
    priority: z.enum(["Low", "Medium", "High"]),
    categoryId: z.string().regex(objectIdRegex).nullable(),
    projectId: z.string().regex(objectIdRegex).nullable(),
    startDate: isoDatetimeSchema.nullable(),
    dueDate: isoDatetimeSchema.nullable(),
    completedAt: isoDatetimeSchema.nullable(),
    createdAt: isoDatetimeSchema,
    updatedAt: isoDatetimeSchema,
  })
  .strict();

export const uiActionResultSchema: z.ZodType<UiActionResult> = z
  .object({
    requestId: z.string().uuid(),
    actionId: z.string().uuid(),
    outcome: z.literal("succeeded"),
    task: taskDtoSchema,
  })
  .strict();

export const uiActionService = {
  async submit(
    location: UiActionLocation,
    input: UiActionInput,
  ): Promise<UiActionResult> {
    const response = await axiosInstance.post(
      `/api/ai/conversations/${location.conversationId}/turns/${location.turnId}/surfaces/${location.surfaceId}/actions`,
      {
        requestId: input.requestId,
        actionId: input.actionId,
      },
    );
    return uiActionResultSchema.parse(response.data);
  },
};
