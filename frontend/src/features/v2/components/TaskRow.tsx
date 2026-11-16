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
          className="v2-btn v2-btn-primary text-xs py-1.5 px-3 min-h-0"
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
          className="v2-btn text-xs py-1.5 px-3 min-h-0 text-green-600 border-green-500/30 hover:border-green-500 hover:bg-green-500/10 font-medium"
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
    <div className="v2-task-row" role="listitem">
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status badge */}
          <span
            data-status={task.status}
            className={`v2-status inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              task.status === "completed"
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : task.status === "in-progress"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : task.status === "given-up"
                    ? "bg-gray-500/10 text-gray-500 dark:text-gray-400"
                    : "bg-[var(--v2-accent)]/10 text-[var(--v2-accent)]"
            }`}
          >
            <StatusIcon size={12} aria-hidden="true" />
            <span>
              {t(
                task.status === "in-progress"
                  ? "inProgress"
                  : task.status === "given-up"
                    ? "givenUp"
                    : task.status,
              )}
            </span>
          </span>

          {/* Priority */}
          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 text-[var(--v2-muted)]">
            {t(`priority${task.priority}`)}
          </span>

          {/* Project tag */}
          {projectName && (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--v2-muted)]">
              <FolderKanban size={12} aria-hidden="true" />
              <span>{projectName}</span>
            </span>
          )}

          {/* Category tag */}
          {categoryName && (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--v2-muted)]">
              <Tag size={12} aria-hidden="true" />
              <span>{categoryName}</span>
            </span>
          )}
        </div>

        {/* Task Title */}
        <button
          type="button"
          onClick={() => onOpen(taskId)}
          className="v2-task-title"
        >
          {task.title}
        </button>

        {/* Due date */}
        <div className="flex items-center gap-1.5 text-xs text-[var(--v2-muted)]">
          <CalendarIcon size={12} aria-hidden="true" />
          <span>{formattedDueDate}</span>
        </div>

        {/* Inline action error */}
        {actionError && (
          <p className="text-xs text-red-500 font-medium pt-1">{actionError}</p>
        )}
      </div>

      {/* Action buttons slot */}
      <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
        {actions !== undefined ? actions : renderDefaultAction()}
      </div>
    </div>
  );
}
