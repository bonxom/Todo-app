import type { ErrorDefinition } from '../ErrorDefinition.js';

export const COMMON_ERROR = {
  UNCATEGORIZED_EXCEPTION: { code: 'COMMON_0001', message: 'Internal server error', statusCode: 500 },
  ROUTE_NOT_FOUND: { code: 'COMMON_0002', message: 'Route {method} {path} not found', statusCode: 404 },
  SERVICE_UNAVAILABLE: { code: 'COMMON_0003', message: 'Service unavailable', statusCode: 503 },
  INVALID_JSON: { code: 'COMMON_0004', message: 'Malformed JSON payload', statusCode: 400 },
  INVALID_PAYLOAD: { code: 'COMMON_0005', message: 'Invalid request payload', statusCode: 400 },
  INVALID_OBJECT_ID: { code: 'COMMON_0006', message: 'Invalid object ID for {field}', statusCode: 400 },
  DUPLICATE_RESOURCE: { code: 'COMMON_0007', message: 'Resource already exists', statusCode: 409 },
  DATABASE_ERROR: { code: 'COMMON_0008', message: 'Database operation failed', statusCode: 500 },
  CORS_NOT_ALLOWED: { code: 'COMMON_0009', message: 'Origin is not allowed', statusCode: 403 },
} as const satisfies Record<string, ErrorDefinition>;
