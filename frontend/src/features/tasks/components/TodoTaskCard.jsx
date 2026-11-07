import { enUS, vi } from "date-fns/locale";
import { useTranslation } from "react-i18next";
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
import { useTaskStatusEffect } from "../hooks/useTaskStatusEffect";

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
  const { t, i18n } = useTranslation("workspace");

  const statusEffectRef = useTaskStatusEffect(task);
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
      ? t("noDueDate")
      : days < 0
        ? t("messages.v0DOverdue", { v0: Math.abs(days) })
        : days === 0
          ? t("today")
          : days === 1
            ? t("tomorrow")
            : format(date, "MMM d", {
                locale: i18n.language === "vi" ? vi : enUS,
              });
  const action = closed ? onRestore : pending ? onAccept : onComplete;
  const actionLabel = closed
    ? t("messages.restoreV0ToInProgress", { v0: task.title })
    : pending
      ? t("messages.acceptV0", { v0: task.title })
      : t("messages.markV0AsCompleted", { v0: task.title });
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
      ref={statusEffectRef}
      className="todo-task cursor-pointer"
      onClick={(event) => {
        if (
          !event.target.closest(
            "button, a, input, select, textarea, [role='menu']",
          )
        ) {
          onEdit?.(task);
        }
      }}
      data-status={task.status}
      data-task-id={taskId}
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
            pending
              ? t("startTask")
              : closed
                ? t("restoreTask")
                : t("completeTask")
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
            aria-label={t("messages.rejectV0", { v0: task.title })}
            title={t("rejectTask")}
            onClick={async (event) => {
              event.stopPropagation();
              if (busy) return;
              setBusy(true);
              try {
                await onReject(taskId);
              } catch (error) {
                alert(
                  getApiErrorMessage(
                    error,
                    t("unableToRejectTaskPleaseTryAgain"),
                  ),
                );
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
          {pending && (
            <span className="todo-pending-label">{t("pending")}</span>
          )}
          {givenUp && <span>{t("givenUp")}</span>}
          {completed && (
            <span className="todo-completed-label"> {t("completed")} </span>
          )}
        </div>
      </div>
      <span
        className="todo-task-date"
        data-urgent={!closed && days !== null && days <= 0}
        title={
          date && isValid(date)
            ? format(date, "PPP", {
                locale: i18n.language === "vi" ? vi : enUS,
              })
            : undefined
        }
      >
        <CalendarDays size={13} />
        {showDueTime && date && isValid(date)
          ? format(date, "HH:mm", {
              locale: i18n.language === "vi" ? vi : enUS,
            })
          : closed
            ? completed
              ? t("done")
              : t("paused")
            : dateLabel}
      </span>
      <div className="todo-task-menu" ref={menuRef}>
        <button
          ref={triggerRef}
          type="button"
          className="todo-icon-button"
          aria-label={t("messages.actionsForV0", { v0: task.title })}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <MoreHorizontal size={18} />
        </button>
        {menuOpen && (
          <div
            className="todo-action-popover"
            data-escape-boundary
            aria-label={t("messages.taskActionsForV0", { v0: task.title })}
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onEdit(task);
              }}
            >
              <Pencil size={14} />
              {t("editTask")}
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
                {t("giveUpTaskCasedGiveuptask")}
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
              {t("deleteTaskCasedDeletetask")}
            </button>
          </div>
        )}
      </div>
    </article>
  );
};
export default TodoTaskCard;
