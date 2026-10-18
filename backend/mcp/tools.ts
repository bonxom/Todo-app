import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "./context.js";
import {
  registerListTasksTool,
  registerGetTaskTool,
  registerListProjectsTool,
  registerListCategoriesTool,
  registerCreateTaskTool,
  registerUpdateTaskTool,
} from "./tools/index.js";

export function registerOrbitTools(
  server: McpServer,
  context: McpContext,
): void {
  registerListTasksTool(server, context);
  registerGetTaskTool(server, context);
  registerListProjectsTool(server, context);
  registerListCategoriesTool(server, context);
  if (context.user.role === "USER" && context.scopes?.includes("tasks:write")) {
    registerCreateTaskTool(server, context);
    registerUpdateTaskTool(server, context);
  }
}
