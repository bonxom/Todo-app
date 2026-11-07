import { z } from "zod";
import type { SurfacePayload } from "./catalogRegistry";
import {
  UI_COMPOSITION_CATALOG_ID,
  type DisplayScalar,
  type TableColumnSpec,
  type UiSurfaceMode,
} from "@/shared/types/A2UI/uiSurface";

export const UI_COMPOSITION_LIMITS = {
  MAX_COMPONENTS: 100,
  MAX_DEPTH: 10,
  MAX_TABLE_COLUMNS: 12,
  MAX_TABLE_ROWS: 50,
  MAX_PAYLOAD_BYTES: 128 * 1024,
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
export const emphasisSchema = z.enum(["normal", "muted", "heading"]);

export const tableColumnSchema: z.ZodType<TableColumnSpec> = z
  .object({
    key: keySchema,
    label: z.string().trim().min(1).max(200),
  })
  .strict();

const proposalBindingSchema = z
  .object({ path: z.literal("/proposal") })
  .strict();
const requestIdBindingSchema = z
  .object({ path: z.literal("/requestId") })
  .strict();

const compiledActionSchema = (name: "save" | "confirm" | "cancel") =>
  z
    .object({
      event: z
        .object({
          name: z.literal(name),
          context: z
            .object({
              proposal: proposalBindingSchema,
              requestId: requestIdBindingSchema,
            })
            .strict(),
        })
        .strict(),
    })
    .strict();

export const columnPropertiesSchema = z
  .object({
    children: z.array(keySchema).max(UI_COMPOSITION_LIMITS.MAX_COMPONENTS),
    gap: spacingSchema,
  })
  .strict();

export const rowPropertiesSchema = z
  .object({
    children: z.array(keySchema).max(UI_COMPOSITION_LIMITS.MAX_COMPONENTS),
    gap: spacingSchema,
  })
  .strict();

export const cardPropertiesSchema = z
  .object({
    children: z.array(keySchema).max(UI_COMPOSITION_LIMITS.MAX_COMPONENTS),
  })
  .strict();

export const textPropertiesSchema = z
  .object({
    value: z.union([
      displayScalarSchema,
      z.object({ path: displayPathSchema }).strict(),
    ]),
    emphasis: emphasisSchema,
  })
  .strict();

export const tablePropertiesSchema = z
  .object({
    columns: z
      .array(tableColumnSchema)
      .min(1)
      .max(UI_COMPOSITION_LIMITS.MAX_TABLE_COLUMNS),
    rows: z.object({ path: displayPathSchema }).strict(),
  })
  .strict();

export const taskProposalFormPropertiesSchema = z
  .object({
    proposal: proposalBindingSchema,
    saveAction: compiledActionSchema("save"),
    confirmAction: compiledActionSchema("confirm"),
    cancelAction: compiledActionSchema("cancel"),
  })
  .strict();

export const taskListPropertiesSchema = z
  .object({
    proposal: proposalBindingSchema,
  })
  .strict();

export const taskProposalActionsPropertiesSchema = z
  .object({
    proposal: proposalBindingSchema,
    saveAction: compiledActionSchema("save"),
    confirmAction: compiledActionSchema("confirm"),
    cancelAction: compiledActionSchema("cancel"),
  })
  .strict();

const compiledComponentSchema = z.discriminatedUnion("component", [
  columnPropertiesSchema.extend({
    id: keySchema,
    component: z.literal("Column"),
  }),
  rowPropertiesSchema.extend({
    id: keySchema,
    component: z.literal("Row"),
  }),
  cardPropertiesSchema.extend({
    id: keySchema,
    component: z.literal("Card"),
  }),
  textPropertiesSchema.extend({
    id: keySchema,
    component: z.literal("Text"),
  }),
  tablePropertiesSchema.extend({
    id: keySchema,
    component: z.literal("Table"),
  }),
  taskProposalFormPropertiesSchema.extend({
    id: keySchema,
    component: z.literal("TaskProposalForm"),
  }),
  taskListPropertiesSchema.extend({
    id: keySchema,
    component: z.literal("TaskList"),
  }),
  taskProposalActionsPropertiesSchema.extend({
    id: keySchema,
    component: z.literal("TaskProposalActions"),
  }),
]);

export type CompiledComponent = z.infer<typeof compiledComponentSchema>;

const displayRowRecordSchema = z
  .record(z.string(), displayScalarSchema)
  .superRefine((row, ctx) => {
    for (const key of Object.keys(row)) {
      if (!isValidKeyName(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `Invalid row key: ${key}`,
        });
      }
    }
  });

