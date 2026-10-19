import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { taskPageOutputSchema } from "../mcp/schemas.js";

const url = new URL(process.env.ORBIT_MCP_URL ?? "http://127.0.0.1:3001/mcp");
if (
  url.protocol !== "http:" ||
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  url.username ||
  url.password ||
  url.search ||
  url.hash
) {
  throw new Error(
    "Smoke URL must be an HTTP loopback endpoint without credentials or query.",
  );
}
const token = process.env.ORBIT_MCP_ACCESS_TOKEN;
if (!token)
  throw new Error(
    "Set ORBIT_MCP_ACCESS_TOKEN using a short-lived local access token.",
  );
const client = new Client({ name: "orbit-smoke", version: "1.0.0" });
const transport = new StreamableHTTPClientTransport(url, {
  requestInit: { headers: { Authorization: `Bearer ${token}` } },
});
try {
  await client.connect(transport);
  const names = (await client.listTools()).tools.map((t) => t.name).sort();
  const expected = [
    "orbit_get_me",
    "orbit_get_task",
    "orbit_list_categories",
    "orbit_list_projects",
    "orbit_list_tasks",
  ];
  if (JSON.stringify(names) !== JSON.stringify(expected))
    throw new Error("Unexpected tool catalog.");
  console.log(`Protocol ${transport.protocolVersion}; five tools discovered.`);
  let taskId: string | undefined;
  for (const name of [
    "orbit_list_tasks",
    "orbit_list_projects",
    "orbit_list_categories",
  ]) {
    const result = await client.callTool({ name, arguments: { pageSize: 1 } });
    if (result.isError) throw new Error(`${name} failed.`);
    if (name === "orbit_list_tasks")
      taskId = taskPageOutputSchema.parse(result.structuredContent).data[0]?.id;
    console.log(`${name}: PASS`);
  }
  if (!taskId)
    throw new Error("No task fixture: orbit_get_task smoke is incomplete.");
  if (
    (await client.callTool({ name: "orbit_get_task", arguments: { taskId } }))
      .isError
  )
    throw new Error("orbit_get_task failed.");
  console.log("orbit_get_task: PASS");
} catch {
  console.error(
    "MCP smoke failed. Check local server, token expiry and task fixture.",
  );
  process.exitCode = 1;
} finally {
  await client.close();
}
