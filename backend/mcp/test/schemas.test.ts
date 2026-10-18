import { expect, it } from "vitest";
import { listTasksInputSchema, getTaskInputSchema } from "../schemas.js";
it.each([
  { userId: "attacker" },
  { pageSize: 101 },
  { pageSize: 0 },
  { pageNo: 1.2 },
  { pageNo: "1" },
  { status: "other" },
  { projectId: { $ne: null } },
  { projectId: "" },
  { sort: "userId:asc" },
  { startDate: "2026-10-16" },
  { startDate: "2026-10-16T00:00:00Z" },
  { startDate: "2026-10-17T00:00:00Z", endDate: "2026-10-16T00:00:00Z" },
  { startDate: "2026-10-16T00:00:00", endDate: "2026-10-17T00:00:00" },
])("rejects invalid input %o", (input) => {
  expect(listTasksInputSchema.safeParse(input).success).toBe(false);
});
it("supports defaults, explicit offsets, literal search and strict ID", () => {
  expect(listTasksInputSchema.parse({})).toEqual({ pageNo: 1, pageSize: 20 });
  expect(
    listTasksInputSchema.parse({
      search: " a+b ",
      startDate: "2026-10-16T07:00:00+07:00",
      endDate: "2026-10-16T00:00:00Z",
    }).search,
  ).toBe("a+b");
  expect(getTaskInputSchema.safeParse({ taskId: { $ne: null } }).success).toBe(
    false,
  );
});
