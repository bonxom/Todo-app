import { z } from "zod";
export const notificationQuerySchema = z
  .object({
    pageNo: z.coerce.number().int().positive().max(1_000_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    filter: z.enum(["all", "unread"]).default("all"),
  })
  .strict();
export const notificationParamsSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/i),
});
export const notificationBodySchema = z.object({}).strict().default({});
