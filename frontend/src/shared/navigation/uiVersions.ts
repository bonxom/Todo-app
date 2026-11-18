export type UiVersion = "v1" | "v2";
export type UiLocation = { pathname: string; search?: string; hash?: string };
export type VersionDestination = { to: string; isFallback: boolean };
export const DEFAULT_UI_VERSION: UiVersion = "v1";
export const UI_VERSION_STORAGE_KEY = "orbit.ui-version";

export const UI_ROUTES: ReadonlyArray<{
  id: string;
  v1: string;
  v2?: string;
}> = [
  { id: "dashboard", v1: "/dashboard", v2: "/v2/dashboard" },
  { id: "calendar", v1: "/calendar" },
  { id: "categories", v1: "/categories" },
  { id: "statistics", v1: "/statistics", v2: "/v2/statistics" },
  { id: "profile", v1: "/profile" },
  { id: "notifications", v1: "/notifications", v2: "/v2/notifications" },
  { id: "agent", v1: "/agent" },
  { id: "skills", v1: "/agent/skills" },
];

export function normalizePathname(pathname: string): string {
  const trimmed = pathname.trim();
  if (!trimmed || trimmed === "/") return "/";
  return trimmed.replace(/\/+$/, "");
}

export function getUiVersion(pathname: string): UiVersion {
  const normalized = normalizePathname(pathname);
  if (normalized === "/v2" || normalized.startsWith("/v2/")) {
    return "v2";
  }
  return "v1";
}

export function getDashboardPath(version: UiVersion): string {
  return version === "v2" ? "/v2/dashboard" : "/dashboard";
}

export function isSupportedProtectedPath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);

  // Implemented V2 routes
  if (
    normalized === "/v2" ||
    normalized === "/v2/dashboard" ||
    normalized === "/v2/notifications" ||
    normalized === "/v2/statistics"
  ) {
    return true;
  }
  if (normalized.startsWith("/v2/") || normalized === "/v2") {
    return false;
  }

  // Exact V1 routes
  const exactV1 = [
    "/dashboard",
    "/calendar",
    "/categories",
    "/statistics",
    "/profile",
    "/notifications",
    "/agent",
    "/agent/skills",
    "/agent/skills/new",
  ];
  if (exactV1.includes(normalized)) {
    return true;
  }

  // Descendants: /agent/skills/:skillId (exactly one segment after /agent/skills/)
  if (normalized.startsWith("/agent/skills/")) {
    const rest = normalized.slice("/agent/skills/".length);
    if (rest && !rest.includes("/")) {
      return true;
    }
  }

  return false;
}

export function getVersionDestination(
  location: UiLocation,
  target: UiVersion,
): VersionDestination {
  const normalized = normalizePathname(location.pathname);

  if (normalized === "/notifications" && target === "v2")
    return { to: "/v2/notifications", isFallback: false };
  if (normalized === "/v2/notifications" && target === "v1")
    return { to: "/notifications", isFallback: false };

  if (normalized === "/statistics" && target === "v2")
    return { to: "/v2/statistics", isFallback: false };
  if (normalized === "/v2/statistics" && target === "v1")
    return { to: "/statistics", isFallback: false };

  if (target === "v2") {
    if (normalized === "/dashboard") {
      const searchParams = new URLSearchParams(location.search || "");
      const taskId = searchParams.get("taskId");
      if (taskId) {
        return {
          to: `/v2/dashboard?taskId=${encodeURIComponent(taskId)}`,
          isFallback: false,
        };
      }
      return {
        to: "/v2/dashboard",
        isFallback: false,
      };
    }
    return {
      to: "/v2/dashboard",
      isFallback: true,
    };
  } else {
    if (normalized === "/v2/dashboard" || normalized === "/v2") {
      const searchParams = new URLSearchParams(location.search || "");
      const taskId = searchParams.get("taskId");
      if (taskId) {
        return {
          to: `/dashboard?taskId=${encodeURIComponent(taskId)}`,
          isFallback: false,
        };
      }
      return {
        to: "/dashboard",
        isFallback: false,
      };
    }
    return {
      to: "/dashboard",
      isFallback: true,
    };
  }
}
