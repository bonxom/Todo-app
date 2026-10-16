import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "./context.js";
import {
  registerListTasksTool,
  registerGetTaskTool,
  registerListProjectsTool,
  registerListCategoriesTool,
} from "./tools/index.js";

export function registerOrbitTools(
  server: McpServer,
  context: McpContext,
): void {
  registerListTasksTool(server, context);
  registerGetTaskTool(server, context);
  registerListProjectsTool(server, context);
  registerListCategoriesTool(server, context);
}
