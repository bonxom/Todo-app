import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_V2_PALETTE,
  V2_PALETTES,
  V2_PALETTE_STORAGE_KEY,
  initializeV2Palette,
  isV2PaletteId,
  setV2Palette,
  useV2Palette,
} from "../v2Palettes";

describe("v2Palettes", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.v2Palette;
    initializeV2Palette();
  });

  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.v2Palette;
  });

  it("registers mint (default), ocean, golden, and crimson palettes with light and dark previews", () => {
    expect(DEFAULT_V2_PALETTE).toBe("mint");
    expect(V2_PALETTE_STORAGE_KEY).toBe("orbit.v2-palette");
    expect(V2_PALETTES.map((p) => p.id)).toEqual([
      "mint",
      "ocean",
      "golden",
      "crimson",
    ]);
    for (const palette of V2_PALETTES) {
      expect(palette.preview.light.accent).toMatch(/^#/);
      expect(palette.preview.dark.accent).toMatch(/^#/);
    }
    expect(isV2PaletteId("mint")).toBe(true);
    expect(isV2PaletteId("ocean")).toBe(true);
    expect(isV2PaletteId("golden")).toBe(true);
    expect(isV2PaletteId("crimson")).toBe(true);
    expect(isV2PaletteId("sunset")).toBe(false);
  });

  it("initializes from localStorage and falls back to mint for invalid values", () => {
    localStorage.setItem(V2_PALETTE_STORAGE_KEY, "ocean");
    initializeV2Palette();
    expect(document.documentElement.dataset.v2Palette).toBe("ocean");

    localStorage.setItem(V2_PALETTE_STORAGE_KEY, "invalid-palette");
    initializeV2Palette();
    expect(document.documentElement.dataset.v2Palette).toBe("mint");
  });

  it("persists changes via setV2Palette and notifies useV2Palette subscribers", () => {
    const { result } = renderHook(() => useV2Palette());
    expect(result.current.palette).toBe("mint");

    act(() => {
      result.current.setPalette("ocean");
    });

    expect(result.current.palette).toBe("ocean");
    expect(localStorage.getItem(V2_PALETTE_STORAGE_KEY)).toBe("ocean");
    expect(document.documentElement.dataset.v2Palette).toBe("ocean");

    act(() => {
      setV2Palette("mint");
    });

    expect(result.current.palette).toBe("mint");
    expect(document.documentElement.dataset.v2Palette).toBe("mint");
  });

  it("syncs palette across tabs via storage events", () => {
    const { result } = renderHook(() => useV2Palette());
    expect(result.current.palette).toBe("mint");

    localStorage.setItem(V2_PALETTE_STORAGE_KEY, "ocean");
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: V2_PALETTE_STORAGE_KEY,
          newValue: "ocean",
        }),
      );
    });

    expect(result.current.palette).toBe("ocean");
    expect(document.documentElement.dataset.v2Palette).toBe("ocean");
  });
});
