import { afterEach, expect, it, vi } from "vitest";
import { Types } from "mongoose";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createOrbitMcpServer } from "../server.js";
import { categoryService } from "../../services/categoryService.js";
import { taskService } from "../../services/taskService.js";
import type { IUserDocument } from "../../types/IUser.js";
afterEach(() => vi.restoreAllMocks());
it("discovers four tools, rejects extra arguments, keeps concurrent contexts separate and sanitizes failures", async () => {
  const users = [0, 1].map(
    () => ({ _id: new Types.ObjectId(), role: "USER" }) as IUserDocument,
  );
  const get = vi
    .spyOn(categoryService, "getAll")
    .mockImplementation(
      async (user) => [{ _id: user._id, name: String(user._id) }] as never,
    );
  vi.spyOn(taskService, "getAll").mockRejectedValue(
    new Error("mongodb://secret"),
  );
  const servers = users.map((user) =>
    createOrbitMcpServer({ user, requestId: "test" }),
  );
  const clients = users.map(
    () => new Client({ name: "test", version: "1.0.0" }),
  );
  try {
    for (let i = 0; i < 2; i++) {
      const [s, c] = InMemoryTransport.createLinkedPair();
      await servers[i].connect(s);
      await clients[i].connect(c);
    }
    const tools = (await clients[0].listTools()).tools;
    expect(tools.map((t) => t.name).sort()).toEqual([
      "orbit_get_task",
      "orbit_list_categories",
      "orbit_list_projects",
      "orbit_list_tasks",
    ]);
    expect(
      tools.every((t) => t.annotations?.readOnlyHint && t.outputSchema),
    ).toBe(true);
    const invalid = await clients[0].callTool({
      name: "orbit_list_categories",
      arguments: { userId: "fake" },
    });
    expect(invalid.isError).toBe(true);
    expect(get).not.toHaveBeenCalled();
    const results = await Promise.all(
      clients.map((c) =>
        c.callTool({ name: "orbit_list_categories", arguments: {} }),
      ),
    );
    results.forEach((r, i) =>
      expect(r.structuredContent).toMatchObject({
        data: [{ id: String(users[i]._id) }],
      }),
    );
    expect(
      (
        await clients[0].callTool({
          name: "orbit_list_categories",
          arguments: { pageNo: 2 },
        })
      ).structuredContent,
    ).toMatchObject({ data: [], pageInfo: { totalCount: 1 } });
    const failed = await clients[0].callTool({
      name: "orbit_list_tasks",
      arguments: {},
    });
    expect(failed.isError).toBe(true);
    expect(JSON.stringify(failed)).not.toContain("secret");
  } finally {
    await Promise.all(clients.map((c) => c.close()));
    await Promise.all(servers.map((s) => s.close()));
  }
});
