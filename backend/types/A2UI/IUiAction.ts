import type {
  DisplayDataValue,
  PresentationUiNode,
  UiSurfaceEnvelope,
} from "./IUiSurface.js";

export const UI_INTERACTIVE_CATALOG_ID =
  "urn:orbit:a2ui:interactive:v1" as const;

export const UI_ACTION_NAMES = ["task.complete"] as const;
export type UiActionName = (typeof UI_ACTION_NAMES)[number];

export type UiActionSpec = {
  name: UiActionName;
  taskId: string;
};

export type UiActionBinding = UiActionSpec & {
  id: string;
  key: string;
};

export type ButtonNode = {
  id: string;
  component: "Button";
  label: string;
  actionKey: string;
};

export type InteractiveUiNode = PresentationUiNode | ButtonNode;

export type InteractiveSurfaceSpec = {
  fallbackText: string;
  components: InteractiveUiNode[];
  displayData: Record<string, DisplayDataValue>;
  actions: Record<string, UiActionSpec>;
};

export type StoredInteractiveSurface = {
  catalogId: typeof UI_INTERACTIVE_CATALOG_ID;
  surfaceId: string;
  spec: InteractiveSurfaceSpec;
  actionBindings: UiActionBinding[];
};

export type UiActionStateStatus =
  "loading" | "ready" | "pending" | "uncertain" | "succeeded" | "unavailable";

export type UiActionState = {
  status: UiActionStateStatus;
  disabled: boolean;
  reason?: string;
};

export type UiActionInput = {
  requestId: string;
  actionId: string;
};

export type UiActionLocation = {
  conversationId: string;
  turnId: string;
  surfaceId: string;
};

export type UiActionResult = {
  requestId: string;
  actionId: string;
  outcome: "succeeded";
  task: import("../../validations/taskDtoValidation.js").TaskDto;
};

export type UiActionOutcome = UiActionResult & {
  turnId: string;
  surfaceId: string;
  committedAt: string;
};

export type InteractiveSurfaceEnvelope = UiSurfaceEnvelope;
