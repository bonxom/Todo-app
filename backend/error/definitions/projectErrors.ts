import type { ErrorDefinition } from '../ErrorDefinition.js';

export const PROJECT_ERROR = {
  NOT_FOUND: { code: 'PROJECT_0001', message: 'Project not found', statusCode: 404 },
  NAME_EXISTED: { code: 'PROJECT_0002', message: 'Project name already exists', statusCode: 409 },
  ACCESS_DENIED: { code: 'PROJECT_0003', message: 'You do not have access to this project', statusCode: 403 },
  ALREADY_COMPLETED: { code: 'PROJECT_0004', message: 'Project is already completed', statusCode: 422 },
  CANNOT_BE_COMPLETED: { code: 'PROJECT_0005', message: 'Project can only be completed when it has at least one task and every task is completed or given up', statusCode: 422 },
  STATUS_INVALID: { code: 'PROJECT_0006', message: 'Project status is invalid', statusCode: 422 },
  NO_FIELDS_TO_UPDATE: { code: 'PROJECT_0007', message: 'No fields to update', statusCode: 422 },
} as const satisfies Record<string, ErrorDefinition>;
