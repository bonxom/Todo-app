import type { ErrorDefinition } from '../ErrorDefinition.js';

export const CATEGORY_ERROR = {
  NOT_FOUND: { code: 'CATEGORY_0001', message: 'Category not found', statusCode: 404 },
  NAME_EXISTED: { code: 'CATEGORY_0002', message: 'Category name already exists', statusCode: 409 },
  ACCESS_DENIED: { code: 'CATEGORY_0003', message: 'You do not have access to this category', statusCode: 403 },
  UNCATEGORIZED_CATEGORY_IMMUTABLE: { code: 'CATEGORY_0004', message: 'The Uncategorized category cannot be modified', statusCode: 422 },
  NO_FIELDS_TO_UPDATE: { code: 'CATEGORY_0005', message: 'No fields to update', statusCode: 422 },
  DEFAULT_CATEGORY_UNAVAILABLE: { code: 'CATEGORY_0006', message: 'Default category is unavailable', statusCode: 503 },
} as const satisfies Record<string, ErrorDefinition>;
