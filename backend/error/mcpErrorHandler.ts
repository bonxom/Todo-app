import type { ErrorRequestHandler } from "express";
import { AppError } from "./AppError.js";

export const mcpErrorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next,
) => {
  if (res.headersSent) {
    res.end();
    return;
  }
  let status = 500,
    code = "INTERNAL_ERROR",
    message = "Unable to process request.";
  if (error instanceof AppError) {
    status = error.statusCode;
    code = error.code;
    message = error.message;
  } else if (error && typeof error === "object" && "type" in error) {
    if (error.type === "entity.parse.failed") {
      status = 400;
      code = "INVALID_JSON";
      message = "Malformed JSON.";
    }
    if (error.type === "entity.too.large") {
      status = 413;
      code = "PAYLOAD_TOO_LARGE";
      message = "Request exceeds 100 KiB.";
    }
  }
  if (status === 401) res.setHeader("WWW-Authenticate", "Bearer");
  res.status(status).json({ error: { code, message } });
};
