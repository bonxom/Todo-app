import { useTranslation } from "react-i18next";
import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useId,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { CheckSquare, FolderKanban, Layers, Sparkles, X } from "lucide-react";
import { useModalKeyboard } from "@/shared/hooks/useModalKeyboard";

const DialogDepth = createContext(0);
const icons = {
  task: CheckSquare,
  category: Layers,
  project: FolderKanban,
  generate: Sparkles,
};
let openDialogs = 0;
let previousOverflow = "";

export default function FormDialog({
  isOpen = true,
  onClose,
  title,
  kind = "task",
  children,
  busy = false,
  closeLabel,
}) {
  const { t } = useTranslation("common");
  const id = useId();
  const dialogRef = useRef(null);
  const depth = useContext(DialogDepth);
  useModalKeyboard(isOpen, dialogRef, () => {
    if (!busy) onClose();
  });
  useEffect(() => {
    if (!isOpen) return;
    if (openDialogs++ === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    return () => {
      if (--openDialogs === 0) document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);
  if (!isOpen) return null;
  return createPortal(
    <DialogDepth.Provider value={depth + 1}>
      <div
        className="workspace-dialog-overlay fixed inset-[0] flex items-center justify-center p-[24px] [background:var(--color-overlay)] [backdrop-filter:blur(4px)] [@media(max-width:600px)]:p-[12px]"
        style={{ zIndex: 100 + depth * 10 }}
        onClick={(event) => {
          if (event.target === event.currentTarget && !busy) onClose();
        }}
      >
        <section
          className="workspace-dialog w-[min(100%,540px)] max-h-[calc(100dvh_-_48px)] flex flex-col overflow-hidden
            [border:1px_solid_var(--color-line)] rounded-[20px] [background:var(--color-surface)]
            [box-shadow:var(--shadow-lg)] animate-[fadeIn_180ms_ease-out]
            [@media(max-width:600px)]:rounded-[16px] [@media(max-width:600px)]:max-h-[calc(100dvh_-_24px)]"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-description`}
        >
          <header
            className="workspace-dialog-header shrink-0 grid grid-cols-[44px_minmax(0,1fr)_30px] gap-[0_14px] p-[26px_28px_22px]
            [border-bottom:1px_solid_var(--color-line)]
            [background:linear-gradient(_120deg,var(--color-accent-soft),var(--color-surface)_80%_)]
            [&_h2]:[font-weight:600] [&_h2]:[letter-spacing:-0.035em] [&_h2]:[line-height:1.3] [&_h2]:m-[0]
            [@media(max-width:600px)]:p-[20px_20px_18px]"
          >
            <span
              className="workspace-dialog-icon w-[44px] h-[44px] grid place-items-center
              [border:1px_solid_color-mix(in_srgb,var(--color-accent)_18%,var(--color-line))]
              [background:var(--color-surface)] text-[var(--color-accent)] rounded-[13px]"
            >
              {createElement(icons[kind], { size: 21, "aria-hidden": true })}
            </span>
            <div>
              <p className="workspace-dialog-eyebrow text-[var(--color-accent)] text-[9px] [font-weight:700] [letter-spacing:0.14em] m-[0_0_4px]">
                {kind === "generate" ? t("dialog.help") : t("dialog.workspace")}
              </p>
              <h2 id={`${id}-title`}>{title}</h2>
            </div>
            <button
              type="button"
              className="workspace-dialog-close w-[30px] h-[30px] grid place-items-center rounded-[8px] cursor-pointer [&:hover]:[background:var(--color-surface-muted)]"
              onClick={onClose}
              disabled={busy}
              aria-label={
                closeLabel || t("dialog.close", { title: title.toLowerCase() })
              }
            >
              <X size={18} />
            </button>
            <p
              className="workspace-dialog-description col-[1_/_-1] text-[var(--color-text-muted)] text-[12px] [line-height:1.65] m-[16px_0_0]"
              id={`${id}-description`}
            >
              {t(`dialog.${kind}`)}
            </p>
          </header>
          <div className="workspace-dialog-body min-h-[0] overflow-y-auto overscroll-contain p-[24px_28px_0] [@media(max-width:600px)]:p-[20px_20px_0]">
            {children}
          </div>
        </section>
      </div>
    </DialogDepth.Provider>,
    document.body,
  );
}
