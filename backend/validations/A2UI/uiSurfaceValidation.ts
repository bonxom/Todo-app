import { z } from "zod";
import { A2UI_CONFIG } from "../../config/A2UI/a2ui.js";
import {
  UI_COMPOSITION_CATALOG_ID,
  type DisplayScalar,
  type StoredUiSurface,
  type SurfaceSpec,
  type UiNode,
  type UiSurfaceEnvelope,
  type UiSurfaceMode,
} from "../../types/A2UI/IUiSurface.js";
import { proposalViewSchema } from "./a2uiValidation.js";

export const UI_SURFACE_LIMITS = {
  MAX_COMPONENTS: 100,
  MAX_DEPTH: 10,
  MAX_TABLE_COLUMNS: 12,
  MAX_TABLE_ROWS: 50,
  MAX_FALLBACK_TEXT_LENGTH: 8000,
  MAX_PAYLOAD_BYTES: A2UI_CONFIG.MAX_PAYLOAD_BYTES,
  MAX_MESSAGES: A2UI_CONFIG.MAX_MESSAGES_PER_ENVELOPE,
} as const;

const FORBIDDEN_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype",
  ...Object.getOwnPropertyNames(Object.prototype),
]);

const KEY_REGEX = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const DISPLAY_PATH_REGEX = /^\/display\/([A-Za-z][A-Za-z0-9_]{0,63})$/;

export function isValidKeyName(value: string): boolean {
  return KEY_REGEX.test(value) && !FORBIDDEN_KEYS.has(value);
}

export function extractDisplayKey(path: string): string | null {
  const match = DISPLAY_PATH_REGEX.exec(path);
  if (!match) return null;
  const key = match[1];
  return isValidKeyName(key) ? key : null;
}

export const keySchema = z
  .string()
  .refine(
    isValidKeyName,
    "Invalid identifier or forbidden prototype property name",
  );

export const displayPathSchema = z
  .string()
  .refine(
    (value) => extractDisplayKey(value) !== null,
    "Display path must match /display/<key> with a valid key name",
  );

export const displayScalarSchema: z.ZodType<DisplayScalar> = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

export const spacingSchema = z.enum(["none", "sm", "md", "lg"]);

export const displayValueSchema = z.union([
  z.strictObject({
    literal: displayScalarSchema,
  }),
  z.strictObject({
    path: displayPathSchema,
  }),
]);

export const tableColumnSchema = z.strictObject({
  key: keySchema,
  label: z.string().trim().min(1).max(200),
});

const columnNodeSchema = z.strictObject({
  id: keySchema,
  component: z.literal("Column"),
  children: z.array(keySchema).max(UI_SURFACE_LIMITS.MAX_COMPONENTS),
  gap: spacingSchema,
});

const rowNodeSchema = z.strictObject({
  id: keySchema,
  component: z.literal("Row"),
  children: z.array(keySchema).max(UI_SURFACE_LIMITS.MAX_COMPONENTS),
  gap: spacingSchema,
});

const cardNodeSchema = z.strictObject({
  id: keySchema,
  component: z.literal("Card"),
  children: z.array(keySchema).max(UI_SURFACE_LIMITS.MAX_COMPONENTS),
});

const textNodeSchema = z.strictObject({
  id: keySchema,
  component: z.literal("Text"),
  value: displayValueSchema,
  emphasis: z.enum(["normal", "muted", "heading"]),
});

const tableNodeSchema = z.strictObject({
  id: keySchema,
  component: z.literal("Table"),
  columns: z
    .array(tableColumnSchema)
    .min(1)
    .max(UI_SURFACE_LIMITS.MAX_TABLE_COLUMNS),
  rowsPath: displayPathSchema,
});

const taskProposalFormNodeSchema = z.strictObject({
  id: keySchema,
  component: z.literal("TaskProposalForm"),
});

const taskListNodeSchema = z.strictObject({
  id: keySchema,
  component: z.literal("TaskList"),
});

const taskProposalActionsNodeSchema = z.strictObject({
  id: keySchema,
  component: z.literal("TaskProposalActions"),
});

export const uiNodeSchema = z.discriminatedUnion("component", [
  columnNodeSchema,
  rowNodeSchema,
  cardNodeSchema,
  textNodeSchema,
  tableNodeSchema,
  taskProposalFormNodeSchema,
  taskListNodeSchema,
  taskProposalActionsNodeSchema,
]);

