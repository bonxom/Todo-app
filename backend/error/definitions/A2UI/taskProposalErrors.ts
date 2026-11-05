import type { ErrorDefinition } from "../../ErrorDefinition.js";

export const TASK_PROPOSAL_ERROR = {
  NOT_FOUND: {
    code: "TASK_PROPOSAL_0001",
    message: "Task proposal not found.",
    statusCode: 404,
  },
  DISABLED: {
    code: "TASK_PROPOSAL_0002",
    message: "Task proposals are disabled.",
    statusCode: 409,
  },
  REVISION_CONFLICT: {
    code: "TASK_PROPOSAL_0003",
    message:
      "Proposal revision conflict. Reload the conversation to view latest state.",
    statusCode: 409,
  },
  REQUEST_CONFLICT: {
    code: "TASK_PROPOSAL_0004",
    message: "Request ID was already used with a different payload.",
    statusCode: 409,
  },
  INVALID_REFERENCE: {
    code: "TASK_PROPOSAL_0005",
    message: "Referenced category or project is invalid or inaccessible.",
    statusCode: 422,
  },
  TRANSACTION_UNAVAILABLE: {
    code: "TASK_PROPOSAL_0006",
    message: "Transaction support is required to confirm task proposals.",
    statusCode: 503,
  },
  WRITE_FORBIDDEN: {
    code: "TASK_PROPOSAL_0007",
    message: "Write actions are forbidden during task proposal generation.",
    statusCode: 403,
  },
  CREATE_FAILED: {
    code: "TASK_PROPOSAL_0008",
    message: "Failed to create task from proposal item.",
    statusCode: 500,
  },
  INVALID_STATE: {
    code: "TASK_PROPOSAL_0009",
    message: "Action cannot be performed on proposal in current status.",
    statusCode: 409,
  },
  PAYLOAD_TOO_LARGE: {
    code: "TASK_PROPOSAL_0010",
    message: "Proposal payload exceeds size limit.",
    statusCode: 413,
  },
} as const satisfies Record<string, ErrorDefinition>;
