export type SettingsVersion = "v1" | "v2";

export type SettingsSectionId =
  "profile" | "appearance" | "notifications" | "workspace" | "agent";

export const SETTINGS_SECTION_IDS: readonly SettingsSectionId[] = [
  "profile",
  "appearance",
  "notifications",
  "workspace",
  "agent",
] as const;

export function isSettingsSectionId(
  value: unknown,
): value is SettingsSectionId {
  return (
    typeof value === "string" &&
    (SETTINGS_SECTION_IDS as readonly string[]).includes(value)
  );
}
