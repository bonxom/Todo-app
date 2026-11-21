import type { SettingsVersion } from "../types";

export function settingsSurfaceClass(version: SettingsVersion): string {
  return version === "v2"
    ? "v2-glass-panel p-5 sm:p-6"
    : "ui-section-card p-5 sm:p-6";
}

export function settingsTextClass(
  version: SettingsVersion,
  tone: "primary" | "muted" = "primary",
): string {
  if (version === "v2") {
    return tone === "primary"
      ? "text-[var(--v2-ink)]"
      : "text-[var(--v2-muted)]";
  }
  return tone === "primary"
    ? "text-[var(--color-text)]"
    : "text-[var(--color-text-muted)]";
}

export function settingsBorderClass(version: SettingsVersion): string {
  return version === "v2"
    ? "border-[var(--v2-border)]"
    : "border-[var(--color-line)]";
}

export function settingsInputClass(version: SettingsVersion): string {
  return version === "v2" ? "v2-input" : "ui-input";
}

export function settingsPrimaryButtonClass(version: SettingsVersion): string {
  return version === "v2"
    ? "v2-btn v2-btn-primary [&:hover]:filter-[brightness(1.06)]"
    : "ui-btn-primary ui-focus-ring";
}

export function settingsSecondaryButtonClass(version: SettingsVersion): string {
  return version === "v2" ? "v2-btn" : "ui-btn-secondary ui-focus-ring";
}
