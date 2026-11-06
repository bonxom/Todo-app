import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Types } from "mongoose";
import { taskWriteService } from "../services/taskWriteService.js";
import { writeRepository } from "../repositories/writeRepository.js";
import { taskService } from "../../services/taskService.js";
import { statService } from "../../services/statService.js";
import type { McpContext } from "../context.js";
import type { ITaskDocument } from "../../types/ITask.js";
const id = new Types.ObjectId();
const task = {
  _id: id,
  title: "Delete me",
  status: "pending",
  priority: "Low",
  categoryId: new Types.ObjectId(),
  createdAt: new Date(),
  updatedAt: new Date(),
} as ITaskDocument;
const context = {
  user: { _id: new Types.ObjectId(), role: "USER" },
  requestId: "delete-test",
  scopes: ["tasks:write"],
  beforeWrite: vi.fn(),
} as unknown as McpContext;
const args = { taskId: String(id), idempotencyKey: "delete-intent-00001" };
beforeEach(() => {
  vi.spyOn(writeRepository, "transaction").mockImplementation(
    async (_id, run) => run(),
  );
  vi.spyOn(writeRepository, "findReceipt").mockResolvedValue(null);
  vi.spyOn(writeRepository, "saveReceipt").mockResolvedValue({} as never);
  vi.spyOn(taskService, "getById").mockResolvedValue(task);
  vi.spyOn(taskService, "delete").mockResolvedValue();
  vi.spyOn(statService, "getStats").mockResolvedValue({} as never);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
it("deletes the owned task, rebuilds stats and saves a verified snapshot", async () => {
  const output = await taskWriteService.delete(args, context);
  expect(taskService.getById).toHaveBeenCalledWith(String(id), context.user);
  expect(context.beforeWrite).toHaveBeenCalledOnce();
  expect(taskService.delete).toHaveBeenCalledWith(String(id), context.user);
  expect(statService.getStats).toHaveBeenCalledWith(context.user);
  expect(output).toMatchObject({
    deleted: true,
    task: { id: String(id), title: "Delete me" },
  });
  expect(writeRepository.saveReceipt).toHaveBeenCalledWith(
    expect.objectContaining({ operation: "delete", output }),
  );
});
it("replays the same intent after the task is gone without deleting or rebuilding stats again", async () => {
  await taskWriteService.delete(args, context);
  const receipt = vi.mocked(writeRepository.saveReceipt).mock.calls[0]![0];
  vi.mocked(writeRepository.findReceipt).mockResolvedValue(receipt as never);
  vi.mocked(taskService.getById).mockRejectedValue(new Error("Task gone"));
  expect(await taskWriteService.delete(args, context)).toEqual(receipt.output);
  expect(taskService.delete).toHaveBeenCalledTimes(1);
  expect(statService.getStats).toHaveBeenCalledTimes(1);
  await expect(
    taskWriteService.delete(
      { ...args, taskId: String(new Types.ObjectId()) },
      context,
    ),
  ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
});
it("enforces scope and strict input before DB access", async () => {
  await expect(
    taskWriteService.delete(args, { ...context, scopes: [] }),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(
    taskWriteService.delete({ ...args, taskId: "invalid" }, context),
  ).rejects.toBeDefined();
  await expect(
    taskWriteService.delete({ ...args, userId: "injected" }, context),
  ).rejects.toBeDefined();
  expect(writeRepository.transaction).not.toHaveBeenCalled();
});
it("does not mutate a foreign or missing task", async () => {
  vi.mocked(taskService.getById).mockRejectedValue(new Error("not accessible"));
  await expect(taskWriteService.delete(args, context)).rejects.toThrow(
    "not accessible",
  );
  expect(taskService.delete).not.toHaveBeenCalled();
  expect(writeRepository.saveReceipt).not.toHaveBeenCalled();
});
it("does not delete if the turn execution guard rejects", async () => {
  await expect(
    taskWriteService.delete(args, {
      ...context,
      beforeWrite: async () => {
        throw new Error("expired");
      },
    }),
  ).rejects.toThrow("expired");
  expect(taskService.delete).not.toHaveBeenCalled();
});

it("registers delete only for write sessions and calls it over the MCP SDK", async () => {
  const { createOrbitMcpServer } = await import("../server.js");
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { InMemoryTransport } =
    await import("@modelcontextprotocol/sdk/inMemory.js");
  for (const allowed of [false, true]) {
    const server = createOrbitMcpServer({
      ...context,
      scopes: allowed ? ["tasks:write"] : [],
    });
    const client = new Client({ name: "delete-test", version: "1" });
    const [a, b] = InMemoryTransport.createLinkedPair();
    try {
      await server.connect(a);
      await client.connect(b);
      const names = (await client.listTools()).tools.map((t) => t.name);
      expect(names.includes("orbit_delete_task")).toBe(allowed);
      if (allowed) {
        const result = await client.callTool({
          name: "orbit_delete_task",
          arguments: args,
        });
        expect(result.isError).not.toBe(true);
        expect(result.structuredContent).toMatchObject({
          deleted: true,
          task: { id: String(id) },
        });
      }
    } finally {
      await client.close();
      await server.close();
    }
  }
});
