import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UI_VERSION_STORAGE_KEY } from "../uiVersions";
import {
  readPreferredVersion,
  savePreferredVersion,
} from "../versionPreference";

describe("versionPreference", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns default version v1 when storage is empty", () => {
    expect(readPreferredVersion()).toBe("v1");
  });

  it("reads stored v1 and v2 correctly", () => {
    localStorage.setItem(UI_VERSION_STORAGE_KEY, "v2");
    expect(readPreferredVersion()).toBe("v2");

    localStorage.setItem(UI_VERSION_STORAGE_KEY, "v1");
    expect(readPreferredVersion()).toBe("v1");
  });

  it("falls back to v1 when stored value is invalid", () => {
    localStorage.setItem(UI_VERSION_STORAGE_KEY, "invalid");
    expect(readPreferredVersion()).toBe("v1");

    localStorage.setItem(UI_VERSION_STORAGE_KEY, "");
    expect(readPreferredVersion()).toBe("v1");
  });

  it("handles localStorage.getItem throwing an exception", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Quota or security error");
    });
    expect(readPreferredVersion()).toBe("v1");
  });

  it("saves preferred version to localStorage", () => {
    savePreferredVersion("v2");
    expect(localStorage.getItem(UI_VERSION_STORAGE_KEY)).toBe("v2");

    savePreferredVersion("v1");
    expect(localStorage.getItem(UI_VERSION_STORAGE_KEY)).toBe("v1");
  });

  it("handles localStorage.setItem throwing without uncaught error and does not touch other keys", () => {
    localStorage.setItem("theme", "dark");
    localStorage.setItem("language", "vi");

    vi.spyOn(Storage.prototype, "setItem").mockImplementation((key) => {
      if (key === UI_VERSION_STORAGE_KEY) {
        throw new Error("Disk full");
      }
    });

    expect(() => savePreferredVersion("v2")).not.toThrow();
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(localStorage.getItem("language")).toBe("vi");
  });
});
