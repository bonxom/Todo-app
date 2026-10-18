import { Router } from "express";
import { categoryService } from "../../services/categoryService.js";
import type { McpContext } from "../context.js";
import { listPageInputSchema, categoryPageOutputSchema } from "../schemas.js";
import { toCategoryDto } from "../mapper/categoryMapper.js";
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
      await categoryService.getAll(context.user),
      parsed,
      (c) => String(c._id),
    );
    const output = categoryPageOutputSchema.parse({
      ...result,
      data: result.data.map(toCategoryDto),
    });
    res.status(200).json(output);
  } catch (error) {
    next(error);
  }
});

export default router;
