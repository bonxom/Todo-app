import { z } from 'zod';
import { Priority, PRIORITIES } from '../constants/priority.js';
import { TASK_STATUSES } from '../constants/taskStatus.js';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  priority: z.nativeEnum(Priority).optional(),
  categoryId: z.string().optional(),
  projectId: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(TASK_STATUSES as unknown as [string, ...string[]]).optional(),
  priority: z.nativeEnum(Priority).optional(),
  categoryId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
