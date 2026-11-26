import { z } from "zod";
import {
  UI_INTERACTIVE_CATALOG_ID,
  type InteractiveSurfaceSpec,
  type StoredInteractiveSurface,
  type UiActionBinding,
} from "../../types/A2UI/IUiAction.js";
import type { UiSurfaceEnvelope } from "../../types/A2UI/IUiSurface.js";
import {
  UI_SURFACE_LIMITS,
  compiledPresentationComponentSchemas,
  displayDataSchema,
  isValidKeyName,
  keySchema,
  presentationNodeSchemas,
  validateDisplayBindings,
  validateSurfaceTree,
} from "./uiSurfaceValidation.js";

export const UI_INTERACTIVE_LIMITS = {
  MAX_ACTIONS: 10,
} as const;

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;
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

export const uiActionSpecSchema = z.strictObject({
  name: z.literal("task.complete"),
  taskId: z.string().regex(OBJECT_ID_REGEX, "Invalid taskId"),
});

export const buttonNodeSchema = z.strictObject({
  id: keySchema,
  component: z.literal("Button"),
  label: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .refine(
      (value) => value.trim().length > 0,
      "Button label must not be blank",
    ),
  actionKey: keySchema,
});

export const interactiveUiNodeSchema = z.discriminatedUnion("component", [
  ...presentationNodeSchemas,
  buttonNodeSchema,
]);

export const interactiveActionsSchema = z
  .record(z.string(), uiActionSpecSchema)
  .superRefine((record, ctx) => {
    const keys = Object.keys(record);
    if (keys.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Interactive surface must declare at least 1 action",
      });
    }
    if (keys.length > UI_INTERACTIVE_LIMITS.MAX_ACTIONS) {
      ctx.addIssue({
        code: "custom",
        message: `Interactive surface may declare at most ${UI_INTERACTIVE_LIMITS.MAX_ACTIONS} actions`,
      });
    }
    for (const key of keys) {
      if (!isValidKeyName(key)) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `Invalid action key: ${key}`,
        });
      }
    }
  });

export const interactiveSurfaceSpecBaseSchema = z.strictObject({
  fallbackText: z
    .string()
    .min(1)
    .max(UI_SURFACE_LIMITS.MAX_FALLBACK_TEXT_LENGTH)
    .refine(
      (value) => value.trim().length > 0,
      "Fallback text must not be blank",
    ),
  components: z
    .array(interactiveUiNodeSchema)
    .min(1)
    .max(UI_SURFACE_LIMITS.MAX_COMPONENTS),
  displayData: displayDataSchema,
  actions: interactiveActionsSchema,
});

function validateInteractiveBindings(
  spec: InteractiveSurfaceSpec,
  ctx: z.RefinementCtx,
): void {
  const referencedActionKeys = new Set<string>();

  for (let i = 0; i < spec.components.length; i++) {
    const node = spec.components[i];
    if (node.component !== "Button") continue;

    if (!Object.prototype.hasOwnProperty.call(spec.actions, node.actionKey)) {
      ctx.addIssue({
        code: "custom",
        path: ["components", i, "actionKey"],
        message: `Button '${node.id}' references undefined actionKey '${node.actionKey}'`,
      });
    } else {
      referencedActionKeys.add(node.actionKey);
    }
  }

  for (const key of Object.keys(spec.actions)) {
    if (!referencedActionKeys.has(key)) {
      ctx.addIssue({
        code: "custom",
        path: ["actions", key],
        message: `Declared action '${key}' is not referenced by any Button`,
      });
    }
  }
}

export const interactiveSurfaceSpecSchema: z.ZodType<InteractiveSurfaceSpec> =
  interactiveSurfaceSpecBaseSchema.superRefine((spec, ctx) => {
    validateSurfaceTree(spec.components, ctx);
    validateDisplayBindings(spec.components, spec.displayData, ctx);
    validateInteractiveBindings(spec, ctx);
  });

export function parseInteractiveSpec(input: unknown): InteractiveSurfaceSpec {
  if (input !== null && typeof input === "object") {
    const byteLength = Buffer.byteLength(JSON.stringify(input), "utf8");
    if (byteLength > UI_SURFACE_LIMITS.MAX_PAYLOAD_BYTES) {
      throw new z.ZodError([
        {
          code: "custom",
          path: [],
          message: "Surface payload exceeds 128 KiB limit",
        },
      ]);
    }
  }
  return interactiveSurfaceSpecSchema.parse(input);
}

export const uiActionBindingSchema: z.ZodType<UiActionBinding> = z.strictObject(
  {
    id: z.uuid(),
    key: keySchema,
    name: z.literal("task.complete"),
    taskId: z.string().regex(OBJECT_ID_REGEX, "Invalid taskId"),
  },
);

