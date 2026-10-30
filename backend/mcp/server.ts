import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "./context.js";
import { registerOrbitTools } from "./tools.js";
import type { SkillRegistry } from "../skills/types.js";
import { registerSkillResources } from "./resources/skills.js";
export function createOrbitMcpServer(context: McpContext, registry?: SkillRegistry): McpServer {
  const server = new McpServer({ name: "orbit-mcp-server", version: "0.1.0" });
  registerOrbitTools(server, context);
  if (registry) registerSkillResources(server, registry);
  return server;
}