const displayRowRecordSchema = z
  .record(z.string(), displayScalarSchema)
  .superRefine((row, ctx) => {
    for (const key of Object.keys(row)) {
      if (!isValidKeyName(key)) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `Invalid row key: ${key}`,
        });
      }
    }
  });

export const displayDataValueSchema = z.union([
  displayScalarSchema,
  z.array(displayRowRecordSchema).max(UI_SURFACE_LIMITS.MAX_TABLE_ROWS),
]);

const displayDataSchema = z
  .record(z.string(), displayDataValueSchema)
  .superRefine((record, ctx) => {
    for (const key of Object.keys(record)) {
      if (!isValidKeyName(key)) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `Invalid displayData key: ${key}`,
        });
      }
    }
  });

function getChildrenIds(node: UiNode): string[] {
  if (
    node.component === "Column" ||
    node.component === "Row" ||
    node.component === "Card"
  ) {
    return node.children;
  }
  return [];
}

function validateGraphAndBindings(
  spec: SurfaceSpec,
  mode: UiSurfaceMode,
  ctx: z.RefinementCtx,
): void {
  const nodeById = new Map<string, { node: UiNode; index: number }>();

  let formCount = 0;
  let listCount = 0;
  let actionsCount = 0;

  for (let i = 0; i < spec.components.length; i++) {
    const node = spec.components[i];
    if (nodeById.has(node.id)) {
      ctx.addIssue({
        code: "custom",
        path: ["components", i, "id"],
        message: `Duplicate component ID: ${node.id}`,
      });
    } else {
      nodeById.set(node.id, { node, index: i });
    }

    if (node.component === "TaskProposalForm") formCount++;
    if (node.component === "TaskList") listCount++;
    if (node.component === "TaskProposalActions") actionsCount++;
  }

  if (mode === "readonly") {
    if (formCount > 0 || listCount > 0 || actionsCount > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["components"],
        message: "Read-only surfaces cannot include task proposal components",
      });
    }
  } else {
    const validSingleForm =
      formCount === 1 && listCount === 0 && actionsCount === 0;
    const validSplitProposal =
      formCount === 0 && listCount === 1 && actionsCount === 1;
    if (!validSingleForm && !validSplitProposal) {
      ctx.addIssue({
        code: "custom",
        path: ["components"],
        message:
          "Proposal surface must contain either exactly one TaskProposalForm or one TaskList and one TaskProposalActions",
      });
    }
  }

  if (!nodeById.has("root")) {
    ctx.addIssue({
      code: "custom",
      path: ["components"],
      message: "Surface must contain a root component with id 'root'",
    });
    return;
  }

  // Validate child existence and single-parent tree constraint before traversal
  const parentByChild = new Map<string, string>();
  for (let i = 0; i < spec.components.length; i++) {
    const node = spec.components[i];
    const children = getChildrenIds(node);
    const seenInParent = new Set<string>();

    for (let cIdx = 0; cIdx < children.length; cIdx++) {
      const childId = children[cIdx];
      if (!nodeById.has(childId)) {
        ctx.addIssue({
          code: "custom",
          path: ["components", i, "children", cIdx],
          message: `Referenced child '${childId}' does not exist`,
        });
        continue;
      }
      if (childId === "root") {
        ctx.addIssue({
          code: "custom",
          path: ["components", i, "children", cIdx],
          message: "Root component cannot be referenced as a child",
        });
        continue;
      }
      if (seenInParent.has(childId) || parentByChild.has(childId)) {
        ctx.addIssue({
          code: "custom",
          path: ["components", i, "children", cIdx],
          message: `Component '${childId}' has multiple parents`,
        });
        continue;
      }
      seenInParent.add(childId);
      parentByChild.set(childId, node.id);
    }
  }

  // Iterative DFS from root to verify acyclic tree, max depth, and full reachability
  const visited = new Set<string>();
  const activeAncestors = new Set<string>();
  const stack: Array<{ id: string; depth: number; entering: boolean }> = [
    { id: "root", depth: 1, entering: true },
  ];

  while (stack.length > 0) {
    const frame = stack.pop()!;
    if (!frame.entering) {
      activeAncestors.delete(frame.id);
      continue;
    }

    if (activeAncestors.has(frame.id)) {
      const entry = nodeById.get(frame.id);
      ctx.addIssue({
        code: "custom",
        path: ["components", entry?.index ?? 0],
        message: `Cycle detected involving component '${frame.id}'`,
      });
      continue;
    }

    if (visited.has(frame.id)) {
      continue;
    }

    visited.add(frame.id);
    const entry = nodeById.get(frame.id);
    if (!entry) continue;

    if (frame.depth > UI_SURFACE_LIMITS.MAX_DEPTH) {
      ctx.addIssue({
        code: "custom",
        path: ["components", entry.index],
        message: `Component tree exceeds maximum depth of ${UI_SURFACE_LIMITS.MAX_DEPTH}`,
      });
      continue;
    }

    const children = getChildrenIds(entry.node);
    if (children.length > 0) {
      activeAncestors.add(frame.id);
      stack.push({ id: frame.id, depth: frame.depth, entering: false });
      for (let i = children.length - 1; i >= 0; i--) {
        const childId = children[i];
        if (nodeById.has(childId)) {
          stack.push({
            id: childId,
            depth: frame.depth + 1,
            entering: true,
          });
        }
      }
    }
  }

  if (visited.size !== nodeById.size) {
    for (const [id, entry] of nodeById.entries()) {
      if (!visited.has(id)) {
        ctx.addIssue({
          code: "custom",
          path: ["components", entry.index, "id"],
          message: `Component '${id}' is unreachable from root`,
        });
      }
    }
  }

  // Validate data bindings for Text and Table nodes
  for (let i = 0; i < spec.components.length; i++) {
    const node = spec.components[i];
    if (node.component === "Text" && "path" in node.value) {
      const key = extractDisplayKey(node.value.path);
      if (
        !key ||
        !Object.prototype.hasOwnProperty.call(spec.displayData, key)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["components", i, "value", "path"],
          message: `Display path '${node.value.path}' does not exist in displayData`,
        });
      } else if (Array.isArray(spec.displayData[key])) {
        ctx.addIssue({
          code: "custom",
          path: ["components", i, "value", "path"],
          message: `Text component '${node.id}' must bind to a scalar display value, not an array`,
        });
      }
    } else if (node.component === "Table") {
      const colKeys = new Set<string>();
      for (let cIdx = 0; cIdx < node.columns.length; cIdx++) {
        const colKey = node.columns[cIdx].key;
        if (colKeys.has(colKey)) {
          ctx.addIssue({
            code: "custom",
            path: ["components", i, "columns", cIdx, "key"],
            message: `Duplicate table column key '${colKey}'`,
          });
        }
        colKeys.add(colKey);
      }

      const key = extractDisplayKey(node.rowsPath);
      if (
        !key ||
        !Object.prototype.hasOwnProperty.call(spec.displayData, key)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["components", i, "rowsPath"],
          message: `Table rowsPath '${node.rowsPath}' does not exist in displayData`,
        });
        continue;
      }

      const rows = spec.displayData[key];
      if (!Array.isArray(rows)) {
        ctx.addIssue({
          code: "custom",
          path: ["components", i, "rowsPath"],
          message: `Table rowsPath '${node.rowsPath}' must bind to an array of row objects`,
        });
        continue;
      }

      for (let rIdx = 0; rIdx < rows.length; rIdx++) {
        const row = rows[rIdx];
        const rowKeys = Object.keys(row);
        const missingKey = [...colKeys].find(
          (colKey) => !Object.prototype.hasOwnProperty.call(row, colKey),
        );
        const extraKey = rowKeys.find((rowKey) => !colKeys.has(rowKey));
        if (missingKey || extraKey || rowKeys.length !== colKeys.size) {
          ctx.addIssue({
            code: "custom",
            path: ["displayData", key, rIdx],
            message: `Table row ${rIdx} keys must match declared table columns`,
          });
        }
      }
    }
  }
}

