import type { ErrorDefinition } from "../ErrorDefinition.js";
export const ATTACHMENT_ERROR = {
  INVALID: {
    code: "ATTACHMENT_0001",
    message:
      "Use a nonempty JPEG, PNG, GIF, WebP, PDF, TXT, Markdown or CSV file (maximum 10 MiB).",
    statusCode: 400,
  },
  TOO_LARGE: {
    code: "ATTACHMENT_0002",
    message: "Each attachment must be 10 MiB or smaller.",
    statusCode: 413,
  },
  NOT_FOUND: {
    code: "ATTACHMENT_0003",
    message: "Attachment not found or no longer available.",
    statusCode: 404,
  },
  UNAVAILABLE: {
    code: "ATTACHMENT_0004",
    message: "File storage is unavailable. Please try again later.",
    statusCode: 503,
  },
} as const satisfies Record<string, ErrorDefinition>;
