export const NOTIFICATION_ERROR = {
  NOT_FOUND: {
    code: "NOTIFICATION_0001",
    message: "Notification not found",
    statusCode: 404,
  },
  PUSH_NOT_CONFIGURED: {
    code: "NOTIFICATION_0002",
    message: "Web push is not configured on this server",
    statusCode: 503,
  },
  PUSH_SUBSCRIPTION_NOT_FOUND: {
    code: "NOTIFICATION_0003",
    message: "Push subscription not found",
    statusCode: 404,
  },
} as const;
