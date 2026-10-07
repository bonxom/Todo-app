import { useEffect, useRef } from "react";
import { useModalKeyboard } from "@/shared/hooks/useModalKeyboard";
import { createPortal } from "react-dom";
import { CircleDot, X } from "lucide-react";
import TaskDetailForm from "./Form/TaskDetailForm";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    badgeClass:
      "border-transparent bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
  },
  "in-progress": {
    label: "In Progress",
    badgeClass:
      "border-transparent bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
  },
  completed: {
    label: "Completed",
    badgeClass:
      "border-transparent bg-[var(--color-success-soft)] text-[var(--color-success)]",
  },
  "given-up": {
    label: "Given Up",
    badgeClass:
      "border-transparent bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
  },
};

const TaskDetailButton = ({
  isOpen,
  task,
  onClose,
  onTaskUpdated,
  onProjectCreated,
  themeClass = "",
}) => {
  const dialogRef = useRef(null);
  useModalKeyboard(isOpen, dialogRef, onClose);
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !task) return null;

  const statusConfig = STATUS_CONFIG[task.status] || {
    label: task.status || "Pending",
    badgeClass: STATUS_CONFIG.pending.badgeClass,
  };

  return createPortal(
    <div
      className={`ui-modal-overlay fixed inset-0 z-[80] flex items-center justify-center p-4 ${themeClass}`}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="ui-modal-shell w-full max-w-xl animate-fadeIn"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-detail-title"
      >
        <div className="ui-modal-header flex items-center justify-between gap-4">
          <h2
            id="task-detail-title"
            className="text-xl font-semibold text-[var(--color-text)]"
          >
            Edit Task
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold ${statusConfig.badgeClass}`}
            >
              <CircleDot className="h-3.5 w-3.5" aria-hidden="true" />
              {statusConfig.label}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="ui-modal-close-button"
              aria-label="Close edit task dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          className="ui-modal-body overflow-y-auto"
          style={{ maxHeight: "calc(90vh - 100px)" }}
        >
          <TaskDetailForm
            task={task}
            onClose={onClose}
            onTaskUpdated={onTaskUpdated}
            onProjectCreated={onProjectCreated}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default TaskDetailButton;
