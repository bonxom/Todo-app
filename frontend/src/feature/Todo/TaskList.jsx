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
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse ui-section-card" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="ui-section-card border-dashed px-6 py-10 text-center">
        <p className="text-base font-semibold text-[var(--color-text)]">
          {emptyState?.title || 'No tasks found'}
        </p>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {emptyState?.description || 'Add a new task to get started.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
