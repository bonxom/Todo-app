import type { ErrorDefinition } from "../ErrorDefinition.js";

export const MCP_ERROR = {
  LOCAL_ONLY: {
    code: "MCP_0001",
    message: "Local direct connections only.",
    statusCode: 403,
  },
  ORIGIN_NOT_ALLOWED: {
    code: "MCP_0002",
    message: "Origin is not allowed.",
    statusCode: 403,
  },
  SERVICE_UNAVAILABLE: {
    code: "MCP_0003",
    message: "Data service unavailable.",
    statusCode: 503,
  },
  UNAUTHORIZED: {
    code: "MCP_0004",
    message: "A valid Orbit access token is required.",
    statusCode: 401,
  },
  USER_ACCOUNT_ONLY: {
    code: "MCP_0005",
    message: "MCP is available to USER accounts only.",
    statusCode: 403,
  },
  NOT_FOUND: {
    code: "MCP_0006",
    message: "Not found.",
    statusCode: 404,
  },
  METHOD_NOT_ALLOWED: {
    code: "MCP_0007",
    message: "Use POST.",
    statusCode: 405,
  },
  PAYLOAD_TOO_LARGE: {
    code: "MCP_0008",
    message: "Request exceeds 100 KiB.",
    statusCode: 413,
  },
  INVALID_JSON: {
    code: "MCP_0009",
    message: "Malformed JSON.",
    statusCode: 400,
  },
  INVALID_FLAG: {
    code: "MCP_0010",
    message: "MCP_ENABLED must be true or false.",
    statusCode: 500,
  },
  INVALID_ENVIRONMENT: {
    code: "MCP_0011",
    message:
      "MCP requires HOST=127.0.0.1, NODE_ENV=development/test and no VERCEL.",
    statusCode: 500,
  },
  SHARED_JWT_SECRETS: {
    code: "MCP_0012",
    message: "MCP requires distinct access and refresh token secrets.",
    statusCode: 500,
  },
  INVALID_PORT: {
    code: "MCP_0013",
    message: "Invalid MCP port.",
    statusCode: 500,
  },
  INVALID_ORIGINS: {
    code: "MCP_0014",
    message: "MCP_ALLOWED_ORIGINS must contain exact HTTP loopback origins.",
    statusCode: 500,
  },
} as const satisfies Record<string, ErrorDefinition>;
