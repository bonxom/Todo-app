import { useState } from "react";
import TaskEditor from "./TaskEditor";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  FolderKanban,
  Tag,
  AlertCircle,
  Pencil,
  Clock,
  CheckCircle2,
  Circle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import V2Dialog from "./V2Dialog";
import { useTaskQuery } from "@/features/tasks/api/taskQueries";
import { getLocale } from "@/shared/i18n";
import type { Category, Project } from "@/shared/types/domain";

export interface TaskDetailsDialogProps {
  taskId: string;
  onClose: () => void;
}

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export default function TaskDetailsDialog({
  taskId,
  onClose,
}: TaskDetailsDialogProps) {
  const [editing, setEditing] = useState(false);
  const { t } = useTranslation("v2");
  const isValidId = OBJECT_ID_REGEX.test(taskId);

  const {
    data: task,
    isLoading,
    isError,
    error,
    refetch,
  } = useTaskQuery(taskId, {
    enabled: isValidId,
    retry: false,
  });

  const projectName =
    task && typeof task.projectId === "object" && task.projectId !== null
      ? (task.projectId as Project).name
      : undefined;

  const categoryName =
    task && typeof task.categoryId === "object" && task.categoryId !== null
      ? (task.categoryId as Category).name
      : undefined;

  let formattedDueDate = t("noDueDate");
  if (task?.dueDate) {
    try {
      formattedDueDate = new Intl.DateTimeFormat(getLocale(), {
        dateStyle: "medium",
        timeStyle: "short",
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

  const StatusIcon = task?.status ? statusIcons[task.status] || Circle : Circle;

  // Determine error status code if available
  const statusCode =
    error && "status" in error && typeof error.status === "number"
      ? error.status
      : undefined;

  const isUnavailable = !isValidId || statusCode === 403 || statusCode === 404;

  if (editing && task)
    return (
      <TaskEditor
        task={task}
        onCancel={() => setEditing(false)}
        onSaved={() => setEditing(false)}
      />
    );

  return (
    <V2Dialog
      open={Boolean(taskId)}
      title={task?.title || t("taskDetails")}
      onClose={onClose}
    >
      {!isValidId || isUnavailable ? (
        <div className="py-6 text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-amber-500/10 text-amber-500">
            <AlertCircle size={28} aria-hidden="true" />
          </div>
          <p className="text-sm text-[var(--v2-muted)]">
            {t("taskUnavailable")}
          </p>
        </div>
      ) : isLoading ? (
        <div aria-busy="true" className="space-y-4 py-4 animate-pulse">
          <div className="h-6 w-3/4 rounded bg-[var(--v2-muted)]/20" />
          <div className="h-16 w-full rounded bg-[var(--v2-muted)]/20" />
          <div className="h-4 w-1/2 rounded bg-[var(--v2-muted)]/20" />
        </div>
      ) : isError ? (
        <div className="py-6 text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-red-500/10 text-red-500">
            <AlertCircle size={28} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--v2-ink)]">
              {t("errorLoadingTask")}
            </p>
            <p className="text-xs text-[var(--v2-muted)] mt-1">
              {error?.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="v2-btn v2-btn-primary inline-flex items-center gap-1.5"
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>{t("retry")}</span>
          </button>
        </div>
      ) : task ? (
        <div className="space-y-5 py-2">
          {/* Status & Priority header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                task.status === "completed"
                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                  : task.status === "in-progress"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : task.status === "given-up"
                      ? "bg-gray-500/10 text-gray-500 dark:text-gray-400"
                      : "bg-[var(--v2-accent)]/10 text-[var(--v2-accent)]"
              }`}
            >
              <StatusIcon size={13} aria-hidden="true" />
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

            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 text-[var(--v2-muted)]">
              {t("priority")}: {t(`priority${task.priority}`)}
            </span>
          </div>

          {/* Description */}
          {task.description && (
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 text-sm text-[var(--v2-ink)] leading-relaxed whitespace-pre-wrap">
              {task.description}
            </div>
          )}

          {/* Metadata rows */}
          <div className="space-y-2.5 text-xs text-[var(--v2-muted)] border-t border-[var(--v2-border)] pt-4">
            <div className="flex items-center gap-2">
              <Calendar size={14} aria-hidden="true" />
              <span className="font-medium text-[var(--v2-ink)]">
                {t("dueDate")}:
              </span>
              <span>{formattedDueDate}</span>
            </div>

            {projectName && (
              <div className="flex items-center gap-2">
                <FolderKanban size={14} aria-hidden="true" />
                <span className="font-medium text-[var(--v2-ink)]">
                  {t("project")}:
                </span>
                <span>{projectName}</span>
              </div>
            )}

            {categoryName && (
              <div className="flex items-center gap-2">
                <Tag size={14} aria-hidden="true" />
                <span className="font-medium text-[var(--v2-ink)]">
                  {t("category")}:
                </span>
                <span>{categoryName}</span>
              </div>
            )}
          </div>

          {/* Footer action */}
          <div className="pt-4 border-t border-[var(--v2-border)] flex justify-end">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="v2-btn text-xs py-2 px-3 text-[var(--v2-accent)] border-[var(--v2-accent)]/30 hover:border-[var(--v2-accent)] font-medium inline-flex items-center gap-1.5"
            >
              <span>{t("editTask")}</span>
              <Pencil size={13} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </V2Dialog>
  );
}
