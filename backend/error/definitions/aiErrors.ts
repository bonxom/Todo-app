import type { ErrorDefinition } from "../ErrorDefinition.js";

export const AI_ERROR = {
  INTERACTION_NOT_FOUND: {
    code: "AI_0009",
    message: "Question not found",
    statusCode: 404,
  },
  INTERACTION_CONFLICT: {
    code: "AI_0010",
    message:
      "This question has already changed or been answered. Reload the conversation.",
    statusCode: 409,
  },
  ANSWER_INVALID: {
    code: "AI_0011",
    message: "Choose a valid option or enter an allowed answer.",
    statusCode: 422,
  },
  CONVERSATION_NOT_FOUND: {
    code: "AI_0006",
    message: "Conversation not found",
    statusCode: 404,
  },
  CONVERSATION_BUSY: {
    code: "AI_0007",
    message:
      "A reply is still being processed. Retry the same request shortly.",
    statusCode: 409,
  },
  CHAT_REQUEST_CONFLICT: {
    code: "AI_0008",
    message: "Request ID was already used for a different message",
    statusCode: 409,
  },
  CONFIG_MISSING: {
    code: "AI_0001",
    message: "AI service is not configured",
    statusCode: 503,
  },
  PROVIDER_ERROR: {
    code: "AI_0002",
    message: "AI provider request failed",
    statusCode: 502,
  },
  PROVIDER_TIMEOUT: {
    code: "AI_0003",
    message: "AI provider request timed out",
    statusCode: 504,
  },
  EMPTY_RESPONSE: {
    code: "AI_0004",
    message: "AI provider returned an empty response",
    statusCode: 502,
  },
  RESPONSE_INVALID: {
    code: "AI_0005",
    message: "AI provider returned an invalid response",
    statusCode: 502,
  },
  CHAT_CONCURRENCY_LIMIT: {
    code: "AI_0012",
    message:
      "Tối đa 3 lượt đang chạy mỗi tài khoản. Vui lòng chờ hoặc dừng một lượt đang chạy.",
    statusCode: 429,
  },
  CHAT_CURSOR_INVALID: {
    code: "AI_0013",
    message: "Cursor sự kiện không hợp lệ",
    statusCode: 400,
  },
  CHAT_OUTPUT_LIMIT: {
    code: "AI_0014",
    message:
      "Lượt chat đã vượt giới hạn kích thước output hoặc số lượng sự kiện",
    statusCode: 500,
  },
  CHAT_STREAM_UNSUPPORTED: {
    code: "AI_0015",
    message: "Nhà cung cấp AI không hỗ trợ streaming",
    statusCode: 502,
  },
  TURN_NOT_FOUND: {
    code: "AI_0016",
    message: "Không tìm thấy lượt chat",
    statusCode: 404,
  },
} as const satisfies Record<string, ErrorDefinition>;