export const displayDataSchema = z
  .record(
    z.string(),
    z.union([
      displayScalarSchema,
      z.array(displayRowRecordSchema).max(UI_COMPOSITION_LIMITS.MAX_TABLE_ROWS),
    ]),
  )
  .superRefine((record, ctx) => {
    for (const key of Object.keys(record)) {
      if (!isValidKeyName(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `Invalid displayData key: ${key}`,
        });
      }
    }
  });

const proposalItemSchema = z
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
  .strict();

const proposalDataSchema = z
  .object({
    id: z.string().uuid(),
    conversationId: z.string().uuid(),
    turnId: z.string(),
    revision: z.number().int().positive(),
    status: z.enum(["draft", "created", "cancelled"]),
    protocolVersion: z.literal("v0.9"),
    catalogId: z.literal("urn:orbit:a2ui:task-proposals:v1"),
    items: z.array(proposalItemSchema).min(1).max(20),
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
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid proposal selection",
      });
    }
  });

export const compositionDataModelSchema = z
  .object({
    display: displayDataSchema,
    proposal: proposalDataSchema.optional(),
  })
  .strict();

function getChildrenIds(node: CompiledComponent): string[] {
  if (
    node.component === "Column" ||
    node.component === "Row" ||
    node.component === "Card"
  ) {
    return node.children;
  }
  return [];
}

