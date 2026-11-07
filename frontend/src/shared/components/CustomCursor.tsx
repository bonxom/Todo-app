import { useEffect, useRef, useState } from "react";

const DOT_SIZE_PX = 14;

const TEXT_INPUT_SELECTOR = [
  'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="color"]):not(:disabled)',
  "textarea:not(:disabled)",
  '[contenteditable="true"]',
].join(", ");

const CONTROL_SELECTOR = [
  "button:not(:disabled)",
  "a[href]",
  '[role="button"]:not([aria-disabled="true"])',
  "summary",
  'input[type="button"]:not(:disabled)',
  'input[type="submit"]:not(:disabled)',
  'input[type="reset"]:not(:disabled)',
  'input[type="checkbox"]:not(:disabled)',
  'input[type="radio"]:not(:disabled)',
  '[data-cursor-target="control"]',
].join(", ");

const CARD_SELECTOR = [
  ".ui-task-card",
  ".category-card",
  ".feature-card",
  ".satellite-card",
  ".a2ui-card",
  ".todo-progress-card",
  '[data-cursor-target="card"]',
  '[data-cursor-target="true"]',
].join(", ");

type CursorTargetResolution =
  | { mode: "dot"; snapKind: ""; element: null }
  | { mode: "text"; snapKind: ""; element: HTMLElement }
  | { mode: "snap"; snapKind: "control" | "card"; element: HTMLElement };

function resolveCursorTarget(
  target: EventTarget | null,
): CursorTargetResolution {
  if (!(target instanceof Element)) {
    return { mode: "dot", snapKind: "", element: null };
  }

  const textInput = target.closest(TEXT_INPUT_SELECTOR);
  if (textInput instanceof HTMLElement) {
    return { mode: "text", snapKind: "", element: textInput };
  }

  const control = target.closest(CONTROL_SELECTOR);
  if (control instanceof HTMLElement) {
    return { mode: "snap", snapKind: "control", element: control };
  }

  const card = target.closest(CARD_SELECTOR);
  if (card instanceof HTMLElement) {
    return { mode: "snap", snapKind: "card", element: card };
  }

  return { mode: "dot", snapKind: "", element: null };
}

function getCursorEligibility(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }

  const hasFinePointer = window.matchMedia(
    "(hover: hover) and (pointer: fine)",
  ).matches;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  return hasFinePointer && !prefersReducedMotion;
}

function resolveElementBorderRadius(element: HTMLElement): string {
  const inlineRadius = element.style.borderRadius;
  const computedRadius =
    typeof window !== "undefined" &&
    typeof window.getComputedStyle === "function"
      ? window.getComputedStyle(element).borderRadius
      : "";

  const candidate = computedRadius || inlineRadius;
  if (candidate && candidate !== "0px") {
    return candidate;
  }
  return "10px";
}

