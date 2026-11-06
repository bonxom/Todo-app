import { z } from "zod";

export const skillCreateSchema = z.strictObject({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(500),
  instructions: z.string().trim().min(1).max(10000),
  enabled: z.boolean().default(true),
});

export const skillUpdateSchema = z.strictObject({
  expectedVersion: z.number().int().min(1),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(500),
  instructions: z.string().trim().min(1).max(10000),
  enabled: z.boolean(),
});

export const skillParamsSchema = z.strictObject({
  skillId: z.string().uuid(),
});

export const skillDeleteQuerySchema = z.strictObject({
  expectedVersion: z.coerce.number().int().min(1),
});

export const templateParamsSchema = z.strictObject({
  templateId: z.string().regex(/^[a-z0-9-]+$/),
});

export const skillImportTemplateSchema = z.strictObject({
  templateId: z.string().regex(/^[a-z0-9-]+$/),
  expectedTemplateVersion: z.string().min(1),
});
