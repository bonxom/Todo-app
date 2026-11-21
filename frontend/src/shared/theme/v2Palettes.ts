import { useSyncExternalStore } from "react";

export type V2PaletteId = "mint" | "ocean" | "golden" | "crimson";

export interface V2PalettePreview {
  canvas: string;
  surface: string;
  accent: string;
  accentSoft: string;
}

export interface V2PaletteDefinition {
  id: V2PaletteId;
  labelKey: string;
  descriptionKey: string;
  preview: {
    light: V2PalettePreview;
    dark: V2PalettePreview;
  };
}

export const DEFAULT_V2_PALETTE: V2PaletteId = "mint";
export const V2_PALETTE_STORAGE_KEY = "orbit.v2-palette";

/**
 * Extensible registry for V2 Liquid Glass color palettes.
 * To add a new palette:
 * 1. Add its id to V2PaletteId and descriptor to V2_PALETTES below.
 * 2. Add Light and Dark CSS variable blocks in src/styles/v2-palettes.css.
 * 3. Add its i18n label/description keys in en/v2.json and vi/v2.json.
 */
export const V2_PALETTES: readonly V2PaletteDefinition[] = [
  {
    id: "mint",
    labelKey: "settings.palettes.mint.name",
    descriptionKey: "settings.palettes.mint.description",
    preview: {
      light: {
        canvas: "#e7efef",
        surface: "#f2f8f7",
        accent: "#14675f",
        accentSoft: "#b7e4d2",
      },
      dark: {
        canvas: "#102126",
        surface: "#1c3439",
        accent: "#a3e4ce",
        accentSoft: "#276853",
      },
    },
  },
  {
    id: "ocean",
    labelKey: "settings.palettes.ocean.name",
    descriptionKey: "settings.palettes.ocean.description",
    preview: {
      light: {
        canvas: "#e6f0f8",
        surface: "#f1f7fc",
        accent: "#0c5da8",
        accentSoft: "#93cdf8",
      },
      dark: {
        canvas: "#0b1929",
        surface: "#14283d",
        accent: "#7cc4fa",
        accentSoft: "#165694",
      },
    },
  },
  {
    id: "golden",
    labelKey: "settings.palettes.golden.name",
    descriptionKey: "settings.palettes.golden.description",
    preview: {
      light: {
        canvas: "#f6f1e6",
        surface: "#fcf9f2",
        accent: "#9a6308",
        accentSoft: "#f6d58a",
      },
      dark: {
        canvas: "#1f190f",
        surface: "#2e2517",
        accent: "#f6c453",
        accentSoft: "#785314",
      },
    },
  },
  {
    id: "crimson",
    labelKey: "settings.palettes.crimson.name",
    descriptionKey: "settings.palettes.crimson.description",
    preview: {
      light: {
        canvas: "#f7eaec",
        surface: "#fdf4f5",
        accent: "#a61c3c",
        accentSoft: "#f4b0bf",
      },
      dark: {
        canvas: "#211015",
        surface: "#331a21",
        accent: "#ff8fa3",
        accentSoft: "#7a1d33",
      },
    },
  },
] as const;

const VALID_PALETTE_IDS = new Set<string>(V2_PALETTES.map((p) => p.id));
const listeners = new Set<() => void>();
let currentPalette: V2PaletteId = DEFAULT_V2_PALETTE;

export function isV2PaletteId(value: unknown): value is V2PaletteId {
  return typeof value === "string" && VALID_PALETTE_IDS.has(value);
}

function readStoredV2Palette(): V2PaletteId {
  try {
    const raw = localStorage.getItem(V2_PALETTE_STORAGE_KEY);
    return isV2PaletteId(raw) ? raw : DEFAULT_V2_PALETTE;
  } catch {
    return DEFAULT_V2_PALETTE;
  }
}

function applyV2Palette(next: V2PaletteId): void {
  currentPalette = next;
  if (typeof document !== "undefined") {
    document.documentElement.dataset.v2Palette = next;
  }
  listeners.forEach((listener) => listener());
}

/**
 * Called before React renders (in main.tsx) so a saved palette renders with zero flash.
 */
export function initializeV2Palette(): void {
  applyV2Palette(readStoredV2Palette());
}

export function setV2Palette(next: V2PaletteId): void {
  const normalized = isV2PaletteId(next) ? next : DEFAULT_V2_PALETTE;
  applyV2Palette(normalized);
  try {
    localStorage.setItem(V2_PALETTE_STORAGE_KEY, normalized);
  } catch {
    // Palette remains active in memory when storage is unavailable.
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === V2_PALETTE_STORAGE_KEY || event.key === null) {
      applyV2Palette(readStoredV2Palette());
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function useV2Palette() {
  const palette = useSyncExternalStore(
    subscribe,
    () => currentPalette,
    () => DEFAULT_V2_PALETTE,
  );
  return {
    palette,
    setPalette: setV2Palette,
    palettes: V2_PALETTES,
  };
}
