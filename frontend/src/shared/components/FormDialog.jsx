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
import "../../styles/forms.css";

const DialogDepth = createContext(0);
const icons = {
  task: CheckSquare,
  category: Layers,
  project: FolderKanban,
  generate: Sparkles,
};
const descriptions = {
  task: "A small step toward something that matters.",
  category: "Give related tasks a place to belong.",
  project: "Bring your tasks together around a shared goal.",
  generate: "Turn an idea into a manageable plan for your day.",
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
        className="workspace-dialog-overlay"
        style={{ zIndex: 100 + depth * 10 }}
        onClick={(event) => {
          if (event.target === event.currentTarget && !busy) onClose();
        }}
      >
        <section
          className="workspace-dialog"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-description`}
        >
          <header className="workspace-dialog-header">
            <span className="workspace-dialog-icon">
              {createElement(icons[kind], { size: 21, "aria-hidden": true })}
            </span>
            <div>
              <p className="workspace-dialog-eyebrow">
                {kind === "generate"
                  ? "A LITTLE HELP TO GET STARTED"
                  : "YOUR WORKSPACE"}
              </p>
              <h2 id={`${id}-title`}>{title}</h2>
            </div>
            <button
              type="button"
              className="workspace-dialog-close"
              onClick={onClose}
              disabled={busy}
              aria-label={closeLabel || `Close ${title.toLowerCase()} dialog`}
            >
              <X size={18} />
            </button>
            <p
              className="workspace-dialog-description"
              id={`${id}-description`}
            >
              {descriptions[kind]}
            </p>
          </header>
          <div className="workspace-dialog-body">{children}</div>
        </section>
      </div>
    </DialogDepth.Provider>,
    document.body,
  );
}
