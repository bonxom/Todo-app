import express, { Router } from "express";
import { protect } from "../middlewares/auth.js";
import type { McpConfig } from "./config.js";
import { createMcpContext } from "./context.js";
import { AppError, MCP_ERROR, mcpErrorHandler } from "../error/index.js";
import {
  taskRoute,
  projectRoute,
  categoryRoute,
  mcpRoute,
} from "./routes/index.js";

export function createMcpRouter(
  config: McpConfig,
  ensureReady: () => Promise<void>,
): Router {
  const router = Router();
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  if (!config.enabled) {
    router.use((_req, res) => {
      res
        .status(404)
        .json({ error: { code: "NOT_FOUND", message: "Not found." } });
    });
    return router;
  }
  router.use((req, res, next) => {
    const allowedHosts = [
      `localhost:${config.port}`,
      `127.0.0.1:${config.port}`,
    ];
    if (config.port === 80) allowedHosts.push("localhost", "127.0.0.1");
    if (
      !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
        req.socket.remoteAddress ?? "",
      ) ||
      !allowedHosts.includes(req.headers.host ?? "") ||
      [
        "forwarded",
        "x-forwarded-for",
        "x-forwarded-host",
        "x-forwarded-proto",
      ].some((h) => req.headers[h] !== undefined)
    ) {
      throw new AppError(MCP_ERROR.LOCAL_ONLY);
    }
    const origin = req.headers.origin;
    if (origin !== undefined && !config.allowedOrigins.includes(origin))
      throw new AppError(MCP_ERROR.ORIGIN_NOT_ALLOWED);
    res.vary("Origin");
    if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader(
      "Access-Control-Expose-Headers",
      "WWW-Authenticate, MCP-Protocol-Version",
    );
    if (req.method === "OPTIONS") {
      res.setHeader(
        "Access-Control-Allow-Methods",
        "POST, GET, DELETE, OPTIONS",
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id",
      );
      res.status(204).end();
      return;
    }
    next();
  });
  router.use(async (_req, _res, next) => {
    try {
      await ensureReady();
    } catch {
      throw new AppError(MCP_ERROR.SERVICE_UNAVAILABLE);
    }
    next();
  });
  router.use(protect);
  router.use((req, res, next) => {
    res.locals.mcpContext = createMcpContext(req);
    next();
  });
  router.use(express.json({ limit: "100kb" }));
  router.use("/tasks", taskRoute);
  router.use("/projects", projectRoute);
  router.use("/categories", categoryRoute);
  router.use(mcpRoute);
  router.use(mcpErrorHandler);
  return router;
}
