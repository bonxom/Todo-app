import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Calendar as CalendarIcon,
  FolderKanban,
  CheckCircle2,
  Clock,
  Circle,
  XCircle,
  Tag,
  Play,
  Check,
  Loader2,
} from "lucide-react";
import { getLocale } from "@/shared/i18n";
import {
  useStartTaskMutation,
  useFinishTaskMutation,
} from "@/features/tasks/api/taskMutations";
import { getApiErrorMessage } from "@/shared/services/apiError";
import type { Task, Category, Project } from "@/shared/types/domain";

export interface TaskRowProps {
  task: Task;
  onOpen: (taskId: string) => void;
  actions?: React.ReactNode;
}

export default function TaskRow({ task, onOpen, actions }: TaskRowProps) {
  const { t } = useTranslation("v2");
  const taskId = task._id || task.id || "";

  const inFlightRef = useRef(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const startMutation = useStartTaskMutation();
  const finishMutation = useFinishTaskMutation();
  const isPending = startMutation.isPending || finishMutation.isPending;

  const handleAction = async () => {
    if (inFlightRef.current || isPending) return;
    inFlightRef.current = true;
    setActionError(null);
    try {
      if (task.status === "pending") {
        await startMutation.mutateAsync(taskId);
      } else if (task.status === "in-progress") {
        await finishMutation.mutateAsync(taskId);
      }
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Failed to update task status"));
    } finally {
      inFlightRef.current = false;
    }
  };

  // Project name resolution
  const projectName =
    typeof task.projectId === "object" && task.projectId !== null
      ? (task.projectId as Project).name
      : undefined;

  // Category name resolution
  const categoryName =
    typeof task.categoryId === "object" && task.categoryId !== null
      ? (task.categoryId as Category).name
      : undefined;

  // Due date formatting
  let formattedDueDate = t("noDueDate");
  if (task.dueDate) {
    try {
      formattedDueDate = new Intl.DateTimeFormat(getLocale(), {
        month: "short",
        day: "numeric",
      }).format(new Date(task.dueDate));
    } catch {
      formattedDueDate = t("noDueDate");
    }
  }

  const statusIcons = {
    pending: Circle,
    "in-progress": Clock,
    completed: CheckCircle2,
    "given-up": XCircle,
  };

  const StatusIcon = statusIcons[task.status] || Circle;

  const renderDefaultAction = () => {
    if (task.status === "pending") {
      return (
        <button
          type="button"
          onClick={handleAction}
          disabled={isPending}
          aria-busy={isPending}
          className="v2-btn v2-btn-primary [&:hover]:filter-[brightness(1.08)] text-xs py-1.5 px-3 min-h-0"
        >
          {isPending ? (
            <Loader2 size={13} className="animate-spin" aria-hidden="true" />
          ) : (
            <Play size={13} aria-hidden="true" />
          )}
          <span>{isPending ? t("starting") : t("start")}</span>
        </button>
      );
    }

    if (task.status === "in-progress") {
      return (
        <button
          type="button"
          onClick={handleAction}
          disabled={isPending}
          aria-busy={isPending}
          className="v2-btn text-xs py-1.5 px-3 min-h-0 !text-[var(--v2-success)] [border-color:color-mix(in_srgb,var(--v2-success)_35%,transparent)] hover:[border-color:var(--v2-success)] hover:[background:color-mix(in_srgb,var(--v2-success)_12%,var(--v2-input-fill))] font-medium"
        >
          {isPending ? (
            <Loader2 size={13} className="animate-spin" aria-hidden="true" />
          ) : (
            <Check size={13} aria-hidden="true" />
          )}
          <span>{isPending ? t("finishing") : t("finish")}</span>
        </button>
      );
    }

    return null;
  };

  return (
    <div
      className="v2-task-row justify-between [border-bottom:1px_solid_var(--v2-border)] [transition:background-color_160ms]
      [&:last-child]:[border-bottom:0] [@media(max-width:767px)]:flex-col [&_.v2-status]:[justify-self:start]
      [&_.v2-status]:rounded-[var(--v2-radius-pill)] [&_.v2-status]:text-[11px] [&_.v2-status]:[font-weight:550]
      [&_.v2-status]:whitespace-nowrap [@container_workspace_(max-width:850px)]:[&_.v2-status]:col-1
      [@container_workspace_(max-width:850px)]:[&_.v2-status]:row-2"
      role="listitem"
    >
      <div className="v2-task-identity min-w-[0] [@container_workspace_(max-width:850px)]:col-[1_/_-1] [@container_workspace_(max-width:850px)]:row-1">
        <button
          type="button"
          onClick={() => onOpen(taskId)}
          className="v2-task-title text-left block w-full wrap-anywhere [@media(max-width:767px)]:col-[1_/_-1]"
        >
          {task.title}
        </button>
        {(projectName || categoryName) && (
          <div
            className="v2-task-context flex flex-wrap gap-[4px_12px] mt-[5px] text-[var(--v2-muted)] text-[11px]
            [&_>_span]:inline-flex [&_>_span]:items-center [&_>_span]:gap-[5px] [&_>_span]:min-w-[0]
            [&_>_span]:wrap-anywhere [&_svg]:flex-[0_0_auto]"
          >
            {projectName && (
              <span>
                <FolderKanban size={12} aria-hidden="true" />
                {projectName}
              </span>
            )}
            {categoryName && (
              <span>
                <Tag size={12} aria-hidden="true" />
                {categoryName}
              </span>
            )}
          </div>
        )}
      </div>
      <span data-status={task.status} className="v2-status">
        <StatusIcon size={13} aria-hidden="true" />
        {t(
          task.status === "in-progress"
            ? "inProgress"
            : task.status === "given-up"
              ? "givenUp"
              : task.status,
        )}
      </span>
      <span
        className="v2-task-priority inline-flex items-center gap-[6px] text-[var(--v2-muted)] text-[12px] [&_>_span]:w-[5px]
        [&_>_span]:h-[5px] [&_>_span]:flex-[0_0_auto] [&_>_span]:rounded-[50%] [&_>_span]:[background:var(--v2-muted)]
        [&[data-priority=High]_>_span]:[background:var(--v2-warning)]
        [&[data-priority=Urgent]_>_span]:[background:var(--v2-warning)]
        [@container_workspace_(max-width:850px)]:col-2 [@container_workspace_(max-width:850px)]:row-2
        [@container_workspace_(max-width:850px)]:[justify-self:end]"
        data-priority={task.priority}
      >
        <span aria-hidden="true" />
        {t(`priority${task.priority}`)}
      </span>
      <div
        className="v2-task-due [@media(max-width:767px)]:self-center [@media(max-width:767px)]:min-h-[28px] inline-flex
        items-center gap-[6px] text-[var(--v2-muted)] text-[12px]
        [@container_workspace_(max-width:850px)]:row-3"
      >
        <CalendarIcon size={13} aria-hidden="true" />
        <span>{formattedDueDate}</span>
      </div>
      <div className="v2-task-row-actions flex justify-end self-center">
        {actions !== undefined ? actions : renderDefaultAction()}
      </div>
      {actionError && (
        <p
          className="v2-task-action-error col-[1_/_-1] text-[var(--v2-warning)] text-[12px]"
          role="alert"
        >
          {actionError}
        </p>
      )}
    </div>
  );
}
