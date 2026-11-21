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
      className="todo-task flex items-start [border-bottom:1px_solid_var(--color-line)] relative [transition:background_0.15s]
        [&:last-child]:[border-bottom:0] [&[data-status=completed]_.todo-task-title]:[text-decoration:line-through]
        [&[data-status=given-up]_.todo-task-title]:[text-decoration:line-through]
        [@media(max-width:520px)]:flex-wrap cursor-pointer"
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
      <div className="todo-task-controls flex flex-col items-center gap-[12px] shrink-0">
        <button
          type="button"
          className="todo-check relative w-[19px] h-[19px] rounded-[5px] shrink-0 mt-[1px] grid place-items-center
            [transition:background_0.15s,color_0.15s] [&::before]:absolute [&::before]:inset-[-9px]"
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
            className="todo-reject grid place-items-center w-[24px] h-[24px] mx-[-2.5px] rounded-[5px]
              [transition:color_0.15s,background_0.15s] [&:hover]:[background:var(--color-danger-soft)]
              [&:disabled]:opacity-[0.5]"
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
      <div className="todo-task-content min-w-[0] flex-1 [@media(max-width:520px)]:basis-[calc(100%_-_65px)]">
        <button
          type="button"
          className="todo-task-title block text-left wrap-anywhere [@media(max-width:520px)]:pr-[0.75rem]"
          onClick={() => onEdit(task)}
        >
          {task.title}
        </button>
        {task.description && (
          <p
            className="todo-task-description text-[var(--color-text-muted)] [line-height:1.6] m-[5px_0_0] overflow-hidden
            text-ellipsis whitespace-nowrap [@media(max-width:520px)]:whitespace-normal
            [@media(max-width:520px)]:[display:-webkit-box] [@media(max-width:520px)]:[-webkit-line-clamp:2]
            [@media(max-width:520px)]:[-webkit-box-orient:vertical]"
          >
            {task.description}
          </p>
        )}
        <div className="todo-task-meta flex items-center flex-wrap mt-[0.5rem] text-[0.625rem] text-[var(--color-text-muted)] [&_>_span]:inline-flex [&_>_span]:items-center">
          {task.projectId?.name && (
            <span className="todo-task-project [&_i]:w-[5px] [&_i]:h-[5px] [&_i]:rounded-[2px]">
              <i
                style={{
                  background: task.projectId.color || "var(--color-accent)",
                }}
              />
              {task.projectId.name}
            </span>
          )}
          {categoryName && (
            <span className="todo-task-category text-[var(--color-text-muted)] [&_svg]:shrink-0">
              <Tag size={11} />
              {categoryName}
            </span>
          )}
          <span
            className="todo-task-priority rounded-[4px] p-[1px_5px] [background:var(--color-surface-muted)]
              [&[data-priority=high]]:text-[var(--color-danger)]
              [&[data-priority=high]]:[background:var(--color-danger-soft)]
              [&[data-priority=medium]]:text-[var(--color-warning)]
              [&[data-priority=medium]]:[background:var(--color-warning-soft)]
              [&[data-priority=low]]:text-[var(--color-success)]
              [&[data-priority=low]]:[background:var(--color-success-soft)]"
            data-priority={task.priority?.toLowerCase()}
          >
            <Flag size={11} />
            {task.priority || "Medium"}
          </span>
          {pending && (
            <span className="todo-pending-label text-[var(--color-warning)]">
              {t("pending")}
            </span>
          )}
          {givenUp && <span>{t("givenUp")}</span>}
          {completed && (
            <span className="todo-completed-label text-[var(--color-success)]">
              {" "}
              {t("completed")}{" "}
            </span>
          )}
        </div>
      </div>
      <span
        className="todo-task-date flex items-center gap-[5px] text-[0.6875rem] text-[var(--color-text-muted)] whitespace-nowrap
          mt-[5px] [&[data-urgent=true]]:text-[var(--color-danger)]
          [@media(max-width:1279px)]:whitespace-normal [@media(max-width:520px)]:m-[-3px_0_0_29px]
          [@media(max-width:520px)]:text-[0.625rem]"
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
      <div
        className="todo-task-menu relative mt-[-3px] [@media(max-width:520px)]:absolute [@media(max-width:520px)]:right-[8px] [@media(max-width:520px)]:top-[1rem]"
        ref={menuRef}
      >
        <button
          ref={triggerRef}
          type="button"
          className="todo-icon-button min-w-[28px] h-[28px] inline-grid place-items-center rounded-[5px] [&:hover]:[background:var(--color-accent-soft)]"
          aria-label={t("messages.actionsForV0", { v0: task.title })}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <MoreHorizontal size={18} />
        </button>
        {menuOpen && (
          <div
            className="todo-action-popover absolute z-15 right-[0] top-[32px] w-[165px] p-[5px] [background:var(--color-surface)]
              [border:1px_solid_var(--color-line)] [box-shadow:var(--shadow-sm)] rounded-[var(--radius-sm)] [&_button]:flex
              [&_button]:items-center [&_button]:gap-[9px] [&_button]:w-full [&_button]:p-[10px] [&_button]:text-left
              [&_button]:rounded-[4px] [&_button:hover]:[background:var(--color-surface-muted)]"
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
