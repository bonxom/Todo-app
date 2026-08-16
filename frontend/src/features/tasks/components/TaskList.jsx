import TodoTaskCard from './TodoTaskCard';

const TaskList = ({
  tasks,
  isLoading = false,
  emptyState = null,
  onAccept,
  onDeny,
  onComplete,
  onGiveUp,
  onRestore,
  onEdit,
  onDelete,
  onClearFilters,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3" aria-live="polite" aria-label="Loading tasks">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse ui-section-card rounded-[14px]" />
        ))}
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="ui-section-card border-dashed px-6 py-12 text-center">
        <p className="text-base font-semibold text-[var(--color-text)]">
          {emptyState?.title || 'No tasks found'}
        </p>
        <p className="mt-2 text-sm text-[var(--color-text-muted)] max-w-md mx-auto">
          {emptyState?.description || 'Add a new task to get started.'}
        </p>
        {emptyState?.isFiltered && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="ui-btn-secondary mt-4 cursor-pointer"
          >
            Clear all filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TodoTaskCard
          key={task._id || task.id}
          task={task}
          onAccept={onAccept}
          onDeny={onDeny}
          onComplete={onComplete}
          onGiveUp={onGiveUp}
          onRestore={onRestore}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default TaskList;
