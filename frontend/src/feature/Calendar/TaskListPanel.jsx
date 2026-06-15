import { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronDown, Plus, Sparkles } from 'lucide-react';
import TaskDetailButton from '../Todo/TaskDetailButton';
import TaskListDetailModal from './TaskListDetailModal';
import DetailRequestModal from './DetailRequestModal';
import AddTaskModal from '../Dialog/AddTaskModal';
import CalendarTaskDetailCard from './CalendarTaskDetailCard';
import { formatDateTime, toMidnightDateTimeLocalValue } from '../../utils/dateTime';

const TaskListPanel = ({ selectedDate, tasks, onTaskUpdated, summaryOnly = false }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const isToday = selectedDate && selectedDate.toDateString() === today.toDateString();

  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityOrder = { High: 0, Medium: 1, Low: 2 };
    const statusOrder = { 'in-progress': 0, pending: 1, completed: 2, 'given-up': 3 };

    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    return statusOrder[a.status] - statusOrder[b.status];
  });

  const MAX_DISPLAY_TASKS = 4;
  const displayTasks = sortedTasks.slice(0, MAX_DISPLAY_TASKS);
  const hasMore = sortedTasks.length > MAX_DISPLAY_TASKS;

  return (
    <div className="ui-section-card flex h-full flex-col p-6">
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

      <TaskListDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        selectedDate={selectedDate}
        tasks={sortedTasks}
        onTaskUpdated={onTaskUpdated}
        summaryOnly={summaryOnly}
      />

      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-5 w-5 text-[var(--color-accent)]" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-[var(--color-text)]">
              {isToday ? 'Today\'s Tasks' : 'Day Detail'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddTaskModalOpen(true)}
              className="ui-btn-primary !min-h-[2.25rem] !px-3 !text-sm"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsGenerateModalOpen(true)}
              className="ui-btn-secondary !min-h-[2.25rem] !px-3 !text-sm"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Generate
            </button>
          </div>
        </div>

        {selectedDate && (
          <p className="text-sm text-[var(--color-text-muted)]">
            {formatDateTime(selectedDate)}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <span className="ui-chip ui-tabular">Total: {tasks.length}</span>
          {tasks.filter((task) => task.status === 'in-progress').length > 0 && (
            <span className="ui-chip ui-chip--accent ui-tabular">
              In Progress: {tasks.filter((task) => task.status === 'in-progress').length}
            </span>
          )}
          {tasks.filter((task) => task.status === 'pending').length > 0 && (
            <span className="ui-chip ui-tabular">
              Pending: {tasks.filter((task) => task.status === 'pending').length}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {tasks.length > 0 ? (
          <>
            {displayTasks.map((task) => (
              <CalendarTaskDetailCard
                key={task._id || task.id}
                task={task}
                mode="panel"
                summaryOnly={summaryOnly}
                onClick={(clickedTask) => {
                  setSelectedTask(clickedTask);
                  setIsEditModalOpen(true);
                }}
                onTaskUpdated={onTaskUpdated}
              />
            ))}

            {hasMore ? (
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line)] p-3 text-sm font-medium text-[var(--color-accent)] transition-[background-color,border-color,color] duration-150 hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
              >
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
                <span>View all tasks</span>
              </button>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarIcon className="mb-3 h-12 w-12 text-[var(--color-text-muted)] opacity-40" aria-hidden="true" />
            <p className="text-base font-medium text-[var(--color-text)]">No tasks for this day</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {isToday ? 'You are all caught up.' : 'Select another date to view its exact-day workload.'}
            </p>
          </div>
        )}
      </div>

      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        onTaskCreated={onTaskUpdated}
        initialDueDate={selectedDate ? toMidnightDateTimeLocalValue(selectedDate) : ''}
      />

      <DetailRequestModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        selectedDate={selectedDate}
        onTasksGenerated={onTaskUpdated}
      />
    </div>
  );
};

export default TaskListPanel;
