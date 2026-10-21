import { z } from "zod";

export const grillUserSchema = z.strictObject({
  question: z.string().trim().min(1).max(1000),
  options: z
    .array(
      z.strictObject({
        id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
        label: z.string().trim().min(1).max(200),
        description: z.string().max(500).optional(),
      }),
    )
    .min(2)
    .max(4)
    .refine(
      (v) => new Set(v.map((o) => o.id)).size === v.length,
      "Option IDs must be unique",
    ),
  allowCustomAnswer: z.boolean().default(false),
});

