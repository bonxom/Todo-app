import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2 } from "lucide-react";
import { useModalKeyboard } from "@/shared/hooks/useModalKeyboard";

export default function DescriptionEditor({ value, onChange, onSave, busy, error }) {
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
          Description
        </label>
        <button
          type="button"
          className="ui-btn-ghost"
          aria-label="Expand description"
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
        placeholder="Enter task description…"
        rows={4}
        className="ui-input"
      />
      {expanded && createPortal(
        <div
          className="description-editor-overlay"
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
            aria-label="Edit description"
            className="description-editor-dialog"
          >
            <label htmlFor="expanded-description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="expanded-description"
              autoFocus
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder="Enter task description…"
              className="ui-input description-editor-textarea"
            />
            {error && <p role="alert" className="workspace-form-error">{error}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" className="ui-btn-secondary" onClick={close}>
                <Minimize2 size={16} /> Collapse
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
                {busy ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </div>
  );
}
