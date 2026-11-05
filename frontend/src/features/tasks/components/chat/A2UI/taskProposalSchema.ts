import { z } from "zod";
export const TASK_PROPOSAL_CATALOG_ID = "urn:orbit:a2ui:task-proposals:v1";
export const proposalViewSchema = z
  .object({
    id: z.string().uuid(),
    conversationId: z.string().uuid(),
    turnId: z.string(),
    revision: z.number().int().positive(),
    status: z.enum(["draft", "created", "cancelled"]),
    protocolVersion: z.literal("v0.9"),
    catalogId: z.literal(TASK_PROPOSAL_CATALOG_ID),
    items: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            title: z.string(),
            description: z.string().optional(),
            priority: z.enum(["Low", "Medium", "High"]).optional(),
            categoryId: z.string().optional(),
            projectId: z.string().nullable().optional(),
            startDate: z.string().nullable().optional(),
            dueDate: z.string().nullable().optional(),
          })
          .strict(),
      )
      .min(1)
      .max(20),
    selectedItemIds: z.array(z.string().uuid()),
    createdTasks: z.array(
      z
        .object({
          itemId: z.string().uuid(),
          taskId: z.string(),
          title: z.string(),
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((view, ctx) => {
    const ids = new Set(view.items.map((item) => item.id));
    if (
      ids.size !== view.items.length ||
      new Set(view.selectedItemIds).size !== view.selectedItemIds.length ||
      view.selectedItemIds.some((id) => !ids.has(id))
    )
      ctx.addIssue({ code: "custom", message: "Invalid proposal selection" });
  });
