import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";
const STORAGE_KEY = "orbit-theme";
const listeners = new Set<() => void>();
let theme: Theme = "light";

function readTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function applyTheme(next: Theme) {
  theme = next;
  document.documentElement.dataset.theme = next;
  document.documentElement.style.colorScheme = next;
  listeners.forEach((listener) => listener());
}

// Called before React renders, so a saved dark preference has no light flash.
export function initializeTheme() {
  applyTheme(readTheme());
}

export function setTheme(next: Theme) {
  applyTheme(next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // The toggle still works for this session when storage is unavailable.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null)
      applyTheme(readTheme());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useTheme() {
  const current = useSyncExternalStore(
    subscribe,
    () => theme,
    () => "light" as Theme,
  );
  return { theme: current, setTheme };
}
