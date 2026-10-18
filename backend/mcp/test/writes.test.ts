import { afterEach, expect, it, vi } from "vitest";
import { Types } from "mongoose";
import { taskWriteService } from "../services/taskWriteService.js";
import { write } from "../tools/shared/write.js";
import { writeRepository } from "../repositories/writeRepository.js";
import type { IUserDocument } from "../../types/IUser.js";
import type { McpContext } from "../context.js";
const context: McpContext = {
  user: { _id: new Types.ObjectId(), role: "USER" } as IUserDocument,
  requestId: "test",
  scopes: ["tasks:write"],
};
afterEach(() => vi.restoreAllMocks());

it("denies absent write permission and ADMIN before touching the database", async () => {
  const transaction = vi.spyOn(writeRepository, "transaction");
  for (const denied of [
    { ...context, scopes: [] },
    { ...context, user: { ...context.user, role: "ADMIN" } as IUserDocument },
  ]) {
    await expect(
      taskWriteService.create(
        { title: "test", idempotencyKey: "unique-key-000001" },
        denied,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  }
  expect(transaction).not.toHaveBeenCalled();
});

it.each([
  ["create", { title: "   ", idempotencyKey: "unique-key-000001" }],
  ["create", { title: "test", idempotencyKey: "short" }],
  ["create", { title: "test", idempotencyKey: "unique-key-000001", status: "in-progress" }],
  [
    "create",
    { title: "test", idempotencyKey: "unique-key-000001", userId: "injected" },
  ],
  [
    "create",
    {
      title: "test",
      idempotencyKey: "unique-key-000001",
      dueDate: "2026-10-18T12:00:00",
    },
  ],
  [
    "update",
    {
      taskId: String(new Types.ObjectId()),
      idempotencyKey: "unique-key-000001",
      changes: {},
    },
  ],
  [
    "update",
    {
      taskId: String(new Types.ObjectId()),
      idempotencyKey: "unique-key-000001",
      changes: { status: "invalid" },
    },
  ],
] as const)(
  "rejects invalid %s arguments before database access",
  async (operation, args) => {
    const transaction = vi.spyOn(writeRepository, "transaction");
    await expect(
      taskWriteService[operation](args, context),
    ).rejects.toBeDefined();
    expect(transaction).not.toHaveBeenCalled();
  },
);

it("sanitizes unexpected write failures without exposing private details", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(writeRepository, "transaction").mockRejectedValue(
    new Error("mongodb://secret"),
  );
  const response = await write(context, "create", () =>
    taskWriteService.create(
      { title: "test", idempotencyKey: "unique-key-000001" },
      context,
    ),
  );
  expect(response.isError).toBe(true);
  expect(JSON.stringify(response)).not.toContain("secret");
});
