import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "../../context.js";
import { createTaskInputSchema, getTaskOutputSchema } from "../../schemas.js";
import { taskWriteService } from "../../services/taskWriteService.js";
import { write, writeAnnotations } from "../shared/write.js";

export function registerCreateTaskTool(
  server: McpServer,
  context: McpContext,
): void {
  server.registerTool(
    "orbit_create_task",
    {
      title: "Create Orbit task",
      description:
        "Create a task only when the user requests it. You are only allowed to create tasks with pending status. Dates need timezone. Reuse idempotencyKey and arguments on retry; never retry with a new key after an uncertain result.",
      inputSchema: createTaskInputSchema,
      outputSchema: getTaskOutputSchema,
      annotations: { ...writeAnnotations, destructiveHint: false },
    },
    (input) =>
      write(context, "create", () => taskWriteService.create(input, context)),
  );
}
