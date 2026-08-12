import type { ErrorDefinition } from '../ErrorDefinition.js';

export const AUTH_ERROR = {
  TOKEN_MISSING: { code: 'AUTH_0001', message: 'Access token is required', statusCode: 401 },
  TOKEN_INVALID: { code: 'AUTH_0002', message: 'Access token is invalid', statusCode: 401 },
  TOKEN_EXPIRED: { code: 'AUTH_0003', message: 'Access token has expired', statusCode: 401 },
  REFRESH_TOKEN_MISSING: { code: 'AUTH_0004', message: 'Refresh token is required', statusCode: 401 },
  REFRESH_TOKEN_INVALID: { code: 'AUTH_0005', message: 'Refresh token is invalid', statusCode: 401 },
  REFRESH_TOKEN_EXPIRED: { code: 'AUTH_0006', message: 'Refresh token has expired', statusCode: 401 },
  REFRESH_TOKEN_REVOKED: { code: 'AUTH_0007', message: 'Refresh token has been revoked', statusCode: 401 },
  UNAUTHORIZED: { code: 'AUTH_0008', message: 'Authentication is required', statusCode: 401 },
  FORBIDDEN: { code: 'AUTH_0009', message: 'You are not allowed to perform this action', statusCode: 403 },
  INVALID_CREDENTIALS: { code: 'AUTH_0010', message: 'Invalid email or password', statusCode: 401 },
} as const satisfies Record<string, ErrorDefinition>;
