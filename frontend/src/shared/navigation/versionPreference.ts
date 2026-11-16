import {
  DEFAULT_UI_VERSION,
  UI_VERSION_STORAGE_KEY,
  type UiVersion,
} from "./uiVersions";

export function readPreferredVersion(): UiVersion {
  try {
    const raw = localStorage.getItem(UI_VERSION_STORAGE_KEY);
    if (raw === "v1" || raw === "v2") {
      return raw;
    }
    return DEFAULT_UI_VERSION;
  } catch {
    return DEFAULT_UI_VERSION;
  }
}

export function savePreferredVersion(version: UiVersion): void {
  try {
    localStorage.setItem(UI_VERSION_STORAGE_KEY, version);
  } catch {
    // Gracefully handle storage failures (e.g., quota or disabled storage)
  }
}
