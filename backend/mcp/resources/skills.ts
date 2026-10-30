import { createHash } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SkillRegistry } from "../../skills/types.js";

/** Resources share registry content, never an agent session or its permissions. */
export function registerSkillResources(
  server: McpServer,
  registry: SkillRegistry,
): void {
  for (const document of registry.documents()) {
    server.registerResource(
      `${document.skillId}/${document.document}`,
      document.uri,
      { mimeType: "text/markdown", description: `${document.skillId}: ${document.document}` },
      async () => ({
        contents: [{
          uri: document.uri,
          mimeType: "text/markdown",
          text: document.text,
          _meta: {
            "orbit/skillVersion": document.version,
            "orbit/contentHash": createHash("sha256").update(document.text, "utf8").digest("hex"),
          },
        }],
      }),
    );
  }
}
