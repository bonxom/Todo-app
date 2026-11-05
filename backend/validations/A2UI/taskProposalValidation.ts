import { z } from "zod";
import { normalizeTaskDateInput } from "../../utils/dateTime.js";
import { objectIdSchema } from "../commonValidation.js";

const prioritySchema = z.enum(["Low", "Medium", "High"]);
const calendarDateSchema = z.union([
  z.iso.date(),
  z.iso.datetime({ offset: true, local: true }),
]);
// Validate calendar components before the shared normalizer can roll overflow
// into another month/day. Preserve the existing local, display and ISO formats.
const proposalDateSchema = z
  .string()
  .refine(
    (value) =>
      value === "" ||
      calendarDateSchema.safeParse(
        value.replaceAll("/", "-").replace(/\s+/, "T"),
      ).success,
    "Invalid calendar date or time",
  )
  .optional()
  .nullable();

export const proposalItemSchema = z
  .object({
    id: z.string().uuid(),
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title must not exceed 200 characters"),
    description: z
      .string()
      .max(1000, "Description must not exceed 1000 characters")
      .optional(),
    priority: prioritySchema.optional(),
    categoryId: objectIdSchema("categoryId").optional(),
    projectId: objectIdSchema("projectId").optional().nullable(),
    startDate: proposalDateSchema,
    dueDate: proposalDateSchema,
  })
  .strict()
  .superRefine((item, ctx) => {
    if (item.startDate && item.dueDate) {
      const startResult = normalizeTaskDateInput(item.startDate);
      const dueResult = normalizeTaskDateInput(item.dueDate);

      if (startResult.error || !startResult.value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["startDate"],
          message: startResult.error || "Invalid start date",
        });
      }

      if (dueResult.error || !dueResult.value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dueDate"],
          message: dueResult.error || "Invalid due date",
        });
      }

      if (
        startResult.value &&
        dueResult.value &&
        startResult.value > dueResult.value
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["startDate"],
          message: "Start date cannot follow due date",
        });
      }
    } else if (item.startDate) {
      const startResult = normalizeTaskDateInput(item.startDate);
      if (startResult.error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["startDate"],
          message: startResult.error,
        });
      }
    } else if (item.dueDate) {
      const dueResult = normalizeTaskDateInput(item.dueDate);
      if (dueResult.error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dueDate"],
          message: dueResult.error,
        });
      }
    }
  });

export const proposalItemsSchema = z
  .array(proposalItemSchema)
  .min(1, "At least 1 item is required")
  .max(20, "At most 20 items are allowed")
  .superRefine((items, ctx) => {
    const seen = new Set<string>();
    for (let i = 0; i < items.length; i++) {
      const id = items[i].id;
      if (seen.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [i, "id"],
          message: `Duplicate item ID: ${id}`,
        });
      }
      seen.add(id);
    }
  });

const saveOrConfirmActionSchema = z
  .object({
    requestId: z.string().uuid(),
    revision: z.number().int().min(1),
    action: z.enum(["save", "confirm"]),
    items: proposalItemsSchema,
    selectedItemIds: z.array(z.string().uuid()),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.action === "confirm" && data.selectedItemIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["selectedItemIds"],
        message: "At least one item must be selected to confirm",
      });
    }

    const itemIds = new Set(data.items.map((i) => i.id));
    const selectedSeen = new Set<string>();

    for (let i = 0; i < data.selectedItemIds.length; i++) {
      const selectedId = data.selectedItemIds[i];
      if (selectedSeen.has(selectedId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["selectedItemIds", i],
          message: `Duplicate selected item ID: ${selectedId}`,
        });
      }
      selectedSeen.add(selectedId);

      if (!itemIds.has(selectedId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["selectedItemIds", i],
          message: `Selected item ID ${selectedId} is not in items list`,
        });
      }
    }
  });

const cancelActionSchema = z
  .object({
    requestId: z.string().uuid(),
    revision: z.number().int().min(1),
    action: z.literal("cancel"),
  })
  .strict();

export const proposalActionSchema = z.discriminatedUnion("action", [
  saveOrConfirmActionSchema,
  cancelActionSchema,
]);

export const proposalParamsSchema = z
  .object({
    conversationId: z.uuid(),
    proposalId: z.uuid(),
  })
  .strict();
