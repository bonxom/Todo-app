import type { ProposalView } from "./ITaskProposal.js";

export const UI_COMPOSITION_CATALOG_ID =
  "urn:orbit:a2ui:composition:v1" as const;

export type UiSurfaceMode = "readonly" | "proposal";

export type DisplayScalar = string | number | boolean | null;

export type Spacing = "none" | "sm" | "md" | "lg";

export type DisplayValue = { literal: DisplayScalar } | { path: string };

export type TableColumnSpec = {
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
    }
  | {
      id: string;
      component: "Text";
      value: DisplayValue;
      emphasis: "normal" | "muted" | "heading";
    }
  | {
      id: string;
      component: "Table";
      columns: TableColumnSpec[];
      rowsPath: string;
    }
  | {
      id: string;
      component: "TaskProposalForm" | "TaskList" | "TaskProposalActions";
    };

export type DisplayDataValue =
  | DisplayScalar
  | Record<string, DisplayScalar>[];

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
