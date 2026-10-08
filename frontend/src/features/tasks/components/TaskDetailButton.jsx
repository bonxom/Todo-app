import FormDialog from "@/shared/components/FormDialog";
import { CircleDot } from "lucide-react";
import TaskDetailForm from "./Form/TaskDetailForm";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    badgeClass:
      "border-transparent bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
  },
  "in-progress": {
    label: "In Progress",
    badgeClass:
      "border-transparent bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
  },
  completed: {
    label: "Completed",
    badgeClass:
      "border-transparent bg-[var(--color-success-soft)] text-[var(--color-success)]",
  },
  "given-up": {
    label: "Given Up",
    badgeClass:
      "border-transparent bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
  },
};

const TaskDetailButton = ({
  isOpen,
  task,
  onClose,
  onTaskUpdated,
  onProjectCreated,
}) => {
  if (!isOpen || !task) return null;
  const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  return (
    <FormDialog title="Edit Task" kind="task" onClose={onClose}>
      <div className="mb-5">
        <span
          className={`inline-flex items-center gap-2 rounded-md px-3 py-1 text-xs ${status.badgeClass}`}
        >
          <CircleDot size={13} aria-hidden="true" />
          {status.label}
        </span>
      </div>
      <TaskDetailForm
        task={task}
        onClose={onClose}
        onTaskUpdated={onTaskUpdated}
        onProjectCreated={onProjectCreated}
      />
    </FormDialog>
  );
};
export default TaskDetailButton;
