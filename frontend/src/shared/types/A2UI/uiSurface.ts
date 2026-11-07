export const UI_COMPOSITION_CATALOG_ID =
  "urn:orbit:a2ui:composition:v1" as const;

export type UiSurfaceMode = "readonly" | "proposal";

export type DisplayScalar = string | number | boolean | null;

export type Spacing = "none" | "sm" | "md" | "lg";

export type UiTone = "default" | "accent" | "success" | "warning" | "danger";

export type CardTone = "default" | "accent" | "muted";

export type ChartType = "bar" | "line" | "doughnut";

export interface TableColumnSpec {
  key: string;
  label: string;
}

export interface ChartSeriesSpec {
  key: string;
  label: string;
}

export interface UiSurfaceEnvelope {
  text: string;
  a2ui: {
    protocolVersion: "v0.9";
    catalogId: string;
    surfaceId: string;
    messages: Record<string, unknown>[];
  };
}
