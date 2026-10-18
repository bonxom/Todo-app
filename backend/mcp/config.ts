import { AppError } from "../error/AppError.js";
import { MCP_ERROR } from "../error/definitions/mcpErrors.js";

export interface McpConfig {
  enabled: boolean;
  allowedOrigins: readonly string[];
  host: string;
  port: number;
}

export function readMcpConfig(env: NodeJS.ProcessEnv): McpConfig {
  const flag = env.MCP_ENABLED ?? "false";
  if (flag !== "true" && flag !== "false") {
    throw new AppError(MCP_ERROR.INVALID_FLAG);
  }
  const enabled = flag === "true";
  const host = env.HOST ?? "0.0.0.0";
  const port = Number(env.PORT ?? "3001");
  if (!enabled) return { enabled, host, port, allowedOrigins: [] };
  if (
    host !== "127.0.0.1" ||
    !["development", "test"].includes(env.NODE_ENV ?? "") ||
    env.VERCEL !== undefined
  ) {
    throw new AppError(MCP_ERROR.INVALID_ENVIRONMENT);
  }
  if (env.JWT_SECRET && env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
    throw new AppError(MCP_ERROR.SHARED_JWT_SECRETS);
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new AppError(MCP_ERROR.INVALID_PORT);
  }
  const allowedOrigins = (env.MCP_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const origin of allowedOrigins) {
    try {
      const url = new URL(origin);
      if (
        url.protocol !== "http:" ||
        !["localhost", "127.0.0.1"].includes(url.hostname) ||
        url.origin !== origin
      ) {
        throw new AppError(MCP_ERROR.INVALID_ORIGINS);
      }
    } catch {
      throw new AppError(MCP_ERROR.INVALID_ORIGINS);
    }
  }
  return { enabled, host, port, allowedOrigins: [...new Set(allowedOrigins)] };
}
