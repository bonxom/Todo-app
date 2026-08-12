import { z } from 'zod';
import { Priority, PRIORITIES } from '../constants/priority.js';
import { TASK_STATUSES } from '../constants/taskStatus.js';
import { objectIdSchema } from './commonValidation.js';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  priority: z.nativeEnum(Priority).optional(),
  categoryId: objectIdSchema('categoryId').optional(),
  projectId: objectIdSchema('projectId').optional().nullable(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(TASK_STATUSES as unknown as [string, ...string[]]).optional(),
  priority: z.nativeEnum(Priority).optional(),
  categoryId: z.union([objectIdSchema('categoryId'), z.literal(''), z.literal('uncategorized')]).optional().nullable(),
  projectId: z.union([objectIdSchema('projectId'), z.literal('')]).optional().nullable(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

export const taskQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).superRefine((value, context) => {
  if ((value.startDate === undefined) !== (value.endDate === undefined)) {
    context.addIssue({
      code: 'custom',
      path: ['startDate'],
      message: 'Both startDate and endDate are required for date range filtering',
    });
    return;
  }
  if (!value.startDate || !value.endDate) return;
  const start = new Date(value.startDate);
  const end = new Date(value.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    context.addIssue({ code: 'custom', path: ['startDate'], message: 'A valid date range is required' });
  }
});

export const taskStatusParamSchema = z.object({
  status: z.enum(TASK_STATUSES as unknown as [string, ...string[]]),
});

export const taskCategoryParamSchema = z.object({
  categoryId: objectIdSchema('categoryId'),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
