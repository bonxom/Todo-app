import { z } from "zod";

export const uiActionParamsSchema = z.strictObject({
  conversationId: z.uuid(),
  turnId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/, "Invalid turnId"),
  surfaceId: z.uuid(),
});

export const uiActionBodySchema = z.strictObject({
  requestId: z.uuid(),
  actionId: z.uuid(),
});

export type UiActionParams = z.infer<typeof uiActionParamsSchema>;
export type UiActionBody = z.infer<typeof uiActionBodySchema>;
