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
      <div
        className={`a2ui-column flex flex-col w-full min-w-[0] a2ui-gap-${props.gap}`}
      >
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
      <div
        className={`a2ui-row flex flex-row flex-wrap items-stretch w-full min-w-[0] [&_>_*]:flex-[1_1_200px] [&_>_*]:min-w-[0] a2ui-gap-${props.gap}`}
      >
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
      <section
        className={`a2ui-card flex flex-col gap-[0.75rem] w-full min-w-[0] box-border p-[1rem_1.1rem] [border:1px_solid_var(--color-line,#d9dee5)] rounded-[var(--radius-xl,12px)] [background:color-mix(_in_srgb,var(--color-surface,#ffffff)_82%,var(--color-surface-muted,#f1f3f5)_)] [box-shadow:var(--shadow-xs,0_1px_2px_rgba(16,24,40,0.06))] a2ui-card--${tone}`}
      >
        {(props.title || props.subtitle) && (
          <header className="a2ui-card-header flex flex-col gap-[0.2rem] pb-[0.55rem] [border-bottom:1px_solid_color-mix(in_srgb,var(--color-line,#d9dee5)_75%,transparent)]">
            {props.title && (
              <h3 className="a2ui-card-title m-[0] text-[0.925rem] [font-weight:650] [letter-spacing:-0.015em] [line-height:1.3] text-[var(--color-text,#1f2328)]">
                {props.title}
              </h3>
            )}
            {props.subtitle && (
              <p className="a2ui-card-subtitle m-[0] text-[0.775rem] [line-height:1.4] text-[var(--color-text-muted,#667085)]">
                {props.subtitle}
              </p>
            )}
          </header>
        )}
        <div className="a2ui-card-body flex flex-col gap-[0.65rem] w-full min-w-[0]">
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
      return (
        <h3
          className="a2ui-text m-[0] min-w-[0] wrap-anywhere whitespace-pre-wrap a2ui-text-heading text-[1.025rem]
        [font-weight:650] [letter-spacing:-0.02em] [line-height:1.35] text-[var(--color-text,inherit)]"
        >
          {textContent}
        </h3>
      );
    }
    return (
      <p
        className={`a2ui-text m-[0] min-w-[0] wrap-anywhere whitespace-pre-wrap a2ui-text-${props.emphasis}`}
      >
        {textContent}
      </p>
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
      <div
        className={`a2ui-stat [--stat-accent:var(--color-accent,#456b8c)] flex flex-col gap-[0.4rem] p-[0.875rem_1rem] [border:1px_solid_var(--color-line,#d9dee5)] rounded-[var(--radius-xl,12px)] [background:var(--color-surface,#ffffff)] [box-shadow:var(--shadow-xs,0_1px_2px_rgba(16,24,40,0.06))] min-w-[0] a2ui-stat--${tone}`}
      >
        <div className="a2ui-stat-header flex items-center gap-[0.45rem]">
          <span
            className="a2ui-stat-dot w-[7px] h-[7px] rounded-[999px] [background:var(--stat-accent)] shrink-0"
            aria-hidden="true"
          />
          <span className="a2ui-stat-label text-[0.74rem] [font-weight:600] text-[var(--color-text-muted,#667085)] [letter-spacing:0.01em]">
            {props.label}
          </span>
        </div>
        <strong className="a2ui-stat-value block text-[1.55rem] [font-weight:650] [letter-spacing:-0.035em] [line-height:1.15] text-[var(--color-text,#1f2328)] [font-variant-numeric:tabular-nums]">
          {formatDisplayScalar(resolvedValue)}
        </strong>
        {progress !== undefined && (
          <div
            className="a2ui-stat-progress w-full h-[6px] rounded-[999px] [background:var(--color-surface-muted,#f1f3f5)] overflow-hidden mt-[0.15rem]"
            role="progressbar"
            aria-label={props.label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="a2ui-stat-progress-fill h-full rounded-[999px] [background:var(--stat-accent)] [transition:width_220ms_ease]"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {props.caption && (
          <small className="a2ui-stat-caption text-[0.725rem] [line-height:1.35] text-[var(--color-text-muted,#667085)]">
            {props.caption}
          </small>
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
      <div
        className="a2ui-table-wrap w-full max-w-full min-w-[0] overflow-x-auto [border:1px_solid_var(--color-line,#d9dee5)]
        rounded-[var(--radius-lg,10px)] [background:var(--color-surface,#ffffff)]
        [box-shadow:var(--shadow-xs,0_1px_2px_rgba(16,24,40,0.06))]"
      >
        <table
          className="a2ui-table w-full [border-collapse:collapse] text-[0.825rem] text-left [&_th]:p-[0.55rem_0.75rem]
          [&_th]:[border-bottom:1px_solid_var(--color-line,#d9dee5)] [&_th]:align-middle [&_th]:wrap-anywhere
          [&_th]:text-[0.7rem] [&_th]:[font-weight:650] [&_th]:uppercase [&_th]:[letter-spacing:0.045em]
          [&_th]:text-[var(--color-text-muted,#667085)] [&_th]:whitespace-nowrap [&_td]:p-[0.55rem_0.75rem]
          [&_td]:[border-bottom:1px_solid_var(--color-line,#d9dee5)] [&_td]:align-middle [&_td]:wrap-anywhere
          [&_tbody_tr:last-child_td]:[border-bottom:none]"
        >
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
                          ? "a2ui-table-num [font-variant-numeric:tabular-nums] [font-weight:550]"
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
        <div
          className="a2ui-chart flex flex-col gap-[0.75rem] w-full min-w-[0] p-[0.9rem_1rem]
          [border:1px_solid_var(--color-line,#d9dee5)] rounded-[var(--radius-xl,12px)]
          [background:var(--color-surface,#ffffff)] [box-shadow:var(--shadow-xs,0_1px_2px_rgba(16,24,40,0.06))]"
        >
          {props.title && (
            <h4 className="a2ui-chart-title m-[0] text-[0.86rem] [font-weight:650] text-[var(--color-text,#1f2328)]">
              {props.title}
            </h4>
          )}
          <p className="a2ui-chart-empty m-[0] p-[1rem] text-center text-[0.8rem] text-[var(--color-text-muted,#667085)] [background:var(--color-surface-muted,#f1f3f5)] rounded-[var(--radius-sm,8px)]">
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
        <div
          className="a2ui-chart flex flex-col gap-[0.75rem] w-full min-w-[0] p-[0.9rem_1rem]
          [border:1px_solid_var(--color-line,#d9dee5)] rounded-[var(--radius-xl,12px)]
          [background:var(--color-surface,#ffffff)] [box-shadow:var(--shadow-xs,0_1px_2px_rgba(16,24,40,0.06))]"
          role="region"
          aria-label={ariaTitle}
        >
          {props.title && (
            <h4 className="a2ui-chart-title m-[0] text-[0.86rem] [font-weight:650] text-[var(--color-text,#1f2328)]">
              {props.title}
            </h4>
          )}
          <div className="a2ui-donut-layout grid grid-cols-[auto_1fr] items-center gap-[1.15rem] [@media(max-width:480px)]:grid-cols-[1fr] [@media(max-width:480px)]:justify-items-center">
            <div
              className="a2ui-donut-ring w-[112px] h-[112px] rounded-[50%] grid place-items-center shrink-0"
              style={{
                background:
                  total > 0
                    ? `conic-gradient(${segments.join(",")})`
                    : "var(--color-surface-muted)",
              }}
              aria-hidden="true"
            >
              <div
                className="a2ui-donut-center w-[74px] h-[74px] rounded-[50%] [background:var(--color-surface,#ffffff)] flex flex-col
                items-center justify-center text-center p-[0.25rem] [&_strong]:text-[1.05rem] [&_strong]:[font-weight:650]
                [&_strong]:[line-height:1.1] [&_strong]:[font-variant-numeric:tabular-nums]
                [&_strong]:text-[var(--color-text,#1f2328)] [&_span]:text-[0.65rem]
                [&_span]:text-[var(--color-text-muted,#667085)] [&_span]:max-w-[64px] [&_span]:overflow-hidden
                [&_span]:text-ellipsis [&_span]:whitespace-nowrap"
              >
                <strong>
                  {Number(total.toFixed(1)).toLocaleString(getLocale())}
                </strong>
                <span>{props.series[0].label}</span>
              </div>
            </div>
            <div className="a2ui-chart-legendList flex flex-col gap-[0.45rem] min-w-[0] [@media(max-width:480px)]:w-full">
              {items.map((item, idx) => {
                const pct =
                  total > 0 ? Math.round((item.value / total) * 100) : 0;
                return (
                  <div
                    className="a2ui-chart-legendRow grid grid-cols-[8px_1fr_auto_auto] items-center gap-[0.5rem] text-[0.78rem] [&_i]:w-[8px]
                    [&_i]:h-[8px] [&_i]:rounded-[999px] [&_strong]:[font-weight:600]
                    [&_strong]:[font-variant-numeric:tabular-nums] [&_strong]:text-[var(--color-text,#1f2328)]
                    [&_small]:text-[0.72rem] [&_small]:[font-variant-numeric:tabular-nums]
                    [&_small]:text-[var(--color-text-muted,#667085)] [&_small]:min-w-[2.1rem] [&_small]:text-right"
                    key={idx}
                  >
                    <i style={{ background: item.color }} aria-hidden="true" />
                    <span className="a2ui-chart-legendLabel text-[var(--color-text,#1f2328)] overflow-hidden text-ellipsis whitespace-nowrap">
                      {item.label}
                    </span>
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
        <div
          className="a2ui-chart flex flex-col gap-[0.75rem] w-full min-w-[0] p-[0.9rem_1rem]
          [border:1px_solid_var(--color-line,#d9dee5)] rounded-[var(--radius-xl,12px)]
          [background:var(--color-surface,#ffffff)] [box-shadow:var(--shadow-xs,0_1px_2px_rgba(16,24,40,0.06))]"
        >
          <div className="a2ui-chart-header flex flex-wrap items-center justify-between gap-[0.5rem]">
            {props.title && (
              <h4 className="a2ui-chart-title m-[0] text-[0.86rem] [font-weight:650] text-[var(--color-text,#1f2328)]">
                {props.title}
              </h4>
            )}
            <div className="a2ui-chart-pills flex flex-wrap items-center gap-[0.65rem]">
              {props.series.map((s, sIdx) => (
                <span
                  key={s.key}
                  className="a2ui-chart-pill inline-flex items-center gap-[0.35rem] text-[0.725rem] [font-weight:550]
                  text-[var(--color-text-muted,#667085)] [&_i]:w-[8px] [&_i]:h-[8px] [&_i]:rounded-[999px] [&_i]:inline-block"
                >
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
            className="a2ui-chart-svg w-full h-auto max-h-[180px] block overflow-visible"
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
                    className="a2ui-chart-grid stroke-[var(--color-line,#d9dee5)] [stroke-dasharray:3_3] [stroke-width:1]"
                  />
                  <text
                    x={padLeft - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="a2ui-chart-axisText fill-[var(--color-text-muted,#667085)] text-[10px] [font-family:var(--font-sans,inherit)]"
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
                className="a2ui-chart-axisText fill-[var(--color-text-muted,#667085)] text-[10px] [font-family:var(--font-sans,inherit)]"
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
      <div
        className="a2ui-chart flex flex-col gap-[0.75rem] w-full min-w-[0] p-[0.9rem_1rem]
        [border:1px_solid_var(--color-line,#d9dee5)] rounded-[var(--radius-xl,12px)]
        [background:var(--color-surface,#ffffff)] [box-shadow:var(--shadow-xs,0_1px_2px_rgba(16,24,40,0.06))]"
        role="img"
        aria-label={ariaTitle}
      >
        <div className="a2ui-chart-header flex flex-wrap items-center justify-between gap-[0.5rem]">
          {props.title && (
            <h4 className="a2ui-chart-title m-[0] text-[0.86rem] [font-weight:650] text-[var(--color-text,#1f2328)]">
              {props.title}
            </h4>
          )}
          <div className="a2ui-chart-pills flex flex-wrap items-center gap-[0.65rem]">
            {props.series.map((s, sIdx) => (
              <span
                key={s.key}
                className="a2ui-chart-pill inline-flex items-center gap-[0.35rem] text-[0.725rem] [font-weight:550]
                text-[var(--color-text-muted,#667085)] [&_i]:w-[8px] [&_i]:h-[8px] [&_i]:rounded-[999px] [&_i]:inline-block"
              >
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
        <div className="a2ui-bar-list flex flex-col gap-[0.65rem]">
          {rows.map((row, rIdx) => (
            <div
              key={rIdx}
              className="a2ui-bar-group grid grid-cols-[minmax(72px,110px)_1fr] items-center gap-[0.75rem]"
            >
              <div className="a2ui-bar-label text-[0.78rem] [font-weight:550] text-[var(--color-text,#1f2328)] overflow-hidden text-ellipsis whitespace-nowrap">
                {formatDisplayScalar(row[props.labelKey])}
              </div>
              <div className="a2ui-bar-tracks flex flex-col gap-[0.3rem]">
                {props.series.map((s, sIdx) => {
                  const val = Number(row[s.key] ?? 0);
                  const pct = Math.min(
                    100,
                    Math.max(0, (Math.max(0, val) / maxVal) * 100),
                  );
                  const color = CHART_PALETTE[sIdx % CHART_PALETTE.length];
                  return (
                    <div
                      key={s.key}
                      className="a2ui-bar-row grid grid-cols-[1fr_auto] items-center gap-[0.55rem]"
                    >
                      <div className="a2ui-bar-track h-[8px] rounded-[999px] [background:var(--color-surface-muted,#f1f3f5)] overflow-hidden">
                        <div
                          className="a2ui-bar-fill h-full rounded-[999px] min-w-[4px] [transition:width_220ms_ease]"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                      <span className="a2ui-bar-val text-[0.74rem] [font-weight:600] [font-variant-numeric:tabular-nums] text-[var(--color-text-muted,#667085)] min-w-[2rem] text-right">
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
      <div className="a2ui-diagram flex flex-col gap-[0.35rem] w-full min-w-[0] [&_.chat-diagram]:my-[0]">
        {props.title && (
          <h4 className="a2ui-diagram-title m-[0] text-[0.85rem] [font-weight:650] text-[var(--color-text,#1f2328)]">
            {props.title}
          </h4>
        )}
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
