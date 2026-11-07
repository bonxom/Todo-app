import i18n, { getLocale } from "@/shared/i18n";
import { useTranslation } from "react-i18next";
import { Fragment } from "react";
import { z } from "zod";
import { CommonSchemas } from "@a2ui/web_core/v0_9";
import {
  createBinderlessComponentImplementation,
  useSignalValue,
} from "@a2ui/react/v0_9";
import MermaidDiagram from "@/features/tasks/components/chat/MermaidDiagram";
import type { DisplayScalar } from "@/shared/types/A2UI/uiSurface";
import {
  UI_COMPOSITION_LIMITS,
  cardToneSchema,
  chartSeriesSchema,
  chartTypeSchema,
  displayPathSchema,
  displayScalarSchema,
  emphasisSchema,
  keySchema,
  spacingSchema,
  tableColumnSchema,
  uiToneSchema,
} from "./compositionSchema";
import "./composition.css";

const CHART_PALETTE = [
  "var(--color-accent, #456b8c)",
  "var(--color-success, #2f7d5a)",
  "var(--color-warning, #a46a2a)",
  "var(--color-danger, #b25547)",
] as const;

export function formatDisplayScalar(value: DisplayScalar | undefined): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean")
    return value ? i18n.t("agent:yes") : i18n.t("agent:no");
  return typeof value === "number"
    ? value.toLocaleString(getLocale())
    : String(value);
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
      title: z.string().trim().min(1).max(200).optional(),
      subtitle: z.string().trim().min(1).max(300).optional(),
      tone: cardToneSchema.optional(),
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

const statApi = {
  name: "Stat",
  schema: z
    .object({
      label: z.string().trim().min(1).max(120),
      value: z.union([
        displayScalarSchema,
        z.object({ path: displayPathSchema }).strict(),
      ]),
      caption: z.string().trim().min(1).max(200).optional(),
      progress: z.number().finite().min(0).max(100).optional(),
      tone: uiToneSchema.optional(),
    })
    .strict(),
};

const tableApi = {
  name: "Table",
  schema: z
    .object({
      columns: z
        .array(tableColumnSchema)
        .min(1)
        .max(UI_COMPOSITION_LIMITS.MAX_TABLE_COLUMNS),
      rows: z.object({ path: displayPathSchema }).strict(),
    })
    .strict(),
};

const chartApi = {
  name: "Chart",
  schema: z
    .object({
      chartType: chartTypeSchema,
      title: z.string().trim().min(1).max(200).optional(),
      rows: z.object({ path: displayPathSchema }).strict(),
      labelKey: keySchema,
      series: z
        .array(chartSeriesSchema)
        .min(1)
        .max(UI_COMPOSITION_LIMITS.MAX_CHART_SERIES),
    })
    .strict(),
};

