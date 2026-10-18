import { z } from "zod";
import { id, pageInfo } from "./common.js";

export const projectDtoSchema = z.strictObject({
  id,
  name: z.string(),
  description: z.string().nullable(),
  color: z.string(),
  status: z.enum(["active", "completed"]),
});

export const projectPageOutputSchema = z.strictObject({
  pageInfo,
  data: z.array(projectDtoSchema),
});

export type ProjectDto = z.infer<typeof projectDtoSchema>;
export { listPageInputSchema, type ListPageInput } from "./common.js";
