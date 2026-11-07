import { Fragment } from "react";
import { z } from "zod";
import { CommonSchemas } from "@a2ui/web_core/v0_9";
import {
  createBinderlessComponentImplementation,
  useSignalValue,
} from "@a2ui/react/v0_9";
import type { DisplayScalar } from "@/shared/types/A2UI/uiSurface";
import {
  displayPathSchema,
  displayScalarSchema,
  emphasisSchema,
  spacingSchema,
  tableColumnSchema,
} from "./compositionSchema";
import "./composition.css";

export function formatDisplayScalar(value: DisplayScalar | undefined): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

const columnApi = {
  name: "Column",
  schema: z
    .object({
      children: z.array(CommonSchemas.ComponentId),
      gap: spacingSchema,
    })
    .strict(),
};

const rowApi = {
  name: "Row",
  schema: z
    .object({
      children: z.array(CommonSchemas.ComponentId),
      gap: spacingSchema,
    })
    .strict(),
};

const cardApi = {
  name: "Card",
  schema: z
    .object({
      children: z.array(CommonSchemas.ComponentId),
    })
    .strict(),
};

const textApi = {
  name: "Text",
  schema: z
    .object({
      value: z.union([
        displayScalarSchema,
        z.object({ path: displayPathSchema }).strict(),
      ]),
      emphasis: emphasisSchema,
    })
    .strict(),
};

const tableApi = {
  name: "Table",
  schema: z
    .object({
      columns: z.array(tableColumnSchema).min(1).max(12),
      rows: z.object({ path: displayPathSchema }).strict(),
    })
    .strict(),
};

export const columnComponent = createBinderlessComponentImplementation(
  columnApi,
  ({ context, buildChild }) => {
    const props = columnApi.schema.parse(context.componentModel.properties);
    return (
      <div className={`a2ui-column a2ui-gap-${props.gap}`}>
        {props.children.map((childId) => (
          <Fragment key={childId}>{buildChild(childId)}</Fragment>
        ))}
      </div>
    );
  },
);

export const rowComponent = createBinderlessComponentImplementation(
  rowApi,
  ({ context, buildChild }) => {
    const props = rowApi.schema.parse(context.componentModel.properties);
    return (
      <div className={`a2ui-row a2ui-gap-${props.gap}`}>
        {props.children.map((childId) => (
          <Fragment key={childId}>{buildChild(childId)}</Fragment>
        ))}
      </div>
    );
  },
);

export const cardComponent = createBinderlessComponentImplementation(
  cardApi,
  ({ context, buildChild }) => {
    const props = cardApi.schema.parse(context.componentModel.properties);
    return (
      <div className="a2ui-card">
        {props.children.map((childId) => (
          <Fragment key={childId}>{buildChild(childId)}</Fragment>
        ))}
      </div>
    );
  },
);

export const textComponent = createBinderlessComponentImplementation(
  textApi,
  ({ context }) => {
    const props = textApi.schema.parse(context.componentModel.properties);
    const bindingPath =
      typeof props.value === "object" &&
      props.value !== null &&
      "path" in props.value
        ? props.value.path
        : null;
    const signal = context.dataContext.dataModel.getSignal<DisplayScalar>(
      bindingPath ?? "/display",
    );
    const boundValue = useSignalValue(signal);
    const resolvedValue =
      bindingPath !== null ? boundValue : (props.value as DisplayScalar);
    const textContent = formatDisplayScalar(resolvedValue);

    if (props.emphasis === "heading") {
      return <h3 className="a2ui-text a2ui-text-heading">{textContent}</h3>;
    }
    return (
      <p className={`a2ui-text a2ui-text-${props.emphasis}`}>{textContent}</p>
    );
  },
);

export const tableComponent = createBinderlessComponentImplementation(
  tableApi,
  ({ context }) => {
    const props = tableApi.schema.parse(context.componentModel.properties);
    const signal = context.dataContext.dataModel.getSignal<
      Record<string, DisplayScalar>[]
    >(props.rows.path);
    const rows = useSignalValue(signal);
    if (!Array.isArray(rows)) {
      throw new Error("Invalid table rows binding");
    }

    return (
      <div className="a2ui-table-wrap">
        <table className="a2ui-table">
          <thead>
            <tr>
              {props.columns.map((column) => (
                <th key={column.key} scope="col">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {props.columns.map((column) => (
                  <td key={column.key}>
                    {formatDisplayScalar(row[column.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  },
);

export const presentationComponents = [
  columnComponent,
  rowComponent,
  cardComponent,
  textComponent,
  tableComponent,
] as const;