export const surfaceSpecBaseSchema = z.strictObject({
  fallbackText: z
    .string()
    .min(1)
    .max(UI_SURFACE_LIMITS.MAX_FALLBACK_TEXT_LENGTH)
    .refine(
      (value) => value.trim().length > 0,
      "Fallback text must not be blank",
    ),
  components: z
    .array(uiNodeSchema)
    .min(1)
    .max(UI_SURFACE_LIMITS.MAX_COMPONENTS),
  displayData: displayDataSchema,
});

export function createSurfaceSpecSchema(
  mode: UiSurfaceMode,
): z.ZodType<SurfaceSpec> {
  return surfaceSpecBaseSchema.superRefine((spec, ctx) => {
    validateGraphAndBindings(spec, mode, ctx);
  });
}

export function parseSurfaceSpec(
  input: unknown,
  mode: UiSurfaceMode,
): SurfaceSpec {
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
  return createSurfaceSpecSchema(mode).parse(input);
}

export const storedUiSurfaceSchema: z.ZodType<StoredUiSurface> = z.strictObject(
  {
    catalogId: z.literal(UI_COMPOSITION_CATALOG_ID),
    surfaceId: z.uuid(),
    spec: surfaceSpecBaseSchema,
  },
);

const proposalBindingSchema = z.strictObject({ path: z.literal("/proposal") });
const requestIdBindingSchema = z.strictObject({
  path: z.literal("/requestId"),
});
const compiledActionSchema = (name: "save" | "confirm" | "cancel") =>
  z.strictObject({
    event: z.strictObject({
      name: z.literal(name),
      context: z.strictObject({
        proposal: proposalBindingSchema,
        requestId: requestIdBindingSchema,
      }),
    }),
  });

