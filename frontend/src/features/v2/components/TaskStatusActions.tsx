import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, CirclePlay, RotateCcw, Trash2, Undo2 } from "lucide-react";
import {
  useDeleteTaskMutation,
  useFinishTaskMutation,
  useGiveUpTaskMutation,
  useRestoreTaskMutation,
  useStartTaskMutation,
} from "@/features/tasks/api/taskMutations";
import type { Task } from "@/shared/types/domain";
import V2Dialog from "./V2Dialog";

export interface TaskStatusActionsProps {
  task: Task;
  compact?: boolean;
  onChanged?: () => void;
}

export default function TaskStatusActions({
  task,
  compact = false,
  onChanged,
}: TaskStatusActionsProps) {
  const { t } = useTranslation("v2");
  const startMutation = useStartTaskMutation();
  const finishMutation = useFinishTaskMutation();
  const giveUpMutation = useGiveUpTaskMutation();
  const restoreMutation = useRestoreTaskMutation();
  const deleteMutation = useDeleteTaskMutation();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pending =
    startMutation.isPending ||
    finishMutation.isPending ||
    giveUpMutation.isPending ||
    restoreMutation.isPending ||
    deleteMutation.isPending;

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorUpdatingTask"));
    }
  };

  const buttonClass = compact
    ? "v2-btn v2-task-action v2-task-action--compact"
    : "v2-btn v2-task-action";

  return (
    <div className="v2-task-actions" data-testid="v2-task-actions">
      <div className="v2-task-actions-row">
        {task.status === "pending" && (
          <button
            type="button"
            className={`${buttonClass} v2-task-action--accent`}
            disabled={pending}
            onClick={() => void run(() => startMutation.mutateAsync(task._id))}
          >
            <CirclePlay size={14} aria-hidden="true" />
            <span>{t("start")}</span>
          </button>
        )}

        {task.status === "in-progress" && (
          <button
            type="button"
            className={`${buttonClass} v2-task-action--accent`}
            disabled={pending}
            onClick={() => void run(() => finishMutation.mutateAsync(task._id))}
          >
            <Check size={14} aria-hidden="true" />
            <span>{t("finish")}</span>
          </button>
        )}

        {task.status === "completed" && (
          <button
            type="button"
            className={buttonClass}
            disabled={pending}
            onClick={() => void run(() => restoreMutation.mutateAsync(task._id))}
          >
            <Undo2 size={14} aria-hidden="true" />
            <span>{t("reopenTask")}</span>
          </button>
        )}

        {task.status === "given-up" && (
          <button
            type="button"
            className={buttonClass}
            disabled={pending}
            onClick={() => void run(() => restoreMutation.mutateAsync(task._id))}
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span>{t("restoreTask")}</span>
          </button>
        )}

        {(task.status === "pending" || task.status === "in-progress") && (
          <button
            type="button"
            className={buttonClass}
            disabled={pending}
            onClick={() => void run(() => giveUpMutation.mutateAsync(task._id))}
          >
            <span>{t("giveUp")}</span>
          </button>
        )}

        <button
          type="button"
          className={`${buttonClass} v2-task-action--danger`}
          disabled={pending}
          onClick={() => setConfirmDelete(true)}
          aria-label={t("deleteTask")}
        >
          <Trash2 size={14} aria-hidden="true" />
          {!compact && <span>{t("deleteTask")}</span>}
        </button>
      </div>

      {error && (
        <p className="v2-form-error" role="alert">
          {error}
        </p>
      )}

      <V2Dialog
        open={confirmDelete}
        title={t("deleteTask")}
        onClose={() => setConfirmDelete(false)}
      >
        <p>{t("deleteTaskPrompt")}</p>
        <div className="v2-form-actions">
          <button
            type="button"
            className="v2-btn"
            onClick={() => setConfirmDelete(false)}
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            className="v2-btn v2-btn-primary"
            disabled={deleteMutation.isPending}
            onClick={() =>
              void run(async () => {
                await deleteMutation.mutateAsync(task._id);
                setConfirmDelete(false);
              })
            }
          >
            {t("deleteTask")}
          </button>
        </div>
      </V2Dialog>
    </div>
  );
}
