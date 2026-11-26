export const UI_SKILL_IDS = ["ui-composition"] as const;

export const isUiCompositionEnabled = (): boolean =>
  (process.env.A2UI_COMPOSITION_ENABLED ?? "true") === "true";

export const isUiInteractiveEnabled = (): boolean =>
  process.env.A2UI_INTERACTIVE_ENABLED === "true";