export function validateStoredActionBindings(
  spec: InteractiveSurfaceSpec,
  bindings: readonly UiActionBinding[],
  ctx: z.RefinementCtx,
): void {
  const seenKeys = new Set<string>();
  const seenIds = new Set<string>();
  const actionKeys = Object.keys(spec.actions);

  for (let i = 0; i < bindings.length; i++) {
    const binding = bindings[i];
    if (seenIds.has(binding.id)) {
      ctx.addIssue({
        code: "custom",
        path: ["actionBindings", i, "id"],
        message: `Duplicate action binding ID '${binding.id}'`,
      });
    }
    seenIds.add(binding.id);

    if (seenKeys.has(binding.key)) {
      ctx.addIssue({
        code: "custom",
        path: ["actionBindings", i, "key"],
        message: `Duplicate action binding key '${binding.key}'`,
      });
    }
    seenKeys.add(binding.key);

    if (!Object.prototype.hasOwnProperty.call(spec.actions, binding.key)) {
      ctx.addIssue({
        code: "custom",
        path: ["actionBindings", i, "key"],
        message: `Binding key '${binding.key}' is not declared in spec.actions`,
      });
      continue;
    }

    const expected = spec.actions[binding.key];
    if (expected.name !== binding.name || expected.taskId !== binding.taskId) {
      ctx.addIssue({
        code: "custom",
        path: ["actionBindings", i],
        message: `Action binding '${binding.key}' does not match spec.actions`,
      });
    }
  }

  for (const key of actionKeys) {
    if (!seenKeys.has(key)) {
      ctx.addIssue({
        code: "custom",
        path: ["actionBindings"],
        message: `Missing action binding for '${key}'`,
      });
    }
  }
}

export const storedInteractiveSurfaceSchema: z.ZodType<StoredInteractiveSurface> =
  z
    .strictObject({
      catalogId: z.literal(UI_INTERACTIVE_CATALOG_ID),
      surfaceId: z.uuid(),
      spec: interactiveSurfaceSpecBaseSchema.extend({
        displayData: displayDataSchema.default({}),
      }),
      actionBindings: z
        .array(uiActionBindingSchema)
        .min(1)
        .max(UI_INTERACTIVE_LIMITS.MAX_ACTIONS),
    })
    .superRefine((stored, ctx) => {
      validateSurfaceTree(stored.spec.components, ctx);
      validateDisplayBindings(
        stored.spec.components,
        stored.spec.displayData,
        ctx,
      );
      validateInteractiveBindings(stored.spec, ctx);
      validateStoredActionBindings(stored.spec, stored.actionBindings, ctx);
    });

const compiledDispatchActionSchema = z.strictObject({
  event: z.strictObject({
    name: z.literal("dispatch"),
    context: z.strictObject({
      actionId: z.uuid(),
    }),
  }),
});

const compiledInteractiveComponentSchema = z.discriminatedUnion("component", [
  ...compiledPresentationComponentSchemas,
  z.strictObject({
    id: keySchema,
    component: z.literal("Button"),
    label: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .refine((v) => v.trim().length > 0, "Button label must not be blank"),
    action: compiledDispatchActionSchema,
    actionState: z.strictObject({
      path: actionStatePathSchema,
    }),
  }),
]);

const actionStateEntrySchema = z.strictObject({
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
});

const actionStateMapSchema = z
  .record(z.string(), actionStateEntrySchema)
  .superRefine((record, ctx) => {
    const keys = Object.keys(record);
    if (keys.length === 0 || keys.length > UI_INTERACTIVE_LIMITS.MAX_ACTIONS) {
      ctx.addIssue({
        code: "custom",
        message: "actionState must contain between 1 and 10 entries",
      });
    }
    for (const key of keys) {
      if (!isValidKeyName(key)) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `Invalid actionState key: ${key}`,
        });
      }
    }
  });

const compiledInteractiveMessageSchema = z.union([
  z.strictObject({
    version: z.literal("v0.9"),
    createSurface: z.strictObject({
      surfaceId: z.uuid(),
      catalogId: z.literal(UI_INTERACTIVE_CATALOG_ID),
    }),
  }),
  z.strictObject({
    version: z.literal("v0.9"),
    updateComponents: z.strictObject({
      surfaceId: z.uuid(),
      components: z
        .array(compiledInteractiveComponentSchema)
        .min(1)
        .max(UI_SURFACE_LIMITS.MAX_COMPONENTS),
    }),
  }),
  z.strictObject({
    version: z.literal("v0.9"),
    updateDataModel: z.strictObject({
      surfaceId: z.uuid(),
      path: z.literal("/"),
      value: z.strictObject({
        display: displayDataSchema,
        actionState: actionStateMapSchema,
      }),
    }),
  }),
]);

export const interactiveSurfaceEnvelopeSchema: z.ZodType<UiSurfaceEnvelope> = z
  .strictObject({
    text: z
      .string()
      .min(1)
      .max(UI_SURFACE_LIMITS.MAX_FALLBACK_TEXT_LENGTH)
      .refine((v) => v.trim().length > 0, "Text must not be blank"),
    a2ui: z.strictObject({
      protocolVersion: z.literal("v0.9"),
      catalogId: z.literal(UI_INTERACTIVE_CATALOG_ID),
      surfaceId: z.uuid(),
      messages: z
        .array(compiledInteractiveMessageSchema)
        .min(1)
        .max(UI_SURFACE_LIMITS.MAX_MESSAGES),
    }),
  })
  .superRefine((envelope, ctx) => {
    if (
      Buffer.byteLength(JSON.stringify(envelope), "utf8") >
      UI_SURFACE_LIMITS.MAX_PAYLOAD_BYTES
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Envelope payload exceeds 128 KiB limit",
      });
    }
  });

export function parseInteractiveSurfaceEnvelope(
  input: unknown,
): UiSurfaceEnvelope {
  return interactiveSurfaceEnvelopeSchema.parse(input);
}
