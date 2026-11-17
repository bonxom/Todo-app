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
      <div className="v2-task-identity">
        <button
          type="button"
          onClick={() => onOpen(taskId)}
          className="v2-task-title"
        >
          {task.title}
        </button>
        {(projectName || categoryName) && (
          <div className="v2-task-context">
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
      <span className="v2-task-priority" data-priority={task.priority}>
        <span aria-hidden="true" />
        {t(`priority${task.priority}`)}
      </span>
      <div className="v2-task-due">
        <CalendarIcon size={13} aria-hidden="true" />
        <span>{formattedDueDate}</span>
      </div>
      <div className="v2-task-row-actions">
        {actions !== undefined ? actions : renderDefaultAction()}
      </div>
      {actionError && (
        <p className="v2-task-action-error" role="alert">
          {actionError}
        </p>
      )}
    </div>
  );
}
