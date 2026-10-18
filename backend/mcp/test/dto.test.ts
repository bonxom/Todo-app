import { Types } from "mongoose";
import { expect, it } from "vitest";
import { toTaskDto } from "../mapper/taskMapper.js";
import { toProjectDto } from "../mapper/projectMapper.js";
import { toCategoryDto } from "../mapper/categoryMapper.js";
import type { ITaskDocument } from "../../types/ITask.js";
const id = new Types.ObjectId();
const at = new Date("2026-10-16T00:00:00Z");
const base = {
  _id: id,
  title: "Task",
  status: "pending",
  priority: "Low",
  createdAt: at,
  updatedAt: at,
};
it("whitelists populated/raw/null refs and normalizes dates", () => {
  const dto = toTaskDto({
    ...base,
    categoryId: { _id: id, userId: { email: "secret@example.test" } },
    projectId: id,
  } as unknown as ITaskDocument);
  expect(dto).toEqual({
    id: String(id),
    title: "Task",
    description: null,
    status: "pending",
    priority: "Low",
    categoryId: String(id),
    projectId: String(id),
    startDate: null,
    dueDate: null,
    completedAt: null,
    createdAt: at.toISOString(),
    updatedAt: at.toISOString(),
  });
  expect(JSON.stringify(dto)).not.toContain("secret");
  expect(toTaskDto(base as ITaskDocument).categoryId).toBeNull();
  expect(() =>
    toTaskDto({ ...base, createdAt: "broken" } as unknown as ITaskDocument),
  ).toThrow();
  expect(
    toProjectDto({
      _id: id,
      name: "P",
      color: "#FFFFFF",
      status: "active",
      summary: { secret: true },
    }),
  ).toEqual({
    id: String(id),
    name: "P",
    description: null,
    color: "#FFFFFF",
    status: "active",
  });
  expect(
    toCategoryDto({ _id: id, name: "C", userId: { email: "secret" } } as never),
  ).toEqual({ id: String(id), name: "C", description: null });
});
