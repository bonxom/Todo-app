import { useTranslation } from "react-i18next";
import { Circle, CircleCheck, Play, Check } from "lucide-react";
import {
  useFinishTaskMutation,
  useStartTaskMutation,
} from "@/features/tasks/api/taskMutations";
import { setTaskDragData } from "@/shared/utils/taskDrag";
import { getApiErrorMessage } from "@/shared/services/apiError";

const CategoryTaskPreview = ({ task, onOpen, onTaskUpdated }) => {
  const { t } = useTranslation("workspace");

  const start = useStartTaskMutation();
  const finish = useFinishTaskMutation();
  const completed = task.status === "completed";
  const pending = task.status === "pending";
  const actionable = pending || task.status === "in-progress";
  const busy = start.isPending || finish.isPending;
  const update = async () => {
    try {
      await (pending ? start : finish).mutateAsync(task._id || task.id);
      onTaskUpdated?.();
    } catch (error) {
      alert(getApiErrorMessage(error, t("unableToUpdateTaskPleaseTryAgain")));
    }
  };

  return (
    <div className="category-task-preview-row flex items-center gap-[6px] [&_.category-task-row]:min-w-[0] [&_.category-task-row]:flex-1">
      <button
        type="button"
        className="category-task-row flex items-center w-full gap-[9px] p-[8px_0] text-left cursor-pointer
          [&_>_span:last-child]:overflow-hidden [&_>_span:last-child]:whitespace-nowrap
          [&_>_span:last-child]:text-ellipsis [&_>_span:first-child]:shrink-0"
        onClick={() => onOpen(task)}
        draggable
        onDragStart={(event) => setTaskDragData(event, task)}
        aria-label={t("messages.openTaskV0", { v0: task.title })}
      >
        <span className={completed ? "category-task-done" : ""}>
          {completed ? <CircleCheck size={15} /> : <Circle size={15} />}
        </span>
        <span>{task.title}</span>
      </button>
      {actionable && (
        <button
          type="button"
          className="category-task-action w-[30px] h-[30px] shrink-0 grid place-items-center rounded-[6px] cursor-pointer
            [&:hover]:[background:var(--color-accent-soft)] [&:disabled]:opacity-[0.5] [&:disabled]:cursor-wait"
          onClick={update}
          disabled={busy}
          aria-label={t("messages.v0TaskV1", {
            v0: pending ? t("start") : t("finish"),
            v1: task.title,
          })}
          title={pending ? t("startTask") : t("completeTask")}
        >
          {pending ? <Play size={13} /> : <Check size={15} />}
        </button>
      )}
    </div>
  );
};

export default CategoryTaskPreview;
