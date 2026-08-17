import type { ErrorDefinition } from '../ErrorDefinition.js';

export const TASK_ERROR = {
  NOT_FOUND: { code: 'TASK_0001', message: 'Task not found', statusCode: 404 },
  ACCESS_DENIED: { code: 'TASK_0002', message: 'You do not have access to this task', statusCode: 403 },
  STATUS_INVALID: { code: 'TASK_0003', message: 'Task status is invalid', statusCode: 422 },
  ALREADY_COMPLETED: { code: 'TASK_0004', message: 'Task is already completed', statusCode: 422 },
  CATEGORY_NOT_FOUND: { code: 'TASK_0005', message: 'Task category not found', statusCode: 404 },
  PROJECT_NOT_FOUND: { code: 'TASK_0006', message: 'Task project not found', statusCode: 404 },
  PROJECT_COMPLETED: { code: 'TASK_0007', message: 'Completed projects cannot be assigned to tasks', statusCode: 422 },
  CANNOT_START: { code: 'TASK_0008', message: 'Only pending tasks can be started', statusCode: 422 },
  CANNOT_GIVE_UP: { code: 'TASK_0009', message: 'Only in-progress tasks can be given up', statusCode: 422 },
  CANNOT_FINISH: { code: 'TASK_0010', message: 'Only in-progress tasks can be finished', statusCode: 422 },
  NO_FIELDS_TO_UPDATE: { code: 'TASK_0011', message: 'No fields to update', statusCode: 422 },
} as const satisfies Record<string, ErrorDefinition>;
