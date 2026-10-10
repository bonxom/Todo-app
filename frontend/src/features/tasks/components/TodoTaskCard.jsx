import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  Flag,
  Loader2,
  MoreHorizontal,
  Pencil,
  Play,
  RotateCcw,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import "../todos.css";
import { getApiErrorMessage } from "@/shared/services/apiError";
import { differenceInCalendarDays, format, isValid } from "date-fns";

const TodoTaskCard = ({
  task,
  onAccept,
  onComplete,
  onGiveUp,
  onRestore,
  onEdit,
  onDelete,
  onDragStart,
  onReject,
  showDueTime = false,
}) => {
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const taskId = task._id || task.id;
  const completed = task.status === "completed";
  const givenUp = task.status === "given-up";
  const pending = task.status === "pending";
  const closed = completed || givenUp;
  const date = task.dueDate ? new Date(task.dueDate) : null;
  const days =
    date && isValid(date) ? differenceInCalendarDays(date, new Date()) : null;
  const dateLabel =
    days === null
      ? "No due date"
      : days < 0
        ? `${Math.abs(days)}d overdue`
        : days === 0
          ? "Today"
          : days === 1
            ? "Tomorrow"
            : format(date, "MMM d");
  const action = closed ? onRestore : pending ? onAccept : onComplete;
  const actionLabel = closed
    ? `Restore ${task.title} to in-progress`
    : pending
      ? `Accept ${task.title}`
      : `Mark ${task.title} as completed`;
  const ActionIcon = busy
    ? Loader2
    : givenUp
      ? RotateCcw
      : pending
        ? Play
        : Check;
  const categoryName =
    task.categoryId?.name ||
    task.category?.name ||
    (typeof task.category === "string" ? task.category : null);
  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);
  return (
    <article
      className="todo-task"
      data-status={task.status}
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart}
    >
      <div className="todo-task-controls">
      <button
        type="button"
        className="todo-check"
        disabled={busy}
        aria-label={actionLabel}
        title={
          pending ? "Start task" : closed ? "Restore task" : "Complete task"
        }
        onClick={async () => {
          if (busy || !action) return;
          setBusy(true);
          try {
            await action(taskId);
          } finally {
            setBusy(false);
          }
        }}
      >
        <ActionIcon size={14} className={busy ? "animate-spin" : ""} />
      </button>
      {pending && onReject && (
        <button
          type="button"
          className="todo-reject"
          disabled={busy}
          aria-label={`Reject ${task.title}`}
          title="Reject task"
          onClick={async (event) => {
            event.stopPropagation();
            if (busy) return;
            setBusy(true);
            try {
              await onReject(taskId);
            } catch (error) {
              alert(getApiErrorMessage(error, "Unable to reject task. Please try again."));
            } finally {
              setBusy(false);
            }
          }}
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
      </div>
      <div className="todo-task-content">
        <button
          type="button"
          className="todo-task-title"
          onClick={() => onEdit(task)}
        >
          {task.title}
        </button>
        {task.description && (
          <p className="todo-task-description">{task.description}</p>
        )}
        <div className="todo-task-meta">
          {task.projectId?.name && (
            <span className="todo-task-project">
              <i
                style={{
                  background: task.projectId.color || "var(--color-accent)",
                }}
              />
              {task.projectId.name}
            </span>
          )}
          {categoryName && (
            <span className="todo-task-category">
              <Tag size={11} />
              {categoryName}
            </span>
          )}
          <span
            className="todo-task-priority"
            data-priority={task.priority?.toLowerCase()}
          >
            <Flag size={11} />
            {task.priority || "Medium"}
          </span>
          {pending && <span className="todo-pending-label">Pending</span>}
          {givenUp && <span>Given up</span>}
          {completed && <span className="todo-completed-label">Completed</span>}
        </div>
      </div>
      <span
        className="todo-task-date"
        data-urgent={!closed && days !== null && days <= 0}
        title={date && isValid(date) ? format(date, "PPP") : undefined}
      >
        <CalendarDays size={13} />
        {showDueTime && date && isValid(date)
          ? format(date, "HH:mm")
          : closed
            ? completed ? "Done" : "Paused"
            : dateLabel}
      </span>
      <div className="todo-task-menu" ref={menuRef}>
        <button
          ref={triggerRef}
          type="button"
          className="todo-icon-button"
          aria-label={`Actions for ${task.title}`}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <MoreHorizontal size={18} />
        </button>
        {menuOpen && (
          <div
            className="todo-action-popover"
            data-escape-boundary
            aria-label={`Task actions for ${task.title}`}
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onEdit(task);
              }}
            >
              <Pencil size={14} />
              Edit task
            </button>
            {task.status === "in-progress" && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onGiveUp(taskId);
                }}
              >
                <Flag size={14} />
                Give up task
              </button>
            )}
            <button
              type="button"
              className="todo-delete-action"
              onClick={() => {
                setMenuOpen(false);
                onDelete(taskId);
              }}
            >
              <Trash2 size={14} />
              Delete task
            </button>
          </div>
        )}
      </div>
    </article>
  );
};
export default TodoTaskCard;
