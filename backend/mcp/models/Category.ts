import { z } from "zod";
import { id, pageInfo } from "./common.js";

export const categoryDtoSchema = z.strictObject({
  id,
  name: z.string(),
  description: z.string().nullable(),
});

export const categoryPageOutputSchema = z.strictObject({
  pageInfo,
  data: z.array(categoryDtoSchema),
});

export type CategoryDto = z.infer<typeof categoryDtoSchema>;
export { listPageInputSchema, type ListPageInput } from "./common.js";
