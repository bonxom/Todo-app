import { z } from "zod";

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/);
const isoDatetimeString = z.iso.datetime();
const taskStatus = z.enum(["pending", "in-progress", "completed", "given-up"]);

export const taskDtoSchema = z.strictObject({
  id: objectIdString,
  title: z.string(),
  description: z.string().nullable(),
  status: taskStatus,
  priority: z.enum(["Low", "Medium", "High"]),
  categoryId: objectIdString.nullable(),
  projectId: objectIdString.nullable(),
  startDate: isoDatetimeString.nullable(),
  dueDate: isoDatetimeString.nullable(),
  completedAt: isoDatetimeString.nullable(),
  createdAt: isoDatetimeString,
  updatedAt: isoDatetimeString,
});

export type TaskDto = z.infer<typeof taskDtoSchema>;
