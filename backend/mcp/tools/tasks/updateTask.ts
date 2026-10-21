import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "../../context.js";
import { updateTaskInputSchema, getTaskOutputSchema } from "../../schemas.js";
import { taskWriteService } from "../../services/taskWriteService.js";
import { write, writeAnnotations } from "../shared/write.js";

export function registerUpdateTaskTool(
  server: McpServer,
  context: McpContext,
): void {
  server.registerTool(
    "orbit_update_task",
    {
      title: "Update Orbit task",
      description:
        "In Ask mode, use grill_user first if the user needs to choose or clarify the proposed action. If the user has already clearly requested or confirmed it, proceed without asking again. Update content and/or status after resolving the correct task. Set changes.status to in-progress to start a pending task, or completed/given-up for an in-progress task. Already-at-target status is a no-op. Other transitions are rejected. Content and status changes are atomic. Null projectId removes the project; null dates clear dates. Reuse idempotencyKey and arguments on retry.",
      inputSchema: updateTaskInputSchema,
      outputSchema: getTaskOutputSchema,
      annotations: writeAnnotations,
    },
    (input) =>
      write(context, "update", () => taskWriteService.update(input, context)),
  );
}
