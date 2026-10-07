import { useEffect, useRef } from "react";

/** Keep keyboard focus in the active dialog and return it to its trigger. */
export function useModalKeyboard(isOpen, dialogRef, onClose) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    const focusable =
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]';
    const frame = requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (dialog && !dialog.contains(document.activeElement))
        (
          dialog.querySelector("input:not(:disabled)") ||
          dialog.querySelector(focusable)
        )?.focus();
    });
    const handleKey = (event) => {
      const dialog = dialogRef.current;
      const dialogs = document.querySelectorAll(
        '[role="dialog"][aria-modal="true"]',
      );
      if (!dialog || dialogs[dialogs.length - 1] !== dialog) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeRef.current?.();
      }
      if (event.key === "Tab") {
        const elements = [...dialog.querySelectorAll(focusable)].filter(
          (el) => el.getClientRects().length,
        );
        const first = elements[0],
          last = elements[elements.length - 1];
        if (!first) {
          event.preventDefault();
          return;
        }
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            !dialog.contains(document.activeElement))
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            !dialog.contains(document.activeElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKey, true);
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, [isOpen, dialogRef]);
}