const diagramApi = {
  name: "Diagram",
  schema: z
    .object({
      title: z.string().trim().min(1).max(200).optional(),
      value: z.union([
        z
          .string()
          .min(1)
          .max(UI_COMPOSITION_LIMITS.MAX_DIAGRAM_LENGTH)
          .refine((v) => v.trim().length > 0),
        z.object({ path: displayPathSchema }).strict(),
      ]),
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
    const tone = props.tone ?? "default";
    return (
      <section className={`a2ui-card a2ui-card--${tone}`}>
        {(props.title || props.subtitle) && (
          <header className="a2ui-card-header">
            {props.title && <h3 className="a2ui-card-title">{props.title}</h3>}
            {props.subtitle && (
              <p className="a2ui-card-subtitle">{props.subtitle}</p>
            )}
          </header>
        )}
        <div className="a2ui-card-body">
          {props.children.map((childId) => (
            <Fragment key={childId}>{buildChild(childId)}</Fragment>
          ))}
        </div>
      </section>
    );
  },
);

export const textComponent = createBinderlessComponentImplementation(
  textApi,
  ({ context }) => {
    useTranslation("agent");
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

export const statComponent = createBinderlessComponentImplementation(
  statApi,
  ({ context }) => {
    useTranslation("agent");
    const props = statApi.schema.parse(context.componentModel.properties);
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
    const tone = props.tone ?? "default";
    const progress =
      props.progress !== undefined
        ? Math.min(100, Math.max(0, Math.round(props.progress)))
        : undefined;

    return (
      <div className={`a2ui-stat a2ui-stat--${tone}`}>
        <div className="a2ui-stat-header">
          <span className="a2ui-stat-dot" aria-hidden="true" />
          <span className="a2ui-stat-label">{props.label}</span>
        </div>
        <strong className="a2ui-stat-value">
          {formatDisplayScalar(resolvedValue)}
        </strong>
        {progress !== undefined && (
          <div
            className="a2ui-stat-progress"
            role="progressbar"
            aria-label={props.label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="a2ui-stat-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {props.caption && (
          <small className="a2ui-stat-caption">{props.caption}</small>
        )}
      </div>
    );
  },
);

export const tableComponent = createBinderlessComponentImplementation(
  tableApi,
  ({ context }) => {
    useTranslation("agent");
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
                {props.columns.map((column) => {
                  const cellVal = row[column.key];
                  return (
                    <td
                      key={column.key}
                      className={
                        typeof cellVal === "number"
                          ? "a2ui-table-num"
                          : undefined
                      }
                    >
                      {formatDisplayScalar(cellVal)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  },
);

export const chartComponent = createBinderlessComponentImplementation(
  chartApi,
  ({ context }) => {
    useTranslation("agent");
    const props = chartApi.schema.parse(context.componentModel.properties);
    const signal = context.dataContext.dataModel.getSignal<
      Record<string, DisplayScalar>[]
    >(props.rows.path);
    const rows = useSignalValue(signal);
    if (!Array.isArray(rows)) {
      throw new Error("Invalid chart rows binding");
    }

    const ariaTitle = props.title ?? i18n.t(`agent:${props.chartType}Chart`);

    if (rows.length === 0) {
      return (
        <div className="a2ui-chart">
          {props.title && <h4 className="a2ui-chart-title">{props.title}</h4>}
          <p className="a2ui-chart-empty">
            {i18n.t("agent:noChartDataAvailable")}
          </p>
        </div>
      );
    }

    if (props.chartType === "doughnut") {
      const seriesKey = props.series[0].key;
      const items = rows.map((row, idx) => {
        const value = Math.max(0, Number(row[seriesKey] ?? 0));
        return {
          label: formatDisplayScalar(row[props.labelKey]),
          value,
          color: CHART_PALETTE[idx % CHART_PALETTE.length],
        };
      });
      const total = items.reduce((sum, item) => sum + item.value, 0);
      let offset = 0;
      const segments = items.map((item) => {
        const start = offset;
        offset += total > 0 ? (item.value / total) * 100 : 0;
        return `${item.color} ${start}% ${offset}%`;
      });

      return (
        <div className="a2ui-chart" role="region" aria-label={ariaTitle}>
          {props.title && <h4 className="a2ui-chart-title">{props.title}</h4>}
          <div className="a2ui-donut-layout">
            <div
              className="a2ui-donut-ring"
              style={{
                background:
                  total > 0
                    ? `conic-gradient(${segments.join(",")})`
                    : "var(--color-surface-muted)",
              }}
              aria-hidden="true"
            >
              <div className="a2ui-donut-center">
                <strong>
                  {Number(total.toFixed(1)).toLocaleString(getLocale())}
                </strong>
                <span>{props.series[0].label}</span>
              </div>
            </div>
            <div className="a2ui-chart-legendList">
              {items.map((item, idx) => {
                const pct =
                  total > 0 ? Math.round((item.value / total) * 100) : 0;
                return (
                  <div className="a2ui-chart-legendRow" key={idx}>
                    <i style={{ background: item.color }} aria-hidden="true" />
                    <span className="a2ui-chart-legendLabel">{item.label}</span>
                    <strong>{item.value.toLocaleString(getLocale())}</strong>
                    <small>{pct}%</small>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    const allValues = rows.flatMap((row) =>
      props.series.map((s) => Number(row[s.key] ?? 0)),
    );
    const maxVal = Math.max(1, ...allValues);

    if (props.chartType === "line") {
      const width = 480;
      const height = 168;
      const padLeft = 34;
      const padRight = 18;
      const padTop = 16;
      const padBottom = 30;
      const plotW = width - padLeft - padRight;
      const plotH = height - padTop - padBottom;

      const xForIndex = (idx: number) =>
        rows.length === 1
          ? padLeft + plotW / 2
          : padLeft + (idx / (rows.length - 1)) * plotW;
      const yForValue = (val: number) =>
        padTop + plotH - (Math.max(0, val) / maxVal) * plotH;

      return (
        <div className="a2ui-chart">
          <div className="a2ui-chart-header">
            {props.title && <h4 className="a2ui-chart-title">{props.title}</h4>}
            <div className="a2ui-chart-pills">
              {props.series.map((s, sIdx) => (
                <span key={s.key} className="a2ui-chart-pill">
                  <i
                    style={{
                      background: CHART_PALETTE[sIdx % CHART_PALETTE.length],
                    }}
                    aria-hidden="true"
                  />
                  {s.label}
                </span>
              ))}
            </div>
          </div>
          <svg
            className="a2ui-chart-svg"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={ariaTitle}
          >
            {[0, 0.5, 1].map((ratio) => {
              const y = padTop + plotH * (1 - ratio);
              const tickVal = Number((maxVal * ratio).toFixed(1));
              return (
                <g key={ratio}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    className="a2ui-chart-grid"
                  />
                  <text
                    x={padLeft - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="a2ui-chart-axisText"
                  >
                    {tickVal}
                  </text>
                </g>
              );
            })}
            {props.series.map((s, sIdx) => {
              const color = CHART_PALETTE[sIdx % CHART_PALETTE.length];
              const points = rows.map((row, rIdx) => ({
                x: xForIndex(rIdx),
                y: yForValue(Number(row[s.key] ?? 0)),
              }));
              const polylinePoints = points
                .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
                .join(" ");
              return (
                <g key={s.key}>
                  <polyline
                    fill="none"
                    stroke={color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylinePoints}
                  />
                  {points.map((p, pIdx) => (
                    <circle
                      key={pIdx}
                      cx={p.x}
                      cy={p.y}
                      r="3.5"
                      fill={color}
                      stroke="var(--color-surface, #fff)"
                      strokeWidth="1.5"
                    />
                  ))}
                </g>
              );
            })}
            {rows.map((row, rIdx) => (
              <text
                key={rIdx}
                x={xForIndex(rIdx)}
                y={height - 8}
                textAnchor="middle"
                className="a2ui-chart-axisText"
              >
                {formatDisplayScalar(row[props.labelKey]).slice(0, 14)}
              </text>
            ))}
          </svg>
        </div>
      );
    }

    // Default: "bar" chart
    return (
      <div className="a2ui-chart" role="img" aria-label={ariaTitle}>
        <div className="a2ui-chart-header">
          {props.title && <h4 className="a2ui-chart-title">{props.title}</h4>}
          <div className="a2ui-chart-pills">
            {props.series.map((s, sIdx) => (
              <span key={s.key} className="a2ui-chart-pill">
                <i
                  style={{
                    background: CHART_PALETTE[sIdx % CHART_PALETTE.length],
                  }}
                  aria-hidden="true"
                />
                {s.label}
              </span>
            ))}
          </div>
        </div>
        <div className="a2ui-bar-list">
          {rows.map((row, rIdx) => (
            <div key={rIdx} className="a2ui-bar-group">
              <div className="a2ui-bar-label">
                {formatDisplayScalar(row[props.labelKey])}
              </div>
              <div className="a2ui-bar-tracks">
                {props.series.map((s, sIdx) => {
                  const val = Number(row[s.key] ?? 0);
                  const pct = Math.min(
                    100,
                    Math.max(0, (Math.max(0, val) / maxVal) * 100),
                  );
                  const color = CHART_PALETTE[sIdx % CHART_PALETTE.length];
                  return (
                    <div key={s.key} className="a2ui-bar-row">
                      <div className="a2ui-bar-track">
                        <div
                          className="a2ui-bar-fill"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                      <span className="a2ui-bar-val">
                        {val.toLocaleString(getLocale())}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  },
);

export const diagramComponent = createBinderlessComponentImplementation(
  diagramApi,
  ({ context }) => {
    useTranslation("agent");
    const props = diagramApi.schema.parse(context.componentModel.properties);
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
      bindingPath !== null ? boundValue : (props.value as string);
    const code = typeof resolvedValue === "string" ? resolvedValue : "";

    return (
      <div className="a2ui-diagram">
        {props.title && <h4 className="a2ui-diagram-title">{props.title}</h4>}
        <MermaidDiagram code={code} />
      </div>
    );
  },
);

export const presentationComponents = [
  columnComponent,
  rowComponent,
  cardComponent,
  textComponent,
  statComponent,
  tableComponent,
  chartComponent,
  diagramComponent,
] as const;
