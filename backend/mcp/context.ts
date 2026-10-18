import type { Request } from "express";
import jwt from "jsonwebtoken";
import type { IUserDocument } from "../types/IUser.js";
import { AppError, MCP_ERROR } from "../error/index.js";
export type McpContext = Readonly<{ user: IUserDocument; requestId: string }>;
// Only call after protect: decoding here adds an expiry requirement, not authentication.
export function createMcpContext(req: Request): McpContext {
  const token = req.headers.authorization?.slice(7);
  const payload = token ? jwt.decode(token) : null;
  if (
    !req.user ||
    !payload ||
    typeof payload === "string" ||
    typeof payload.exp !== "number" ||
    !Number.isFinite(payload.exp) ||
    payload.exp <= Date.now() / 1000
  ) {
    throw new AppError(MCP_ERROR.UNAUTHORIZED);
  }
  if (req.user.role !== "USER")
    throw new AppError(MCP_ERROR.USER_ACCOUNT_ONLY);
  return Object.freeze({ user: req.user, requestId: req.requestId });
}
