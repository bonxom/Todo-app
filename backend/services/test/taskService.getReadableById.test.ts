import mongoose from "mongoose";
import { afterEach, expect, it, vi } from "vitest";
import { categoryRepository } from "../../repositories/categoryRepository.js";
import { projectRepository } from "../../repositories/projectRepository.js";
import { taskRepository } from "../../repositories/taskRepository.js";
import { taskService } from "../taskService.js";
import type { IUserDocument } from "../../types/IUser.js";
import { TASK_ERROR } from "../../error/definitions/taskErrors.js";
afterEach(() => vi.restoreAllMocks());
it("intersects ID with both access branches and hides absent/foreign rows", async () => {
  const categoryId = new mongoose.Types.ObjectId(),
    projectId = new mongoose.Types.ObjectId();
  const taskId = new mongoose.Types.ObjectId();
  const user = {
    _id: new mongoose.Types.ObjectId(),
    role: "USER",
  } as IUserDocument;
  vi.spyOn(categoryRepository, "findByUser").mockResolvedValue([
    { _id: categoryId },
  ] as never);
  vi.spyOn(projectRepository, "findByUser").mockResolvedValue([
    { _id: projectId },
  ] as never);
  const find = vi
    .spyOn(taskRepository, "findPaginated")
    .mockResolvedValue({ data: [], totalCount: 0 });
  await expect(taskService.getReadableById(taskId, user)).rejects.toMatchObject(
    { code: TASK_ERROR.NOT_FOUND.code },
  );
  expect(find).toHaveBeenCalledWith(
    {
      $and: [
        {
          $or: [
            { categoryId: { $in: [categoryId] } },
            { projectId: { $in: [projectId] } },
          ],
        },
        { _id: taskId },
      ],
    },
    { skip: 0, limit: 1, sort: { _id: 1 } },
  );
  const task = { _id: taskId };
  find.mockResolvedValue({ data: [task], totalCount: 1 } as never);
  expect(await taskService.getReadableById(taskId, user)).toBe(task);
});
