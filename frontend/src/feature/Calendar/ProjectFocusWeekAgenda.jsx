import { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2 } from 'lucide-react';
import TaskDetailButton from '../Todo/TaskDetailButton';
import CalendarTaskDetailCard from './CalendarTaskDetailCard';
import { formatDateTime } from '../../utils/dateTime';

const ProjectFocusWeekAgenda = ({ selectedDate, tasks, selectedProjectCount = 0, onTaskUpdated }) => {
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

  return (
    <section className="overflow-hidden rounded-[2rem] border border-amber-300 bg-gradient-to-br from-amber-50 via-white to-rose-50 shadow-sm">
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

      <div className="border-b border-amber-200 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
                {selectedProjectCount > 0 ? 'Filtered Day' : 'All Tasks Day'}
              </p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">
                {selectedDate ? formatDateTime(selectedDate) : 'Pick a day from the week strip'}
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span>{summary.completed}/{summary.total}</span>
            <span>&middot;</span>
            <span>{summary.completionRate}% complete</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        {tasks.length > 0 ? (
          tasks.map((task) => (
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
          <div className="rounded-[1.5rem] border border-dashed border-amber-300 bg-white/80 px-5 py-10 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-amber-400" />
            <p className="mt-4 text-lg font-semibold text-slate-900">No tasks scheduled for this day</p>
            <p className="mt-2 text-sm text-slate-500">
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
