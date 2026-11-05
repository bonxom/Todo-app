import { z } from "zod";
import { A2UI_CONFIG } from "../../config/A2UI/a2ui.js";
import { proposalItemsSchema } from "./taskProposalValidation.js";

const proposalCreatedTaskSchema = z
  .object({
    itemId: z.string().uuid(),
    taskId: z.string(),
    title: z.string(),
  })
  .strict();

export const proposalViewSchema = z
  .object({
    id: z.string().uuid(),
    conversationId: z.string().uuid(),
    turnId: z.string(),
    revision: z.number().int().min(1),
    status: z.enum(["draft", "created", "cancelled"]),
    protocolVersion: z.literal("v0.9"),
    catalogId: z.literal("urn:orbit:a2ui:task-proposals:v1"),
    items: proposalItemsSchema,
    selectedItemIds: z.array(z.string().uuid()),
    createdTasks: z.array(proposalCreatedTaskSchema),
  })
  .strict();

const binding = z.strictObject({ path: z.literal("/proposal") });
const action = (name: "save" | "confirm" | "cancel") =>
  z.strictObject({
    event: z.strictObject({
      name: z.literal(name),
      context: z.strictObject({
        proposal: binding,
        requestId: z.strictObject({ path: z.literal("/requestId") }),
      }),
    }),
  });
const surfaceId = z.uuid();
const messageSchema = z.union([
  z.strictObject({
    version: z.literal("v0.9"),
    createSurface: z.strictObject({
      surfaceId,
      catalogId: z.literal(A2UI_CONFIG.CATALOG_ID),
    }),
  }),
  z.strictObject({
    version: z.literal("v0.9"),
    updateComponents: z.strictObject({
      surfaceId,
      components: z
        .array(
          z.strictObject({
            id: z.literal("root"),
            component: z.literal("TaskProposalForm"),
            proposal: binding,
            saveAction: action("save"),
            confirmAction: action("confirm"),
            cancelAction: action("cancel"),
          }),
        )
        .length(1),
    }),
  }),
  z.strictObject({
    version: z.literal("v0.9"),
    updateDataModel: z.strictObject({
      surfaceId,
      path: z.literal("/proposal"),
      value: proposalViewSchema,
    }),
  }),
]);
export const a2uiPayloadSchema = z.strictObject({
  protocolVersion: z.literal("v0.9"),
  catalogId: z.literal(A2UI_CONFIG.CATALOG_ID),
  surfaceId,
  messages: z
    .array(messageSchema)
    .min(1)
    .max(A2UI_CONFIG.MAX_MESSAGES_PER_ENVELOPE),
});
export const proposalEnvelopeSchema = z
  .strictObject({
    proposal: proposalViewSchema,
    text: z.string().min(1),
    a2ui: a2uiPayloadSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (
      Buffer.byteLength(JSON.stringify(data), "utf8") >
      A2UI_CONFIG.MAX_PAYLOAD_BYTES
    )
      ctx.addIssue({
        code: "custom",
        message: "Envelope payload exceeds 128 KiB limit",
      });
  });
