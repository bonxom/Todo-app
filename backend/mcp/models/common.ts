import { z } from "zod";

export const id = z.string().regex(/^[a-fA-F0-9]{24}$/);

export const pageShape = {
  pageNo: z
    .number()
    .int()
    .min(1)
    .max(100000)
    .default(1)
    .describe("1-based page number."),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum records per page, up to 100."),
};

export const listPageInputSchema = z.strictObject(pageShape);

export const pageInfo = z.strictObject({
  pageNo: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalCount: z.number().int().nonnegative(),
  totalPage: z.number().int().nonnegative(),
});

export const date = z.iso.datetime();

export type ListPageInput = z.infer<typeof listPageInputSchema>;
