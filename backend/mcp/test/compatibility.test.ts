import { expect, it } from "vitest";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
it("SDK v1 supports Zod4 strict input, structured output and tool errors", async () => {
  const server = new McpServer({ name: "compat", version: "1.0.0" });
  server.registerTool(
    "compat_read",
    {
      inputSchema: z.strictObject({ fail: z.boolean().optional() }),
      outputSchema: z.object({ ok: z.boolean() }),
    },
    async ({ fail }) =>
      fail
        ? { isError: true, content: [{ type: "text", text: "safe error" }] }
        : {
            structuredContent: { ok: true },
            content: [{ type: "text", text: '{"ok":true}' }],
          },
  );
  const client = new Client({ name: "test", version: "1.0.0" });
  const [s, c] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(s);
    await client.connect(c);
    expect((await client.listTools()).tools.map((t) => t.name)).toEqual([
      "compat_read",
    ]);
    expect(
      (await client.callTool({ name: "compat_read", arguments: {} }))
        .structuredContent,
    ).toEqual({ ok: true });
    expect(
      (
        await client.callTool({
          name: "compat_read",
          arguments: { unknown: 1 },
        })
      ).isError,
    ).toBe(true);
    expect(
      (
        await client.callTool({
          name: "compat_read",
          arguments: { fail: true },
        })
      ).isError,
    ).toBe(true);
  } finally {
    await client.close();
    await server.close();
  }
});
