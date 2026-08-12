import type { ErrorDefinition } from './ErrorDefinition.js';
import { COMMON_ERROR } from './definitions/commonErrors.js';
import { AUTH_ERROR } from './definitions/authErrors.js';
import { USER_ERROR } from './definitions/userErrors.js';
import { CATEGORY_ERROR } from './definitions/categoryErrors.js';
import { PROJECT_ERROR } from './definitions/projectErrors.js';
import { TASK_ERROR } from './definitions/taskErrors.js';
import { AI_ERROR } from './definitions/aiErrors.js';

export const ERROR_DEFINITION_GROUPS = {
  COMMON_ERROR,
  AUTH_ERROR,
  USER_ERROR,
  CATEGORY_ERROR,
  PROJECT_ERROR,
  TASK_ERROR,
  AI_ERROR,
} as const satisfies Record<string, Record<string, ErrorDefinition>>;

export { COMMON_ERROR, AUTH_ERROR, USER_ERROR, CATEGORY_ERROR, PROJECT_ERROR, TASK_ERROR, AI_ERROR };
