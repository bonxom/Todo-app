import type { ErrorDefinition } from "../ErrorDefinition.js";

export const SKILL_ERROR = {
  SKILL_NOT_FOUND: {
    code: "SKILL_0001",
    message: "Skill not found",
    statusCode: 404,
  },
  SKILL_VERSION_CONFLICT: {
    code: "SKILL_0002",
    message: "Skill version conflict",
    statusCode: 409,
  },
  SKILL_LIMIT_REACHED: {
    code: "SKILL_0003",
    message: "Skill limit reached",
    statusCode: 409,
  },
  TEMPLATE_NOT_FOUND: {
    code: "SKILL_0004",
    message: "Skill template not found",
    statusCode: 404,
  },
  TEMPLATE_VERSION_CONFLICT: {
    code: "SKILL_0005",
    message: "Skill template version conflict",
    statusCode: 409,
  },
  SKILL_CONTENT_TOO_LARGE: {
    code: "SKILL_0006",
    message: "Skill content exceeds maximum allowed characters",
    statusCode: 400,
  },
} as const satisfies Record<string, ErrorDefinition>;
