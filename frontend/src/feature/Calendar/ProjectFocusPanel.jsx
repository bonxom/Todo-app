import { useMemo, useState } from 'react';
import { FolderKanban, Layers3, Plus, Sparkles } from 'lucide-react';
import TaskDetailButton from '../Todo/TaskDetailButton';
import DetailRequestModal from './DetailRequestModal';
import AddTaskModal from '../Dialog/AddTaskModal';
import CalendarTaskDetailCard from './CalendarTaskDetailCard';

const ProjectFocusPanel = ({
  projects,
  selectedProjectIds,
  onToggleProject,
  onSelectAllProjects,
  onClearProjects,
  selectedDate,
  tasks,
  onTaskUpdated,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  const selectedProjectSet = useMemo(() => new Set(selectedProjectIds), [selectedProjectIds]);

  const totals = useMemo(() => ({
    totalTasks: tasks.length,
    completedTasks: tasks.filter((task) => task.status === 'completed').length,
  }), [tasks]);

  const hasSelection = selectedProjectIds.length > 0;

  return (
    <aside className="flex h-full flex-col gap-5 rounded-[2rem] border border-gray-200 bg-white p-5 shadow-lg">
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

      <div className="rounded-[1.7rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-600">Project Focus</p>
            <h2 className="mt-2 text-xl font-semibold text-gray-900">Choose workstreams</h2>
            <p className="mt-2 text-sm text-gray-600">
              Pick one or more projects, then inspect exactly what is due on the selected day.
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
            <FolderKanban className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSelectAllProjects}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-sky-200 bg-white px-4 text-sm font-medium text-sky-700 transition-all hover:border-sky-300 hover:bg-sky-50"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={onClearProjects}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-sky-600" />
              <p className="text-sm font-semibold text-gray-900">Projects</p>
            </div>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
              {selectedProjectIds.length} selected
            </span>
          </div>

          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {projects.length > 0 ? projects.map((project) => {
              const isSelected = selectedProjectSet.has(project._id);
              const scheduledCount = project.scheduledCount || 0;
              const selectedDayCount = project.selectedDayCount || 0;

              return (
                <button
                  key={project._id}
                  type="button"
                  onClick={() => onToggleProject(project._id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                    isSelected
                      ? 'border-sky-300 bg-sky-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-sky-200 hover:bg-sky-50/60'
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{project.name}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {project.description || 'No project description yet.'}
                      </p>
                    </div>
                    <span className={`mt-0.5 h-5 w-5 rounded-md border text-xs font-bold ${
                      isSelected
                        ? 'border-sky-500 bg-sky-500 text-white'
                        : 'border-gray-300 bg-white text-transparent'
                    }`}>
                      ✓
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-gray-700 shadow-sm">
                      {scheduledCount} scheduled
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-sky-700 shadow-sm">
                      {selectedDayCount} on selected day
                    </span>
                  </div>
                </button>
              );
            }) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-8 text-center">
                <p className="text-sm font-semibold text-gray-900">No projects available</p>
                <p className="mt-1 text-xs text-gray-500">Create a project from the Todo or Categories pages first.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col rounded-[1.7rem] border border-gray-100 bg-gray-50/70 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Selected day</p>
              <p className="mt-1 text-xs text-gray-500">
                {selectedDate
                  ? selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                  : 'Pick a day on the calendar'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddTaskModalOpen(true)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 text-sm font-medium text-white shadow-md transition-all hover:from-sky-700 hover:to-cyan-700"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(true)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 text-sm font-medium text-white shadow-md transition-all hover:from-emerald-600 hover:to-teal-700"
              >
                <Sparkles className="h-4 w-4" />
                Generate
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span className="text-gray-600">
              Total: <span className="font-semibold text-gray-900">{totals.totalTasks}</span>
            </span>
            <span className="text-emerald-700">
              Completed: <span className="font-semibold">{totals.completedTasks}</span>
            </span>
          </div>

          <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {!hasSelection ? (
              <div className="flex h-full flex-col items-center justify-center rounded-[1.6rem] border border-dashed border-sky-200 bg-white px-5 py-10 text-center">
                <p className="text-lg font-semibold text-gray-900">Select one or more projects</p>
                <p className="mt-2 text-sm text-gray-500">
                  Project Focus only shows tasks that belong to the selected project set.
                </p>
              </div>
            ) : tasks.length > 0 ? (
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
              <div className="flex h-full flex-col items-center justify-center rounded-[1.6rem] border border-dashed border-gray-200 bg-white px-5 py-10 text-center">
                <p className="text-lg font-semibold text-gray-900">No tasks due on this day</p>
                <p className="mt-2 text-sm text-gray-500">
                  Your selected projects have no scheduled work for this exact date.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        onTaskCreated={onTaskUpdated}
        initialDueDate={selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : ''}
      />

      <DetailRequestModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        selectedDate={selectedDate}
        onTasksGenerated={onTaskUpdated}
      />
    </aside>
  );
};

export default ProjectFocusPanel;
