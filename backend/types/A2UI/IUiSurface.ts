import type { ProposalView } from "./ITaskProposal.js";

export const UI_COMPOSITION_CATALOG_ID =
  "urn:orbit:a2ui:composition:v1" as const;

export type UiSurfaceMode = "readonly" | "proposal";

export type DisplayScalar = string | number | boolean | null;

export type Spacing = "none" | "sm" | "md" | "lg";

export type DisplayValue = { literal: DisplayScalar } | { path: string };

export type DiagramValue = { literal: string } | { path: string };

export type UiTone = "default" | "accent" | "success" | "warning" | "danger";

export type CardTone = "default" | "accent" | "muted";

export type ChartType = "bar" | "line" | "doughnut";

export type TableColumnSpec = {
  key: string;
  label: string;
};

export type ChartSeriesSpec = {
  key: string;
  label: string;
};

export type UiNode =
  | {
      id: string;
      component: "Column" | "Row";
      children: string[];
      gap: Spacing;
    }
  | {
      id: string;
      component: "Card";
      children: string[];
      title?: string;
      subtitle?: string;
      tone?: CardTone;
    }
  | {
      id: string;
      component: "Text";
      value: DisplayValue;
      emphasis: "normal" | "muted" | "heading";
    }
  | {
      id: string;
      component: "Stat";
      label: string;
      value: DisplayValue;
      caption?: string;
      progress?: number;
      tone?: UiTone;
    }
  | {
      id: string;
      component: "Table";
      columns: TableColumnSpec[];
      rowsPath: string;
    }
  | {
      id: string;
      component: "Chart";
      chartType: ChartType;
      title?: string;
      rowsPath: string;
      labelKey: string;
      series: ChartSeriesSpec[];
    }
  | {
      id: string;
      component: "Diagram";
      title?: string;
      value: DiagramValue;
    }
  | {
      id: string;
      component: "TaskProposalForm" | "TaskList" | "TaskProposalActions";
    };

export type DisplayDataValue = DisplayScalar | Record<string, DisplayScalar>[];

export type SurfaceSpec = {
  fallbackText: string;
  components: UiNode[];
  displayData: Record<string, DisplayDataValue>;
};

export type StoredUiSurface = {
  catalogId: typeof UI_COMPOSITION_CATALOG_ID;
  surfaceId: string;
  spec: SurfaceSpec;
};

export type UiSurfaceEnvelope = {
  text: string;
  a2ui: {
    protocolVersion: "v0.9";
    catalogId: string;
    surfaceId: string;
    messages: Record<string, unknown>[];
  };
};

export type CompileSurfaceInput = {
  stored: StoredUiSurface;
  proposal?: ProposalView;
};