export default function CustomCursor() {
  const [isEligible, setIsEligible] = useState<boolean>(() =>
    getCursorEligibility(),
  );
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const activeSnapElementRef = useRef<HTMLElement | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number }>({ x: -100, y: -100 });

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return undefined;
    }

    const pointerQuery = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    );
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncEligibility = () => {
      setIsEligible(pointerQuery.matches && !motionQuery.matches);
    };

    syncEligibility();

    if (typeof pointerQuery.addEventListener === "function") {
      pointerQuery.addEventListener("change", syncEligibility);
      motionQuery.addEventListener("change", syncEligibility);
      return () => {
        pointerQuery.removeEventListener("change", syncEligibility);
        motionQuery.removeEventListener("change", syncEligibility);
      };
    }

    return undefined;
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (!isEligible) {
      root.classList.remove("has-custom-cursor");
      return undefined;
    }

    root.classList.add("has-custom-cursor");

    const applyDotMetrics = (
      cursorEl: HTMLDivElement,
      x: number,
      y: number,
    ) => {
      cursorEl.dataset.mode = "dot";
      cursorEl.dataset.snapKind = "";
      cursorEl.style.setProperty("--cursor-x", `${x}px`);
      cursorEl.style.setProperty("--cursor-y", `${y}px`);
      cursorEl.style.setProperty("--cursor-w", `${DOT_SIZE_PX}px`);
      cursorEl.style.setProperty("--cursor-h", `${DOT_SIZE_PX}px`);
      cursorEl.style.setProperty("--cursor-radius", "9999px");
    };

    const applySnapMetrics = (
      cursorEl: HTMLDivElement,
      targetEl: HTMLElement,
      snapKind: "control" | "card",
      fallbackX: number,
      fallbackY: number,
    ) => {
      const rect = targetEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        applyDotMetrics(cursorEl, fallbackX, fallbackY);
        return;
      }

      const centerX = Math.round((rect.left + rect.width / 2) * 100) / 100;
      const centerY = Math.round((rect.top + rect.height / 2) * 100) / 100;
      const radius = resolveElementBorderRadius(targetEl);

      cursorEl.dataset.mode = "snap";
      cursorEl.dataset.snapKind = snapKind;
      cursorEl.style.setProperty("--cursor-x", `${centerX}px`);
      cursorEl.style.setProperty("--cursor-y", `${centerY}px`);
      cursorEl.style.setProperty("--cursor-w", `${Math.round(rect.width)}px`);
      cursorEl.style.setProperty("--cursor-h", `${Math.round(rect.height)}px`);
      cursorEl.style.setProperty("--cursor-radius", radius);
    };

    const handlePointerMove = (event: PointerEvent | MouseEvent) => {
      const cursorEl = cursorRef.current;
      if (!cursorEl) return;

      const x = Number.isFinite(event.clientX)
        ? event.clientX
        : lastPointerRef.current.x;
      const y = Number.isFinite(event.clientY)
        ? event.clientY
        : lastPointerRef.current.y;
      lastPointerRef.current = { x, y };
      cursorEl.dataset.visible = "true";

      const resolution = resolveCursorTarget(event.target);

      if (resolution.mode === "text") {
        activeSnapElementRef.current = null;
        cursorEl.dataset.mode = "text";
        cursorEl.dataset.snapKind = "";
        cursorEl.style.setProperty("--cursor-x", `${x}px`);
        cursorEl.style.setProperty("--cursor-y", `${y}px`);
        cursorEl.style.setProperty("--cursor-w", "4px");
        cursorEl.style.setProperty("--cursor-h", "18px");
        cursorEl.style.setProperty("--cursor-radius", "9999px");
        return;
      }

      if (resolution.mode === "snap") {
        activeSnapElementRef.current = resolution.element;
        applySnapMetrics(
          cursorEl,
          resolution.element,
          resolution.snapKind,
          x,
          y,
        );
        return;
      }

      activeSnapElementRef.current = null;
      applyDotMetrics(cursorEl, x, y);
    };

    const handlePointerDown = () => {
      const cursorEl = cursorRef.current;
      if (!cursorEl) return;
      cursorEl.dataset.pressed = "true";
    };

    const handlePointerUp = () => {
      const cursorEl = cursorRef.current;
      if (!cursorEl) return;
      cursorEl.dataset.pressed = "false";
    };

    const handleViewportLeave = () => {
      const cursorEl = cursorRef.current;
      if (!cursorEl) return;
      cursorEl.dataset.visible = "false";
      cursorEl.dataset.pressed = "false";
      activeSnapElementRef.current = null;
    };

    const handleScrollOrResize = () => {
      const cursorEl = cursorRef.current;
      const snappedEl = activeSnapElementRef.current;
      if (!cursorEl || !snappedEl) return;

      if (!snappedEl.isConnected) {
        activeSnapElementRef.current = null;
        applyDotMetrics(
          cursorEl,
          lastPointerRef.current.x,
          lastPointerRef.current.y,
        );
        return;
      }

      const snapKind =
        cursorEl.dataset.snapKind === "card" ? "card" : "control";
      applySnapMetrics(
        cursorEl,
        snappedEl,
        snapKind,
        lastPointerRef.current.x,
        lastPointerRef.current.y,
      );
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    window.addEventListener("mousemove", handlePointerMove, {
      passive: true,
    });
    window.addEventListener("pointerdown", handlePointerDown, {
      passive: true,
    });
    window.addEventListener("mousedown", handlePointerDown, {
      passive: true,
    });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    window.addEventListener("mouseup", handlePointerUp, { passive: true });
    window.addEventListener("pointercancel", handlePointerUp, {
      passive: true,
    });
    window.addEventListener("blur", handleViewportLeave);
    window.addEventListener("scroll", handleScrollOrResize, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", handleScrollOrResize, { passive: true });
    root.addEventListener("mouseleave", handleViewportLeave);

    return () => {
      root.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("blur", handleViewportLeave);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      root.removeEventListener("mouseleave", handleViewportLeave);
    };
  }, [isEligible]);

  if (!isEligible) {
    return null;
  }

  return (
    <div
      ref={cursorRef}
      className="custom-cursor"
      data-testid="custom-cursor"
      data-mode="dot"
      data-snap-kind=""
      data-visible="false"
      data-pressed="false"
      aria-hidden="true"
    />
  );
}
