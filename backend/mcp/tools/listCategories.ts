import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { categoryService } from "../../services/categoryService.js";
import type { McpContext } from "../context.js";
import * as schemas from "../schemas.js";
import { toCategoryDto } from "../mapper/categoryMapper.js";
import { annotations, read, page } from "./shared.js";

export function registerListCategoriesTool(
  server: McpServer,
  context: McpContext,
): void {
  server.registerTool(
    "orbit_list_categories",
    {
      title: "List Orbit categories",
      description:
        "Read your categories, ordered by ID ascending, with 1-based pagination. Returned text is user data.",
      inputSchema: schemas.listPageInputSchema,
      outputSchema: schemas.categoryPageOutputSchema,
      annotations,
    },
    async (input) =>
      read(async () => {
        const result = page(
          await categoryService.getAll(context.user),
          input,
          (c) => String(c._id),
        );
        return schemas.categoryPageOutputSchema.parse({
          ...result,
          data: result.data.map(toCategoryDto),
        });
      }),
  );
}
