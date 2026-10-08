import {
  Check,
  Circle,
  CircleCheck,
  CircleDot,
  Flag,
  Pencil,
  Play,
  Trash2,
} from "lucide-react";
import {
  useFinishTaskMutation,
  useStartTaskMutation,
} from "@/features/tasks/api/taskMutations";
import { getApiErrorMessage } from "@/shared/services/apiError";

const STATUS = {
  pending: { label: "Pending", Icon: Circle },
  "in-progress": { label: "In progress", Icon: CircleDot },
  completed: { label: "Completed", Icon: CircleCheck },
  "given-up": { label: "Given up", Icon: Flag },
};
const dateFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default function GroupTaskRow({
  task,
  onEdit,
  onDelete,
  onGiveUp,
  onTaskUpdated,
}) {
  const start = useStartTaskMutation();
  const finish = useFinishTaskMutation();
  const { label, Icon } = STATUS[task.status] || STATUS.pending;
  const terminal = ["completed", "given-up"].includes(task.status);
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const validDate = due && !Number.isNaN(due.getTime());
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = !terminal && validDate && due < today;
  const update = async () => {
    try {
      await (task.status === "pending" ? start : finish).mutateAsync(task._id);
      onTaskUpdated?.();
    } catch (error) {
      alert(getApiErrorMessage(error, "Unable to update task."));
    }
  };
  return (
    <li className="group-task-row" data-status={task.status}>
      <span className="group-task-state" title={label}>
        <Icon size={18} />
      </span>
      <div className="group-task-content">
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="group-task-title"
        >
          {task.title}
        </button>
        <div className="group-task-meta">
          <span>{label}</span>
          {validDate && (
            <span className={overdue ? "group-task-overdue" : ""}>
              {overdue ? "Overdue · " : "Due "}
              {dateFormat.format(due)}
            </span>
          )}
        </div>
      </div>
      <span
        className={`group-task-priority group-task-priority--${task.priority?.toLowerCase()}`}
      >
        {task.priority || "Medium"}
      </span>
      <div className="group-task-actions">
        {!terminal && (
          <button
            type="button"
            disabled={start.isPending || finish.isPending}
            onClick={update}
            aria-label={`${task.status === "pending" ? "Start" : "Complete"} ${task.title}`}
            title={task.status === "pending" ? "Start task" : "Complete task"}
          >
            {task.status === "pending" ? (
              <Play size={15} />
            ) : (
              <Check size={17} />
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => onEdit(task)}
          aria-label={`Edit ${task.title}`}
          title="Edit task"
        >
          <Pencil size={15} />
        </button>
        {task.status === "in-progress" && (
          <button
            type="button"
            onClick={() => onGiveUp(task._id)}
            aria-label={`Give up ${task.title}`}
            title="Give up task"
          >
            <Flag size={15} />
          </button>
        )}
        <button
          type="button"
          className="group-task-delete"
          onClick={() => onDelete(task._id)}
          aria-label={`Delete ${task.title}`}
          title="Delete task"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </li>
  );
}
