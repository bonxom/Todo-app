export const UI_SKILL_IDS = ["ui-composition"] as const;

export const isUiCompositionEnabled = (): boolean =>
  (process.env.A2UI_COMPOSITION_ENABLED ?? "false") === "true";
