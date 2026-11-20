import { useTranslation } from "react-i18next";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2 } from "lucide-react";
import { useModalKeyboard } from "@/shared/hooks/useModalKeyboard";

export default function DescriptionEditor({
  value,
  onChange,
  onSave,
  busy,
  error,
}) {
  const { t } = useTranslation("workspace");

  const [expanded, setExpanded] = useState(false);
  const [closing, setClosing] = useState(false);
  const dialogRef = useRef(null);
  const open = () => {
    setClosing(false);
    setExpanded(true);
  };
  const close = () => setClosing(true);
  useModalKeyboard(expanded, dialogRef, close);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor="edit-description" className="text-sm font-medium">
          {t("description")}
        </label>
        <button
          type="button"
          className="ui-btn-ghost"
          aria-label={t("expandDescription")}
          aria-haspopup="dialog"
          onClick={open}
        >
          <Maximize2 size={16} />
        </button>
      </div>
      <textarea
        id="edit-description"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onClick={open}
        placeholder={t("enterTaskDescription")}
        rows={4}
        className="ui-input"
      />
      {expanded &&
        createPortal(
          <div
            className="description-editor-overlay fixed inset-[0] z-200 grid place-items-center p-[clamp(12px,3vw,40px)]
              [background:var(--color-overlay)] [backdrop-filter:blur(8px)]
              [&[data-closing=true]_.description-editor-dialog]:pointer-events-none"
            data-closing={closing}
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget && closing) {
                setExpanded(false);
                setClosing(false);
              }
            }}
            onClick={(event) => {
              event.stopPropagation();
              if (event.target === event.currentTarget) close();
            }}
          >
            <section
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label={t("editDescription")}
              className="description-editor-dialog w-[min(100%,960px)] h-[min(80dvh,760px)] flex flex-col gap-[16px]
                p-[clamp(16px,3vw,28px)] [border:1px_solid_var(--color-line)] rounded-[20px] [background:var(--color-surface)]
                [box-shadow:var(--shadow-lg)] [transform-origin:center]"
            >
              <label
                htmlFor="expanded-description"
                className="text-sm font-medium"
              >
                {t("description")}
              </label>
              <textarea
                id="expanded-description"
                autoFocus
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={t("enterTaskDescription")}
                className="ui-input description-editor-textarea flex-1 resize-none"
              />
              {error && (
                <p
                  role="alert"
                  className="workspace-form-error text-[var(--color-danger)] [background:var(--color-danger-soft)] rounded-[9px] p-[11px_13px] text-[12px] [line-height:1.6]"
                >
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="ui-btn-secondary"
                  onClick={close}
                >
                  <Minimize2 size={16} /> {t("collapse")}
                </button>
                <button
                  type="button"
                  className="ui-btn-primary"
                  disabled={busy}
                  onClick={() => {
                    close();
                    onSave();
                  }}
                >
                  {busy ? t("saving") : t("saveChanges")}
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )}
    </div>
  );
}
