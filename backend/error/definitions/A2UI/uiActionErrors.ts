import type { ErrorDefinition } from "../../ErrorDefinition.js";

export const UI_ACTION_ERROR = {
  NOT_FOUND: {
    code: "UI_ACTION_0001",
    message: "Interactive UI action not found.",
    statusCode: 404,
  },
  DISABLED: {
    code: "UI_ACTION_0002",
    message: "Interactive UI actions are disabled.",
    statusCode: 409,
  },
  USER_ACCOUNT_ONLY: {
    code: "UI_ACTION_0003",
    message: "Interactive UI actions are available to USER accounts only.",
    statusCode: 403,
  },
  TURN_NOT_COMPLETED: {
    code: "UI_ACTION_0004",
    message: "Interactive UI actions require a completed source turn.",
    statusCode: 409,
  },
  REQUEST_CONFLICT: {
    code: "UI_ACTION_0005",
    message: "Request ID was already used with a different action or payload.",
    statusCode: 409,
  },
  UNSUPPORTED_ACTION: {
    code: "UI_ACTION_0006",
    message: "Unsupported interactive UI action.",
    statusCode: 422,
  },
  TRANSACTION_UNAVAILABLE: {
    code: "UI_ACTION_0007",
    message:
      "Transaction support is required to execute interactive UI actions.",
    statusCode: 503,
  },
} as const satisfies Record<string, ErrorDefinition>;
