import { Router } from "express";
import { projectService } from "../../services/projectService.js";
import type { McpContext } from "../context.js";
import { listPageInputSchema, projectPageOutputSchema } from "../schemas.js";
import { toProjectDto } from "../mapper/projectMapper.js";
import { page } from "../tools/shared/common.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const context = res.locals.mcpContext as McpContext;
    const rawQuery: Record<string, unknown> = { ...req.query };
    if (typeof rawQuery.pageNo === "string")
      rawQuery.pageNo = Number(rawQuery.pageNo);
    if (typeof rawQuery.pageSize === "string")
      rawQuery.pageSize = Number(rawQuery.pageSize);
    const parsed = listPageInputSchema.parse(rawQuery);
    const result = page(
      await projectService.getAll(context.user),
      parsed,
      (p) => String(p._id),
    );
    const output = projectPageOutputSchema.parse({
      ...result,
      data: result.data.map(toProjectDto),
    });
    res.status(200).json(output);
  } catch (error) {
    next(error);
  }
});

export default router;
