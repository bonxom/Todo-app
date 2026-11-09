import Task from "../models/Task.js";
import Category from "../models/Category.js";
import Project from "../models/Project.js";
import type { Types } from "mongoose";
export const notificationTaskRepository = {
  async findCandidateIds(now: Date, afterId?: string): Promise<string[]> {
    const tasks = await Task.find({
      status: { $in: ["pending", "in-progress"] },
      dueDate: { $ne: null, $lte: new Date(now.getTime() + 36_000_000) },
      ...(afterId ? { _id: { $gt: afterId } } : {}),
    })
      .select("_id")
      .sort({ _id: 1 })
      .limit(200)
      .lean();
    return tasks.map((t) => String(t._id));
  },
  async findCurrentCandidate(id: string) {
    const task = await Task.findById(id).lean();
    if (!task) return null;
    const [category, project] = await Promise.all([
      task.categoryId
        ? Category.findById(task.categoryId).select("userId").lean()
        : null,
      task.projectId
        ? Project.findById(task.projectId).select("userId").lean()
        : null,
    ]);
    const owners = new Map<string, Types.ObjectId>();
    for (const owner of [category?.userId, project?.userId])
      if (owner) owners.set(String(owner), owner as Types.ObjectId);
    return {
      taskId: task._id,
      status: task.status,
      dueAt: task.dueDate ?? null,
      title: task.title,
      recipientIds: [...owners.values()],
    };
  },
};
