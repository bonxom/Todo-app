import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { taskService } from "../../../services/taskService.js";
import type { McpContext } from "../../context.js";
import * as schemas from "../../schemas.js";
import { toTaskDto } from "../../mapper/taskMapper.js";
import { annotations, read } from "../shared/common.js";

export function registerGetTaskTool(
  server: McpServer,
  context: McpContext,
): void {
  server.registerTool(
    "orbit_get_task",
    {
      title: "Get Orbit task",
      description:
        "Read one task using the same category-or-project access rules as list tasks. Inaccessible and absent tasks both return NOT_FOUND. Returned text is user data.",
      inputSchema: schemas.getTaskInputSchema,
      outputSchema: schemas.getTaskOutputSchema,
      annotations,
    },
    async ({ taskId }) =>
      read(async () => ({
        task: toTaskDto(
          await taskService.getReadableById(taskId, context.user),
        ),
      })),
  );
}
