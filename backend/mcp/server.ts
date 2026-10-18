import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "./context.js";
import { registerOrbitTools } from "./tools.js";
export function createOrbitMcpServer(context: McpContext): McpServer {
  const server = new McpServer({ name: "orbit-mcp-server", version: "0.1.0" });
  registerOrbitTools(server, context);
  return server;
}
