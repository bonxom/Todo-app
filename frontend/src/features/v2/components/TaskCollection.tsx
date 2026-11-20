import { useTranslation } from "react-i18next";
import { AlertCircle, RefreshCw, Inbox, SearchX, Plus } from "lucide-react";
import TaskRow from "./TaskRow";
import GlassPanel from "./GlassPanel";
import type { Task } from "@/shared/types/domain";

export interface TaskCollectionProps {
  tasks?: Task[];
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  onRetry: () => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  onOpenTask: (taskId: string) => void;
  onCreate?: () => void;
  renderActions?: (task: Task) => React.ReactNode;
}

export default function TaskCollection({
  tasks,
  isLoading,
  isError,
  error,
  onRetry,
  onClearFilters,
  hasActiveFilters,
  onOpenTask,
  renderActions,
  onCreate,
}: TaskCollectionProps) {
  const { t } = useTranslation("v2");

  if (isLoading) {
    return (
      <div aria-busy="true" aria-label="Loading tasks" className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-[var(--v2-surface-solid)] border border-[var(--v2-border)] animate-pulse space-y-3"
          >
            <div className="flex gap-2">
              <div className="h-4 w-20 rounded bg-[var(--v2-muted)]/20" />
              <div className="h-4 w-12 rounded bg-[var(--v2-muted)]/20" />
            </div>
            <div className="h-5 w-2/3 rounded bg-[var(--v2-muted)]/20" />
            <div className="h-3 w-28 rounded bg-[var(--v2-muted)]/20" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <GlassPanel className="p-8 text-center space-y-4">
        <div className="inline-flex p-3 rounded-full bg-red-500/10 text-red-500">
          <AlertCircle size={28} aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-[var(--v2-ink)]">
            {t("errorLoadingTasks")}
          </h3>
          <p className="text-sm text-[var(--v2-muted)] mt-1">
            {error?.message || "Failed to fetch task list."}
          </p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="v2-btn v2-btn-primary [&:hover]:filter-[brightness(1.08)] inline-flex items-center gap-2"
        >
          <RefreshCw size={15} aria-hidden="true" />
          <span>{t("retry")}</span>
        </button>
      </GlassPanel>
    );
  }

  if (!tasks || tasks.length === 0) {
    if (hasActiveFilters) {
      return (
        <GlassPanel className="p-8 text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-[var(--v2-accent)]/10 text-[var(--v2-accent)]">
            <SearchX size={28} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--v2-ink)]">
              {t("noMatchingTasks")}
            </h3>
            <p className="text-sm text-[var(--v2-muted)] mt-1">
              {t("noMatchingDescription")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClearFilters}
            className="v2-btn v2-btn-primary [&:hover]:filter-[brightness(1.08)] inline-flex items-center gap-2"
          >
            <span>{t("clearFilters")}</span>
          </button>
        </GlassPanel>
      );
    }

    return (
      <GlassPanel className="p-8 text-center space-y-4">
        <div className="inline-flex p-3 rounded-full bg-[var(--v2-accent)]/10 text-[var(--v2-accent)]">
          <Inbox size={28} aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-[var(--v2-ink)]">
            {t("noTasksYet")}
          </h3>
          <p className="text-sm text-[var(--v2-muted)] mt-1">
            {t("noTasksDescription")}
          </p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="v2-btn v2-btn-primary [&:hover]:filter-[brightness(1.08)] inline-flex items-center gap-2"
        >
          <span>{t("newTask")}</span>
          <Plus size={15} aria-hidden="true" />
        </button>
      </GlassPanel>
    );
  }

  return (
    <>
      <div
        className="v2-task-columns grid grid-cols-[minmax(170px,1fr)_126px_90px_100px_100px] items-center gap-x-[16px]
        p-[12px_4px] [border-bottom:1px_solid_var(--v2-border)] text-[var(--v2-muted)] text-[11px] [font-weight:600]
        [@container_workspace_(max-width:850px)]:[display:none]"
        aria-hidden="true"
      >
        <span>{t("title")}</span>
        <span>{t("status")}</span>
        <span>{t("priority")}</span>
        <span>{t("dueDate")}</span>
        <span />
      </div>
      <div className="v2-task-list flex flex-col" role="list">
        {tasks.map((task) => (
          <TaskRow
            key={task._id || task.id}
            task={task}
            onOpen={onOpenTask}
            actions={renderActions?.(task)}
          />
        ))}
      </div>
    </>
  );
}
