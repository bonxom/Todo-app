import { describe, expect, it } from "vitest";
import {
  DEFAULT_UI_VERSION,
  UI_ROUTES,
  UI_VERSION_STORAGE_KEY,
  getDashboardPath,
  getUiVersion,
  getVersionDestination,
  isSupportedProtectedPath,
} from "../uiVersions";

describe("uiVersions", () => {
  describe("constants and basic helpers", () => {
    it("has default version v1 and expected storage key", () => {
      expect(DEFAULT_UI_VERSION).toBe("v1");
      expect(UI_VERSION_STORAGE_KEY).toBe("orbit.ui-version");
    });

    it("has registered UI routes and their available version counterparts", () => {
      const dashboardRoute = UI_ROUTES.find((r) => r.id === "dashboard");
      expect(dashboardRoute).toBeDefined();
      expect(dashboardRoute?.v1).toBe("/dashboard");
      expect(dashboardRoute?.v2).toBe("/v2/dashboard");

      const calendarRoute = UI_ROUTES.find((r) => r.id === "calendar");
      expect(calendarRoute).toBeDefined();
      expect(calendarRoute?.v1).toBe("/calendar");
      expect(calendarRoute?.v2).toBeUndefined();

      const skillsRoute = UI_ROUTES.find((r) => r.id === "skills");
      expect(skillsRoute).toBeDefined();
      expect(skillsRoute?.v1).toBe("/agent/skills");
    });

    it("getDashboardPath returns appropriate path for version", () => {
      expect(getDashboardPath("v1")).toBe("/dashboard");
      expect(getDashboardPath("v2")).toBe("/v2/dashboard");
    });

    it("getUiVersion determines version from pathname strictly", () => {
      expect(getUiVersion("/v2")).toBe("v2");
      expect(getUiVersion("/v2/")).toBe("v2");
      expect(getUiVersion("/v2/dashboard")).toBe("v2");
      expect(getUiVersion("/v2/missing")).toBe("v2");
      expect(getUiVersion("/v20")).toBe("v1");
      expect(getUiVersion("/v2ish")).toBe("v1");
      expect(getUiVersion("/dashboard")).toBe("v1");
      expect(getUiVersion("/calendar")).toBe("v1");
      expect(getUiVersion("/")).toBe("v1");
    });
  });

  describe("isSupportedProtectedPath", () => {
    it("recognizes standard v1 protected routes", () => {
      expect(isSupportedProtectedPath("/dashboard")).toBe(true);
      expect(isSupportedProtectedPath("/dashboard/")).toBe(true);
      expect(isSupportedProtectedPath("/calendar")).toBe(true);
      expect(isSupportedProtectedPath("/categories")).toBe(true);
      expect(isSupportedProtectedPath("/statistics")).toBe(true);
      expect(isSupportedProtectedPath("/profile")).toBe(true);
      expect(isSupportedProtectedPath("/notifications")).toBe(true);
      expect(isSupportedProtectedPath("/agent")).toBe(true);
      expect(isSupportedProtectedPath("/agent/skills")).toBe(true);
    });

    it("recognizes valid skills descendant paths", () => {
      expect(isSupportedProtectedPath("/agent/skills/new")).toBe(true);
      expect(isSupportedProtectedPath("/agent/skills/123456")).toBe(true);
      expect(isSupportedProtectedPath("/agent/skills/my-custom-skill_1")).toBe(
        true,
      );
      // arbitrary nested descendants are rejected
      expect(isSupportedProtectedPath("/agent/skills/123/extra")).toBe(false);
      expect(isSupportedProtectedPath("/agent/skills/")).toBe(true);
    });

    it("recognizes implemented v2 protected routes", () => {
      expect(isSupportedProtectedPath("/v2")).toBe(true);
      expect(isSupportedProtectedPath("/v2/")).toBe(true);
      expect(isSupportedProtectedPath("/v2/dashboard")).toBe(true);
      expect(isSupportedProtectedPath("/v2/dashboard/")).toBe(true);
    });

    it("rejects public routes and unsupported/unknown paths", () => {
      expect(isSupportedProtectedPath("/")).toBe(false);
      expect(isSupportedProtectedPath("/login")).toBe(false);
      expect(isSupportedProtectedPath("/register")).toBe(false);
      expect(isSupportedProtectedPath("/ui-demo")).toBe(false);
      expect(isSupportedProtectedPath("/v2/calendar")).toBe(false);
      expect(isSupportedProtectedPath("/v2/unknown")).toBe(false);
      expect(isSupportedProtectedPath("/unknown")).toBe(false);
    });
  });

  describe("getVersionDestination", () => {
    it("switches dashboard to v2 preserving only taskId", () => {
      expect(
        getVersionDestination(
          {
            pathname: "/dashboard",
            search: "?taskId=507f1f77bcf86cd799439011&page=4",
            hash: "#section",
          },
          "v2",
        ),
      ).toEqual({
        to: "/v2/dashboard?taskId=507f1f77bcf86cd799439011",
        isFallback: false,
      });
    });

    it("switches dashboard to v2 without taskId", () => {
      expect(
        getVersionDestination(
          {
            pathname: "/dashboard",
            search: "?page=4",
            hash: "#section",
          },
          "v2",
        ),
      ).toEqual({
        to: "/v2/dashboard",
        isFallback: false,
      });
    });

    it("switches v2 dashboard to v1 preserving only taskId", () => {
      expect(
        getVersionDestination(
          {
            pathname: "/v2/dashboard",
            search: "?taskId=507f1f77bcf86cd799439011&filter=urgent",
            hash: "#top",
          },
          "v1",
        ),
      ).toEqual({
        to: "/dashboard?taskId=507f1f77bcf86cd799439011",
        isFallback: false,
      });
    });

    it("falls back to v2 dashboard without unrelated source state when switching from unsupported v1 pages", () => {
      expect(
        getVersionDestination(
          {
            pathname: "/calendar",
            search: "?date=2026-11-14",
            hash: "#week",
          },
          "v2",
        ),
      ).toEqual({ to: "/v2/dashboard", isFallback: true });

      expect(
        getVersionDestination(
          {
            pathname: "/agent/skills/new",
            search: "?ref=test",
          },
          "v2",
        ),
      ).toEqual({ to: "/v2/dashboard", isFallback: true });
    });

    it("switches unknown v2 page to v1 dashboard with fallback", () => {
      expect(
        getVersionDestination(
          {
            pathname: "/v2/missing",
            search: "?q=test",
          },
          "v1",
        ),
      ).toEqual({ to: "/dashboard", isFallback: true });
    });

    it("handles trailing slashes on dashboard paths", () => {
      expect(
        getVersionDestination(
          {
            pathname: "/dashboard/",
            search: "?taskId=abc",
          },
          "v2",
        ),
      ).toEqual({
        to: "/v2/dashboard?taskId=abc",
        isFallback: false,
      });
    });

    it("handles /v2 alias to v1 dashboard", () => {
      expect(
        getVersionDestination(
          {
            pathname: "/v2",
          },
          "v1",
        ),
      ).toEqual({
        to: "/dashboard",
        isFallback: false,
      });
    });
  });
});

