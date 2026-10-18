import { Router } from "express";
import { taskService } from "../../services/taskService.js";
import type { McpContext } from "../context.js";
import {
  listTasksInputSchema,
  taskPageOutputSchema,
  getTaskOutputSchema,
} from "../schemas.js";
import { toTaskDto } from "../mapper/taskMapper.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const context = res.locals.mcpContext as McpContext;
    const rawQuery: Record<string, unknown> = { ...req.query };
    if (typeof rawQuery.pageNo === "string")
      rawQuery.pageNo = Number(rawQuery.pageNo);
    if (typeof rawQuery.pageSize === "string")
      rawQuery.pageSize = Number(rawQuery.pageSize);
    const parsed = listTasksInputSchema.parse(rawQuery);
    const result = await taskService.getAll(context.user, parsed);
    const output = taskPageOutputSchema.parse({
      ...result,
      data: result.data.map(toTaskDto),
    });
    res.status(200).json(output);
  } catch (error) {
    next(error);
  }
});

router.get("/:taskId", async (req, res, next) => {
  try {
    const context = res.locals.mcpContext as McpContext;
    const task = await taskService.getReadableById(
      req.params.taskId,
      context.user,
    );
    const output = getTaskOutputSchema.parse({
      task: toTaskDto(task),
    });
    res.status(200).json(output);
  } catch (error) {
    next(error);
  }
});

export default router;
