import {
  getDashboardPath,
  isSupportedProtectedPath,
  normalizePathname,
} from "./uiVersions";
import { readPreferredVersion } from "./versionPreference";

export function resolveEntryTarget(returnTo?: unknown): string {
  const fallback = () => getDashboardPath(readPreferredVersion());

  if (typeof returnTo !== "string") {
    return fallback();
  }

  const trimmed = returnTo.trim();
  if (
    !trimmed ||
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\")
  ) {
    return fallback();
  }

  if (trimmed.includes("\\") || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return fallback();
  }

  try {
    const url = new URL(trimmed, "http://localhost");
    const normalized = normalizePathname(url.pathname);

    if (!isSupportedProtectedPath(normalized)) {
      return fallback();
    }

    if (normalized === "/v2") {
      return `/v2/dashboard${url.search}${url.hash}`;
    }

    return `${normalized}${url.search}${url.hash}`;
  } catch {
    return fallback();
  }
}
