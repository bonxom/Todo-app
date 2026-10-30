import { Router } from "express";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getSkillRegistry } from "../../skills/registry.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { McpContext } from "../context.js";
import { createOrbitMcpServer } from "../server.js";

export function createMcpRoute(): Router {
  const router = Router();

  router.post("/", async (req, res, next) => {
    let server: McpServer | undefined;
    let transport: StreamableHTTPServerTransport | undefined;
    let closed = false;
    const cleanup = async () => {
      if (closed) return;
      closed = true;
      await Promise.allSettled([transport?.close(), server?.close()]);
    };
    res.once("finish", () => {
      void cleanup();
    });
    res.once("close", () => {
      void cleanup();
    });
    try {
      const registry = await getSkillRegistry();
      // The connection may close while registry initialization is pending.
      if (closed) return;
      server = createOrbitMcpServer(res.locals.mcpContext as McpContext, registry);
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      await cleanup();
      next(error);
    }
  });

  router.use((_req, res) => {
    res.setHeader("Allow", "POST, OPTIONS");
    res
      .status(405)
      .json({ error: { code: "METHOD_NOT_ALLOWED", message: "Use POST." } });
  });

  return router;
}

const mcpRoute = createMcpRoute();
export default mcpRoute;
