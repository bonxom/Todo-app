import type { ErrorDefinition } from '../ErrorDefinition.js';

export const USER_ERROR = {
  NOT_FOUND: { code: 'USER_0001', message: 'User not found', statusCode: 404 },
  EMAIL_EXISTED: { code: 'USER_0002', message: 'Email already exists', statusCode: 409 },
  CURRENT_PASSWORD_INCORRECT: { code: 'USER_0003', message: 'Current password is incorrect', statusCode: 401 },
  NEW_PASSWORD_SAME_AS_CURRENT: { code: 'USER_0004', message: 'New password must be different from the current password', statusCode: 422 },
  NO_FIELDS_TO_UPDATE: { code: 'USER_0005', message: 'No fields to update', statusCode: 422 },
} as const satisfies Record<string, ErrorDefinition>;
