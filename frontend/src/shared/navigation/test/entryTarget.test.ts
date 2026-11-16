import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { UI_VERSION_STORAGE_KEY } from "../uiVersions";
import { resolveEntryTarget } from "../entryTarget";

describe("resolveEntryTarget", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("when valid returnTo is provided", () => {
    it("preserves valid v1 protected routes", () => {
      expect(resolveEntryTarget("/dashboard")).toBe("/dashboard");
      expect(resolveEntryTarget("/calendar")).toBe("/calendar");
      expect(resolveEntryTarget("/categories")).toBe("/categories");
      expect(resolveEntryTarget("/statistics")).toBe("/statistics");
      expect(resolveEntryTarget("/profile")).toBe("/profile");
      expect(resolveEntryTarget("/notifications")).toBe("/notifications");
      expect(resolveEntryTarget("/agent")).toBe("/agent");
      expect(resolveEntryTarget("/agent/skills")).toBe("/agent/skills");
      expect(resolveEntryTarget("/agent/skills/new")).toBe("/agent/skills/new");
      expect(resolveEntryTarget("/agent/skills/skill-123")).toBe(
        "/agent/skills/skill-123",
      );
    });

    it("preserves query and hash for valid return targets", () => {
      expect(
        resolveEntryTarget(
          "/dashboard?taskId=507f1f77bcf86cd799439011&page=2#top",
        ),
      ).toBe("/dashboard?taskId=507f1f77bcf86cd799439011&page=2#top");
      expect(resolveEntryTarget("/calendar?view=week#today")).toBe(
        "/calendar?view=week#today",
      );
    });

    it("preserves valid v2 protected routes", () => {
      expect(resolveEntryTarget("/v2/dashboard")).toBe("/v2/dashboard");
      expect(
        resolveEntryTarget("/v2/dashboard?taskId=507f1f77bcf86cd799439011"),
      ).toBe("/v2/dashboard?taskId=507f1f77bcf86cd799439011");
      // /v2 alias normalizes to /v2/dashboard
      expect(resolveEntryTarget("/v2")).toBe("/v2/dashboard");
      expect(resolveEntryTarget("/v2/")).toBe("/v2/dashboard");
    });
  });

  describe("when invalid or unsupported returnTo is provided", () => {
    it("falls back to default v1 dashboard when no preference is stored", () => {
      expect(resolveEntryTarget()).toBe("/dashboard");
      expect(resolveEntryTarget(null)).toBe("/dashboard");
      expect(resolveEntryTarget(undefined)).toBe("/dashboard");
      expect(resolveEntryTarget(123)).toBe("/dashboard");
      expect(resolveEntryTarget("")).toBe("/dashboard");
    });

    it("falls back to preferred v2 dashboard when preference is v2", () => {
      localStorage.setItem(UI_VERSION_STORAGE_KEY, "v2");
      expect(resolveEntryTarget()).toBe("/v2/dashboard");
      expect(resolveEntryTarget(null)).toBe("/v2/dashboard");
      expect(resolveEntryTarget("")).toBe("/v2/dashboard");
    });

    it("rejects public and auth routes", () => {
      expect(resolveEntryTarget("/")).toBe("/dashboard");
      expect(resolveEntryTarget("/login")).toBe("/dashboard");
      expect(resolveEntryTarget("/register")).toBe("/dashboard");
      expect(resolveEntryTarget("/ui-demo")).toBe("/dashboard");
    });

    it("rejects unknown or unimplemented v2 routes", () => {
      expect(resolveEntryTarget("/unknown")).toBe("/dashboard");
      expect(resolveEntryTarget("/v2/calendar")).toBe("/dashboard");
      expect(resolveEntryTarget("/v2/missing")).toBe("/dashboard");
      expect(resolveEntryTarget("/agent/skills/123/extra")).toBe("/dashboard");
    });

    it("rejects malicious or external URLs", () => {
      expect(resolveEntryTarget("https://evil.com")).toBe("/dashboard");
      expect(resolveEntryTarget("http://evil.com/dashboard")).toBe(
        "/dashboard",
      );
      expect(resolveEntryTarget("//evil.com")).toBe("/dashboard");
      expect(resolveEntryTarget("\\evil.com")).toBe("/dashboard");
      expect(resolveEntryTarget("javascript:alert(1)")).toBe("/dashboard");
      expect(resolveEntryTarget("/\\evil.com")).toBe("/dashboard");
    });
  });
});
