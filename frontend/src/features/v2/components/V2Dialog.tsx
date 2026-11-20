import { useTranslation } from "react-i18next";
import { useEffect, useRef, useId, type PropsWithChildren } from "react";
import { X } from "lucide-react";

export type V2DialogProps = PropsWithChildren<{
  open: boolean;
  title: string;
  onClose: () => void;
  className?: string;
}>;

export default function V2Dialog({
  open,
  title,
  onClose,
  className = "",
  children,
}: V2DialogProps) {
  const { t } = useTranslation("v2");
  const titleId = useId();
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocusedElementRef.current =
      document.activeElement as HTMLElement | null;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const inerted: Array<{ element: HTMLElement; previous: boolean }> = [];
    let current = dialogRef.current?.parentElement;
    while (current && current !== document.body) {
      for (const sibling of Array.from(current.parentElement?.children ?? [])) {
        if (sibling !== current && sibling instanceof HTMLElement) {
          inerted.push({ element: sibling, previous: sibling.inert });
          sibling.inert = true;
        }
      }
      current = current.parentElement;
    }

    // Focus initial element or dialog itself
    const timer = setTimeout(() => {
      if (dialogRef.current) {
        const focusable = dialogRef.current.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        focusable?.focus();
      }
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      for (const { element, previous } of inerted) element.inert = previous;
      const previousFocus = previouslyFocusedElementRef.current;
      if (previousFocus?.isConnected) previousFocus.focus();
      else document.getElementById("v2-main-content")?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="v2-dialog-backdrop fixed inset-[0] [background:rgb(14_34_39_/_38%)] [backdrop-filter:blur(8px)]
        [-webkit-backdrop-filter:blur(8px)] z-2000 flex items-center justify-center p-[20px]
        [@media(max-width:767px)]:p-[12px] [@media(prefers-reduced-transparency:reduce)]:[backdrop-filter:none]
        [@media(prefers-reduced-transparency:reduce)]:[-webkit-backdrop-filter:none]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeRef.current();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`v2-dialog-panel ${className}`.trim()}
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--v2-border)]">
          <h2
            id={titleId}
            className="text-lg font-semibold text-[var(--v2-ink)] tracking-tight"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="v2-btn p-1.5 min-h-0 border-0 bg-transparent text-[var(--v2-muted)] hover:text-[var(--v2-ink)]"
            aria-label={t("close")}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
