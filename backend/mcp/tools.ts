import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "./context.js";
import {
  registerGetMeTool,
  registerListTasksTool,
  registerGetTaskTool,
  registerListProjectsTool,
  registerListCategoriesTool,
  registerCreateTaskTool,
  registerUpdateTaskTool,
  registerDeleteTaskTool,
  registerWebSearchTool,
} from "./tools/index.js";
import type { AgentBudget } from "../utils/agentBudget.js";
export function registerOrbitTools(
  server: McpServer,
  context: McpContext,
  options?: { budget?: AgentBudget },
): void {
  registerGetMeTool(server, context);
  registerListTasksTool(server, context);
  registerGetTaskTool(server, context);
  registerListProjectsTool(server, context);
  registerListCategoriesTool(server, context);
  registerWebSearchTool(server, options);
  if (context.user.role === "USER" && context.scopes?.includes("tasks:write")) {
    registerCreateTaskTool(server, context);
    registerUpdateTaskTool(server, context);
    registerDeleteTaskTool(server, context);
  }
}
