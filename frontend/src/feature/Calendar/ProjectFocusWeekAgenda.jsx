import { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Plus, Sparkles } from 'lucide-react';
import TaskDetailButton from '../Todo/TaskDetailButton';
import CalendarTaskDetailCard from './CalendarTaskDetailCard';
import { formatDateTime } from '../../utils/dateTime';
import { sortTasksByDueTime } from './calendarUtils';

const ProjectFocusWeekAgenda = ({
  selectedDate,
  tasks,
  selectedProjectCount = 0,
  onTaskUpdated,
  onAddTask,
  onGenerateTasks,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const summary = useMemo(() => {
    const completed = tasks.filter((task) => task.status === 'completed').length;
    const total = tasks.length;

    return {
      completed,
      total,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [tasks]);
  const sortedTasks = useMemo(() => sortTasksByDueTime(tasks), [tasks]);

  return (
    <section className="ui-section-card overflow-hidden">
      <TaskDetailButton
        isOpen={isEditModalOpen}
        task={selectedTask}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTask(null);
        }}
        onTaskUpdated={onTaskUpdated}
        onProjectCreated={onTaskUpdated}
      />

      <div className="border-b border-[var(--color-line)] px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-accent)]">
                {selectedProjectCount > 0 ? 'Filtered Day' : 'All Tasks Day'}
              </p>
              <h3 className="mt-1 text-xl font-semibold text-[var(--color-text)]">
                {selectedDate ? formatDateTime(selectedDate) : 'Pick a day from the week strip'}
              </h3>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Tasks stay sorted by time so the day reads from earliest due item to latest.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-wrap gap-2">
              <span className="ui-chip ui-tabular">{summary.completed}/{summary.total} complete</span>
              <span className="ui-chip ui-tabular">{summary.completionRate}% completion</span>
              {selectedProjectCount > 0 ? (
                <span className="ui-chip ui-tabular">
                  {selectedProjectCount} filtered project{selectedProjectCount > 1 ? 's' : ''}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onAddTask}
                className="ui-btn-secondary ui-focus-ring"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add Task
              </button>
              <button
                type="button"
                onClick={onGenerateTasks}
                className="ui-btn-tertiary ui-focus-ring"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Generate
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        {sortedTasks.length > 0 ? (
          sortedTasks.map((task) => (
            <CalendarTaskDetailCard
              key={task._id || task.id}
              task={task}
              mode="panel"
              onClick={(clickedTask) => {
                setSelectedTask(clickedTask);
                setIsEditModalOpen(true);
              }}
              onTaskUpdated={onTaskUpdated}
            />
          ))
        ) : (
          <div className="rounded-[16px] border border-dashed border-[var(--color-line)] bg-[var(--color-surface-muted)] px-5 py-10 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-[var(--color-text-muted)]" aria-hidden="true" />
            <p className="mt-4 text-lg font-semibold text-[var(--color-text)]">No tasks scheduled for this day</p>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              {selectedProjectCount > 0
                ? 'The selected projects have no due tasks on this exact day.'
                : 'No standalone or project tasks are due on this exact day.'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProjectFocusWeekAgenda;
