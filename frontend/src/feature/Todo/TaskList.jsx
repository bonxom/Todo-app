import TaskItem from './TaskItem';

const TaskList = ({
  tasks,
  isLoading = false,
  emptyState = null,
  onToggleComplete,
  onEdit,
  onStart,
  onGiveUp,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-[1.75rem] border border-gray-200 bg-white/80 shadow-sm" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-gray-200 bg-white/80 p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-gray-900">
          {emptyState?.title || 'No tasks found'}
        </p>
        <p className="mt-2 text-sm text-gray-500">
          {emptyState?.description || 'Add a new task to get started.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <TaskItem
          key={task._id || task.id}
          task={task}
          onToggleComplete={onToggleComplete}
          onEdit={onEdit}
          onStart={onStart}
          onGiveUp={onGiveUp}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default TaskList;
