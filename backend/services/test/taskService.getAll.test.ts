import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { categoryRepository } from "../../repositories/categoryRepository.js";
import { projectRepository } from "../../repositories/projectRepository.js";
import { taskRepository } from "../../repositories/taskRepository.js";
import { COMMON_ERROR } from "../../error/definitions/commonErrors.js";
import type { IUserDocument } from "../../types/IUser.js";
import { taskService } from "../taskService.js";

describe("taskService.getAll query boundaries", () => {
  const categoryId = new mongoose.Types.ObjectId();
  const projectId = new mongoose.Types.ObjectId();
  const foreignProjectId = new mongoose.Types.ObjectId();
  const user = {
    _id: new mongoose.Types.ObjectId(),
    role: "USER",
  } as IUserDocument;

  beforeEach(() => {
    vi.spyOn(categoryRepository, "findByUser").mockResolvedValue([
      { _id: categoryId },
    ] as never);
    vi.spyOn(projectRepository, "findByUser").mockResolvedValue([
      { _id: projectId },
    ] as never);
    vi.spyOn(taskRepository, "findPaginated").mockResolvedValue({
      data: [],
      totalCount: 0,
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it("preserves access OR when search introduces its own OR", async () => {
    await taskService.getAll(user, { search: "report" });
    expect(taskRepository.findPaginated).toHaveBeenCalledWith(
      {
        $and: [
          {
            $or: [
              { categoryId: { $in: [categoryId] } },
              { projectId: { $in: [projectId] } },
            ],
          },
          { $or: [{ title: /report/i }, { description: /report/i }] },
        ],
      },
      { skip: 0, limit: 20, sort: { dueDate: 1, createdAt: -1 } },
    );
  });

  it.each([foreignProjectId.toString(), "standalone"])(
    "preserves project-only access when filtering %s",
    async (filter) => {
      vi.mocked(categoryRepository.findByUser).mockResolvedValue([]);
      await taskService.getAll(user, { projectId: filter });
      expect(taskRepository.findPaginated).toHaveBeenCalledWith(
        {
          $and: [
            { projectId: { $in: [projectId] } },
            { projectId: filter === "standalone" ? null : filter },
          ],
        },
        expect.any(Object),
      );
    },
  );

  it("keeps paging shape, skip, limit and explicit sort", async () => {
    const result = await taskService.getAll(user, {
      pageNo: 2,
      pageSize: 1,
      sort: "title:asc",
    });
    expect(taskRepository.findPaginated).toHaveBeenCalledWith(
      expect.any(Object),
      { skip: 1, limit: 1, sort: { title: 1 } },
    );
    expect(result).toEqual({
      data: [],
      pageInfo: { pageNo: 2, pageSize: 1, totalCount: 0, totalPage: 0 },
    });
  });

  it.each([
    { startDate: "2026-10-01" },
    { endDate: "2026-10-31" },
    { startDate: "invalid", endDate: "2026-10-31" },
    { startDate: "2026-10-31", endDate: "2026-10-01" },
  ])("rejects invalid ranges without querying tasks: %o", async (query) => {
    await expect(taskService.getAll(user, query)).rejects.toMatchObject({
      code: COMMON_ERROR.INVALID_PAYLOAD.code,
    });
    expect(taskRepository.findPaginated).not.toHaveBeenCalled();
  });
});
