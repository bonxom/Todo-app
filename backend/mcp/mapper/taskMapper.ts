import type { ITaskDocument } from "../../types/ITask.js";
import { taskDtoSchema } from "../schemas.js";
import type { TaskDto } from "../schemas.js";
import { referenceId, isoDate } from "./shared.js";

export function toTaskDto(task: ITaskDocument): TaskDto {
  return taskDtoSchema.parse({
    id: referenceId(task._id),
    title: task.title,
    description: task.description ?? null,
    status: task.status,
    priority: task.priority,
    categoryId: referenceId(task.categoryId),
    projectId: referenceId(task.projectId),
    startDate: isoDate(task.startDate, true),
    dueDate: isoDate(task.dueDate, true),
    completedAt: isoDate(task.completedAt, true),
    createdAt: isoDate(task.createdAt),
    updatedAt: isoDate(task.updatedAt),
  });
}
