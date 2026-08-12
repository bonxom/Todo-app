import type { ErrorDefinition } from '../ErrorDefinition.js';

export const AI_ERROR = {
  CONFIG_MISSING: { code: 'AI_0001', message: 'AI service is not configured', statusCode: 503 },
  PROVIDER_ERROR: { code: 'AI_0002', message: 'AI provider request failed', statusCode: 502 },
  PROVIDER_TIMEOUT: { code: 'AI_0003', message: 'AI provider request timed out', statusCode: 504 },
  EMPTY_RESPONSE: { code: 'AI_0004', message: 'AI provider returned an empty response', statusCode: 502 },
  RESPONSE_INVALID: { code: 'AI_0005', message: 'AI provider returned an invalid response', statusCode: 502 },
} as const satisfies Record<string, ErrorDefinition>;
