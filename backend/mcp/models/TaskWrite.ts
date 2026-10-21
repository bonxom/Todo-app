import { z } from "zod";
import { id } from "./common.js";

const idempotencyKey = z
  .string()
  .regex(/^[A-Za-z0-9_-]{16,128}$/)
  .describe(
    "Unique key for this user intent (e.g. UUID). Reuse exactly on retries with identical arguments; use a new key for a new action.",
  );
const taskFields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  priority: z.enum(["Low", "Medium", "High"]).optional(),
  categoryId: id
    .optional()
    .describe(
      "Use tool to list categories and their IDs. Omit for Uncategorized.",
    ),
  projectId: id
    .nullable()
    .optional()
    .describe(
      "Use tool to list projects and their IDs. Omit to leave unchanged.",
    ),
  startDate: z.iso.datetime({ offset: true }).nullable().optional(),
  dueDate: z.iso
    .datetime({ offset: true })
    .nullable()
    .optional()
    .describe("default set to 23:59 of the current date if not specified"),
};
export const createTaskInputSchema = z.strictObject({
  idempotencyKey,
  ...taskFields,
});
export const updateTaskInputSchema = z.strictObject({
  idempotencyKey,
  taskId: id,
  changes: z
    .strictObject({
      ...taskFields,
      status: z.enum(["in-progress", "completed", "given-up"]).optional(),
    })
    .partial()
    .refine(
      (value) => Object.keys(value).length > 0,
      "Provide at least one field to update.",
    ),
});
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;
