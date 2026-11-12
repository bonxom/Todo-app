import { z } from "zod";

export const webSearchInputSchema = z.strictObject({
  query: z
    .string()
    .trim()
    .min(1, "query is required")
    .max(400, "query must be at most 400 characters")
    .refine(
      (val) => val.split(/\s+/).filter(Boolean).length <= 75,
      "query must not exceed 75 words",
    ),
  count: z
    .number()
    .int("count must be an integer")
    .min(1, "count must be at least 1")
    .max(5, "count must be at most 5")
    .optional()
    .default(5),
});

export const webSearchResultItemSchema = z.object({
  title: z.string().max(200),
  url: z.string().url().max(2048),
  snippet: z.string().max(1000),
});

export const webSearchOutputSchema = z.object({
  query: z.string(),
  searchedAt: z.string(),
  results: z.array(webSearchResultItemSchema),
});

export type WebSearchInputDto = z.infer<typeof webSearchInputSchema>;
export type WebSearchOutputDto = z.infer<typeof webSearchOutputSchema>;
