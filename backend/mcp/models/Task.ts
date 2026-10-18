import { z } from "zod";
import { id, pageShape, pageInfo, date } from "./common.js";

const status = z.enum(["pending", "in-progress", "completed", "given-up"]);

export const getTaskInputSchema = z.strictObject({
  taskId: id.describe("Task ID returned by orbit_list_tasks."),
});

export const listTasksInputSchema = z
  .strictObject({
    ...pageShape,
    search: z
      .string()
      .max(200)
      .trim()
      .optional()
      .describe("Literal, case-insensitive title or description search."),
    status: status.optional(),
    projectId: z
      .union([id, z.literal("standalone")])
      .optional()
      .describe("Project ID or standalone for tasks without a project."),
    startDate: z.iso
      .datetime({ offset: true })
      .optional()
      .describe(
        "Inclusive dueDate lower bound with timezone; requires endDate.",
      ),
    endDate: z.iso
      .datetime({ offset: true })
      .optional()
      .describe(
        "Inclusive dueDate upper bound with timezone; requires startDate.",
      ),
    sort: z
      .enum([
        "dueDate:asc",
        "dueDate:desc",
        "createdAt:asc",
        "createdAt:desc",
        "title:asc",
        "title:desc",
      ])
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (
      (value.startDate === undefined) !== (value.endDate === undefined) ||
      (value.startDate &&
        value.endDate &&
        Date.parse(value.startDate) > Date.parse(value.endDate))
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["startDate"],
        message: "Provide both dueDate bounds in ascending order.",
      });
    }
  });

export const taskDtoSchema = z.strictObject({
  id,
  title: z.string(),
  description: z.string().nullable(),
  status,
  priority: z.enum(["Low", "Medium", "High"]),
  categoryId: id.nullable(),
  projectId: id.nullable(),
  startDate: date.nullable(),
  dueDate: date.nullable(),
  completedAt: date.nullable(),
  createdAt: date,
  updatedAt: date,
});

export const taskPageOutputSchema = z.strictObject({
  pageInfo,
  data: z.array(taskDtoSchema),
});

export const getTaskOutputSchema = z.strictObject({ task: taskDtoSchema });

export type TaskDto = z.infer<typeof taskDtoSchema>;
export type ListTasksInput = z.infer<typeof listTasksInputSchema>;
