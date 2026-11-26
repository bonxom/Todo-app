import { z } from "zod";
import { UI_INTERACTIVE_CATALOG_ID } from "@/shared/types/A2UI/uiAction";
import type { SurfacePayload } from "./catalogRegistry";
import {
  UI_COMPOSITION_LIMITS,
  compiledPresentationComponentSchemas,
  displayDataSchema,
  isValidKeyName,
  keySchema,
  validateDisplayBindings,
  validateSurfaceTree,
} from "./compositionSchema";

export const UI_INTERACTIVE_LIMITS = {
  MAX_ACTIONS: 10,
} as const;

const ACTION_STATE_PATH_REGEX = /^\/actionState\/([A-Za-z][A-Za-z0-9_]{0,63})$/;

export function extractActionStateKey(path: string): string | null {
  const match = ACTION_STATE_PATH_REGEX.exec(path);
  if (!match) return null;
  const key = match[1];
  return isValidKeyName(key) ? key : null;
}

export const actionStatePathSchema = z
  .string()
  .refine(
    (value) => extractActionStateKey(value) !== null,
    "Action state path must match /actionState/<key> with a valid key name",
  );

export const compiledDispatchActionSchema = z
  .object({
    event: z
      .object({
        name: z.literal("dispatch"),
        context: z
          .object({
            actionId: z.string().uuid(),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

export const buttonPropertiesSchema = z
  .object({
    label: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .refine((v) => v.trim().length > 0, "Button label must not be blank"),
    action: compiledDispatchActionSchema,
    actionState: z
      .object({
        path: actionStatePathSchema,
      })
      .strict(),
  })
  .strict();

const compiledInteractiveComponentSchema = z.discriminatedUnion("component", [
  ...compiledPresentationComponentSchemas,
  buttonPropertiesSchema.extend({
    id: keySchema,
    component: z.literal("Button"),
  }),
]);

export const actionStateEntrySchema = z
  .object({
    status: z.enum([
      "loading",
      "ready",
      "pending",
      "uncertain",
      "succeeded",
      "unavailable",
    ]),
    disabled: z.boolean(),
    reason: z.string().optional(),
  })
  .strict();

export const actionStateMapSchema = z
  .record(z.string(), actionStateEntrySchema)
  .superRefine((record, ctx) => {
    const keys = Object.keys(record);
    if (keys.length === 0 || keys.length > UI_INTERACTIVE_LIMITS.MAX_ACTIONS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "actionState must contain between 1 and 10 entries",
      });
    }
    for (const key of keys) {
      if (!isValidKeyName(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `Invalid actionState key: ${key}`,
        });
      }
    }
  });

export const interactiveDataModelSchema = z
  .object({
    display: displayDataSchema,
    actionState: actionStateMapSchema,
  })
  .strict();

export function validateInteractivePayload(payload: SurfacePayload): void {
  if (payload.protocolVersion !== "v0.9") {
    throw new Error("Unsupported protocol version");
  }
  if (payload.catalogId !== UI_INTERACTIVE_CATALOG_ID) {
    throw new Error("Unsupported interactive catalog");
  }
  const surfaceId = z.string().uuid().parse(payload.surfaceId);
  if (
    new TextEncoder().encode(JSON.stringify(payload)).length >
    UI_COMPOSITION_LIMITS.MAX_PAYLOAD_BYTES
  ) {
    throw new Error("Interactive payload exceeds 128 KiB limit");
  }

  if (payload.messages.length !== 3) {
    throw new Error(
      "Interactive surface requires createSurface, updateComponents, and updateDataModel messages",
    );
  }

  z.object({
    version: z.literal("v0.9"),
    createSurface: z
      .object({
        surfaceId: z.literal(surfaceId),
        catalogId: z.literal(UI_INTERACTIVE_CATALOG_ID),
      })
      .strict(),
  })
    .strict()
    .parse(payload.messages[0]);

  const componentsMsg = z
    .object({
      version: z.literal("v0.9"),
      updateComponents: z
        .object({
          surfaceId: z.literal(surfaceId),
          components: z
            .array(compiledInteractiveComponentSchema)
            .min(1)
            .max(UI_COMPOSITION_LIMITS.MAX_COMPONENTS),
        })
        .strict(),
    })
    .strict()
    .parse(payload.messages[1]);

  const dataModelMsg = z
    .object({
      version: z.literal("v0.9"),
      updateDataModel: z
        .object({
          surfaceId: z.literal(surfaceId),
          path: z.literal("/"),
          value: interactiveDataModelSchema,
        })
        .strict(),
    })
    .strict()
    .parse(payload.messages[2]);

  const components = componentsMsg.updateComponents.components;
  const dataModel = dataModelMsg.updateDataModel.value;

  validateSurfaceTree(components);
  validateDisplayBindings(components, dataModel.display);

  for (const node of components) {
    if (node.component !== "Button") continue;
    const key = extractActionStateKey(node.actionState.path);
    if (
      !key ||
      !Object.prototype.hasOwnProperty.call(dataModel.actionState, key)
    ) {
      throw new Error(
        `Button actionState '${node.actionState.path}' does not exist in actionState model`,
      );
    }
  }
}