const compiledComponentSchema = z.discriminatedUnion("component", [
  columnNodeSchema,
  rowNodeSchema,
  cardNodeSchema,
  z.strictObject({
    id: keySchema,
    component: z.literal("Text"),
    value: z.union([
      displayScalarSchema,
      z.strictObject({ path: displayPathSchema }),
    ]),
    emphasis: z.enum(["normal", "muted", "heading"]),
  }),
  z.strictObject({
    id: keySchema,
    component: z.literal("Table"),
    columns: z
      .array(tableColumnSchema)
      .min(1)
      .max(UI_SURFACE_LIMITS.MAX_TABLE_COLUMNS),
    rows: z.strictObject({ path: displayPathSchema }),
  }),
  z.strictObject({
    id: keySchema,
    component: z.literal("TaskProposalForm"),
    proposal: proposalBindingSchema,
    saveAction: compiledActionSchema("save"),
    confirmAction: compiledActionSchema("confirm"),
    cancelAction: compiledActionSchema("cancel"),
  }),
  z.strictObject({
    id: keySchema,
    component: z.literal("TaskList"),
    proposal: proposalBindingSchema,
  }),
  z.strictObject({
    id: keySchema,
    component: z.literal("TaskProposalActions"),
    proposal: proposalBindingSchema,
    saveAction: compiledActionSchema("save"),
    confirmAction: compiledActionSchema("confirm"),
    cancelAction: compiledActionSchema("cancel"),
  }),
]);

const compiledDataModelValueSchema = z.strictObject({
  display: displayDataSchema,
  proposal: proposalViewSchema.optional(),
});

const compiledMessageSchema = z.union([
  z.strictObject({
    version: z.literal("v0.9"),
    createSurface: z.strictObject({
      surfaceId: z.uuid(),
      catalogId: z.literal(UI_COMPOSITION_CATALOG_ID),
    }),
  }),
  z.strictObject({
    version: z.literal("v0.9"),
    updateComponents: z.strictObject({
      surfaceId: z.uuid(),
      components: z
        .array(compiledComponentSchema)
        .min(1)
        .max(UI_SURFACE_LIMITS.MAX_COMPONENTS),
    }),
  }),
  z.strictObject({
    version: z.literal("v0.9"),
    updateDataModel: z.strictObject({
      surfaceId: z.uuid(),
      path: z.literal("/"),
      value: compiledDataModelValueSchema,
    }),
  }),
]);

export const uiSurfaceEnvelopeSchema: z.ZodType<UiSurfaceEnvelope> = z
  .strictObject({
    text: z
      .string()
      .min(1)
      .max(UI_SURFACE_LIMITS.MAX_FALLBACK_TEXT_LENGTH)
      .refine((v) => v.trim().length > 0, "Text must not be blank"),
    a2ui: z.strictObject({
      protocolVersion: z.literal("v0.9"),
      catalogId: z.literal(UI_COMPOSITION_CATALOG_ID),
      surfaceId: z.uuid(),
      messages: z
        .array(compiledMessageSchema)
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

export function parseUiSurfaceEnvelope(input: unknown): UiSurfaceEnvelope {
  return uiSurfaceEnvelopeSchema.parse(input);
}
