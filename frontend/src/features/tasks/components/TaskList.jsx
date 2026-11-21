import { useTranslation } from "react-i18next";
import TodoTaskCard from "./TodoTaskCard";
import { ListTodo, Plus, Search } from "lucide-react";
import { useTransitionTasks } from "../hooks/useTransitionTasks";

const TaskList = ({
  tasks,
  isLoading = false,
  emptyState = null,
  onAccept,
  onReject,
  onComplete,
  onGiveUp,
  onRestore,
  onEdit,
  onDelete,
  onClearFilters,
  onAddTask,
}) => {
  const { t } = useTranslation("workspace");

  const visibleTasks = useTransitionTasks(tasks);
  if (isLoading) {
    return (
      <div
        className="space-y-3"
        aria-live="polite"
        aria-label={t("loadingTasks")}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse ui-section-card rounded-[14px]"
          />
        ))}
      </div>
    );
  }

  if (visibleTasks.length === 0) {
    return (
      <div className="todo-empty-state text-center p-[50px_var(--space-5)] [&_>_p:first-of-type]:text-[1.25rem] [&_>_p:first-of-type]:[font-weight:650] [@media(max-width:520px)]:px-[1.125rem]">
        <span
          className="todo-empty-icon w-[65px] h-[65px] grid place-items-center [border:1px_solid_var(--color-line)]
          rounded-[var(--radius-xl)] [background:var(--color-accent-soft)] text-[var(--color-accent)]
          m-[0_auto_1.375rem] [transform:rotate(-7deg)]"
        >
          {emptyState?.isFiltered ? (
            <Search size={28} />
          ) : (
            <ListTodo size={28} />
          )}
        </span>
        <p className="text-base font-semibold text-[var(--color-text)]">
          {emptyState?.title || "No tasks found"}
        </p>
        <p className="mt-2 text-sm text-[var(--color-text-muted)] max-w-md mx-auto">
          {emptyState?.description || "Add a new task to get started."}
        </p>
        {!emptyState?.isFiltered && onAddTask && (
          <button
            type="button"
            className="ui-btn-primary mt-5"
            onClick={onAddTask}
          >
            <Plus size={16} />
            {t("addYourFirstTask")}
          </button>
        )}
        {emptyState?.isFiltered && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="ui-btn-secondary mt-4 cursor-pointer"
          >
            {t("clearAllFilters")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="todo-task-list">
      {visibleTasks.map((task) => (
        <TodoTaskCard
          key={task._id || task.id}
          task={task}
          onAccept={onAccept}
          onReject={onReject}
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