it("maps notification history between versions and accepts the V2 destination", () => {
  expect(getVersionDestination({ pathname: "/notifications" }, "v2")).toEqual({
    to: "/v2/notifications",
    isFallback: false,
  });
  expect(
    getVersionDestination({ pathname: "/v2/notifications" }, "v1"),
  ).toEqual({ to: "/notifications", isFallback: false });
  expect(isSupportedProtectedPath("/v2/notifications")).toBe(true);
});

it("maps statistics between versions and accepts the V2 destination", () => {
  expect(getVersionDestination({ pathname: "/statistics" }, "v2")).toEqual({
    to: "/v2/statistics",
    isFallback: false,
  });
  expect(getVersionDestination({ pathname: "/v2/statistics" }, "v1")).toEqual({
    to: "/statistics",
    isFallback: false,
  });
  expect(isSupportedProtectedPath("/v2/statistics")).toBe(true);
  expect(isSupportedProtectedPath("/v2/statistics/unknown")).toBe(false);
  expect(
    getVersionDestination(
      { pathname: "/statistics", search: "?tab=monthly", hash: "#chart" },
      "v2",
    ),
  ).toEqual({
    to: "/v2/statistics",
    isFallback: false,
  });
  expect(
    getVersionDestination(
      { pathname: "/v2/statistics", search: "?range=30d", hash: "#heatmap" },
      "v1",
    ),
  ).toEqual({
    to: "/statistics",
    isFallback: false,
  });
});

it("maps settings between versions and supports legacy /profile path", () => {
  expect(getVersionDestination({ pathname: "/settings" }, "v2")).toEqual({
    to: "/v2/settings",
    isFallback: false,
  });
  expect(getVersionDestination({ pathname: "/profile" }, "v2")).toEqual({
    to: "/v2/settings",
    isFallback: false,
  });
  expect(getVersionDestination({ pathname: "/v2/settings" }, "v1")).toEqual({
    to: "/settings",
    isFallback: false,
  });
  expect(isSupportedProtectedPath("/settings")).toBe(true);
  expect(isSupportedProtectedPath("/v2/settings")).toBe(true);
  expect(isSupportedProtectedPath("/profile")).toBe(true);
});