export function validateCompositionPayload(
  payload: SurfacePayload,
  mode?: UiSurfaceMode,
): void {
  if (payload.protocolVersion !== "v0.9") {
    throw new Error("Unsupported protocol version");
  }
  if (payload.catalogId !== UI_COMPOSITION_CATALOG_ID) {
    throw new Error("Unsupported composition catalog");
  }
  const surfaceId = z.string().uuid().parse(payload.surfaceId);
  if (
    new TextEncoder().encode(JSON.stringify(payload)).length >
    UI_COMPOSITION_LIMITS.MAX_PAYLOAD_BYTES
  ) {
    throw new Error("Composition payload exceeds 128 KiB limit");
  }

  if (payload.messages.length !== 3) {
    throw new Error(
      "Composition surface requires exactly createSurface, updateComponents, and updateDataModel messages",
    );
  }

  const createMsg = z
    .object({
      version: z.literal("v0.9"),
      createSurface: z
        .object({
          surfaceId: z.literal(surfaceId),
          catalogId: z.literal(UI_COMPOSITION_CATALOG_ID),
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
            .array(compiledComponentSchema)
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
          value: compositionDataModelSchema,
        })
        .strict(),
    })
    .strict()
    .parse(payload.messages[2]);

  void createMsg;
  const components = componentsMsg.updateComponents.components;
  const dataModel = dataModelMsg.updateDataModel.value;
  const effectiveMode: UiSurfaceMode =
    mode ?? (dataModel.proposal ? "proposal" : "readonly");

  const nodeById = new Map<string, CompiledComponent>();
  let formCount = 0;
  let listCount = 0;
  let actionsCount = 0;

  for (const node of components) {
    if (nodeById.has(node.id)) {
      throw new Error(`Duplicate component ID '${node.id}'`);
    }
    nodeById.set(node.id, node);
    if (node.component === "TaskProposalForm") formCount++;
    if (node.component === "TaskList") listCount++;
    if (node.component === "TaskProposalActions") actionsCount++;
  }

  if (effectiveMode === "readonly") {
    if (dataModel.proposal !== undefined) {
      throw new Error("Read-only surface cannot include proposal data");
    }
    if (formCount > 0 || listCount > 0 || actionsCount > 0) {
      throw new Error("Read-only surface cannot include task components");
    }
  } else {
    if (!dataModel.proposal) {
      throw new Error("Proposal surface requires authoritative proposal data");
    }
    const validSingleForm =
      formCount === 1 && listCount === 0 && actionsCount === 0;
    const validSplitProposal =
      formCount === 0 && listCount === 1 && actionsCount === 1;
    if (!validSingleForm && !validSplitProposal) {
      throw new Error(
        "Proposal surface must contain either one TaskProposalForm or one TaskList plus one TaskProposalActions",
      );
    }
  }

  if (!nodeById.has("root")) {
    throw new Error("Missing root component");
  }

  const parentByChild = new Map<string, string>();
  for (const node of components) {
    const children = getChildrenIds(node);
    const seenInParent = new Set<string>();
    for (const childId of children) {
      if (!nodeById.has(childId)) {
        throw new Error(`Referenced child '${childId}' does not exist`);
      }
      if (childId === "root") {
        throw new Error("Root component cannot be referenced as a child");
      }
      if (seenInParent.has(childId) || parentByChild.has(childId)) {
        throw new Error(`Component '${childId}' has multiple parents`);
      }
      seenInParent.add(childId);
      parentByChild.set(childId, node.id);
    }
  }

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
      throw new Error(`Cycle detected involving component '${frame.id}'`);
    }
    if (visited.has(frame.id)) {
      continue;
    }
    visited.add(frame.id);
    if (frame.depth > UI_COMPOSITION_LIMITS.MAX_DEPTH) {
      throw new Error(
        `Component tree exceeds maximum depth of ${UI_COMPOSITION_LIMITS.MAX_DEPTH}`,
      );
    }
    const node = nodeById.get(frame.id);
    if (!node) continue;
    const children = getChildrenIds(node);
    if (children.length > 0) {
      activeAncestors.add(frame.id);
      stack.push({ id: frame.id, depth: frame.depth, entering: false });
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push({
          id: children[i],
          depth: frame.depth + 1,
          entering: true,
        });
      }
    }
  }

  if (visited.size !== nodeById.size) {
    throw new Error("Unreachable component detected");
  }

  for (const node of components) {
    if (
      node.component === "Text" &&
      typeof node.value === "object" &&
      node.value !== null &&
      "path" in node.value
    ) {
      const key = extractDisplayKey(node.value.path);
      if (
        !key ||
        !Object.prototype.hasOwnProperty.call(dataModel.display, key)
      ) {
        throw new Error(
          `Text binding '${node.value.path}' does not exist in display model`,
        );
      }
      if (Array.isArray(dataModel.display[key])) {
        throw new Error(
          `Text component '${node.id}' must bind to a scalar display value`,
        );
      }
    } else if (node.component === "Table") {
      const colKeys = new Set<string>();
      for (const col of node.columns) {
        if (colKeys.has(col.key)) {
          throw new Error(`Duplicate table column key '${col.key}'`);
        }
        colKeys.add(col.key);
      }
      const key = extractDisplayKey(node.rows.path);
      if (
        !key ||
        !Object.prototype.hasOwnProperty.call(dataModel.display, key)
      ) {
        throw new Error(
          `Table rows path '${node.rows.path}' does not exist in display model`,
        );
      }
      const rows = dataModel.display[key];
      if (!Array.isArray(rows)) {
        throw new Error(`Table rows path '${node.rows.path}' must be an array`);
      }
      for (let rIdx = 0; rIdx < rows.length; rIdx++) {
        const row = rows[rIdx];
        const rowKeys = Object.keys(row);
        const missingKey = [...colKeys].find(
          (colKey) => !Object.prototype.hasOwnProperty.call(row, colKey),
        );
        const extraKey = rowKeys.find((rowKey) => !colKeys.has(rowKey));
        if (missingKey || extraKey || rowKeys.length !== colKeys.size) {
          throw new Error(
            `Table row ${rIdx} keys must match declared table columns`,
          );
        }
      }
    }
  }
}
