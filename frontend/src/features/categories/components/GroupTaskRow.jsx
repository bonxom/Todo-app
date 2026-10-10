import TodoTaskCard from "@/features/tasks/components/TodoTaskCard";
import {
  useDeleteTaskMutation,
  useFinishTaskMutation,
  useRestoreTaskMutation,
  useStartTaskMutation,
} from "@/features/tasks/api/taskMutations";
import { getApiErrorMessage } from "@/shared/services/apiError";

// Adapt category mutations to the same task card used by Dashboard and Calendar.
export default function GroupTaskRow({
  task,
  onEdit,
  onDelete,
  onGiveUp,
  onTaskUpdated,
}) {
  const start = useStartTaskMutation();
  const finish = useFinishTaskMutation();
  const restore = useRestoreTaskMutation();
  const remove = useDeleteTaskMutation();
  const update = async (mutation, taskId) => {
    try {
      await mutation.mutateAsync(taskId);
      onTaskUpdated?.();
    } catch (error) {
      alert(getApiErrorMessage(error, "Unable to update task."));
    }
  };
  return (
    <li>
      <TodoTaskCard
        task={task}
        onAccept={(id) => update(start, id)}
        onComplete={(id) => update(finish, id)}
        onRestore={(id) => update(restore, id)}
        onReject={(id) => update(remove, id)}
        onEdit={onEdit}
        onDelete={onDelete}
        onGiveUp={onGiveUp}
      />
    </li>
  );
}
