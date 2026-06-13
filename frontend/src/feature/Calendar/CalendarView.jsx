import { useMemo, useState } from 'react';
import { FolderPlus, Plus, Sparkles } from 'lucide-react';
import CalendarGrid from './CalendarGrid';
import ProjectFocusPanel from './ProjectFocusPanel';
import ProjectFocusWeekAgenda from './ProjectFocusWeekAgenda';
import DetailRequestModal from './DetailRequestModal';
import AddTaskModal from '../Dialog/AddTaskModal';
import AddProjectForm from '../Todo/Form/AddProjectForm';
import { addDays, getDateKey, groupTasksByDate, startOfDay } from './calendarUtils';
import { toMidnightDateTimeLocalValue } from '../../utils/dateTime';

const getProjectId = (task) => task.projectId?._id || task.projectId || null;

const CalendarView = ({ tasks, projects, onTaskUpdated }) => {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [viewMode, setViewMode] = useState('week');
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);

  const validSelectedProjectIds = useMemo(
    () => selectedProjectIds.filter((projectId) => projects.some((project) => project._id === projectId)),
    [projects, selectedProjectIds]
  );

  const filteredTasks = useMemo(() => {
    if (validSelectedProjectIds.length === 0) {
      return tasks;
    }

    const selectedSet = new Set(validSelectedProjectIds);
    return tasks.filter((task) => selectedSet.has(getProjectId(task)));
  }, [tasks, validSelectedProjectIds]);

  const allTasksByDate = useMemo(() => groupTasksByDate(tasks), [tasks]);
  const activeTasksByDate = useMemo(() => groupTasksByDate(filteredTasks), [filteredTasks]);

  const selectedTasks = useMemo(() => {
    const dateKey = getDateKey(selectedDate);
    return activeTasksByDate[dateKey] || [];
  }, [activeTasksByDate, selectedDate]);

  const projectSidebarItems = useMemo(() => {
    const selectedDayKey = getDateKey(selectedDate);

    return projects.map((project) => {
      const scheduledCount = tasks.filter((task) => getProjectId(task) === project._id).length;
      const selectedDayCount = (allTasksByDate[selectedDayKey] || [])
        .filter((task) => getProjectId(task) === project._id)
        .length;

      return {
        ...project,
        scheduledCount,
        selectedDayCount,
      };
    });
  }, [allTasksByDate, projects, selectedDate, tasks]);

  const initialProjectIdForNewTask = validSelectedProjectIds.length === 1
    ? validSelectedProjectIds[0]
    : '';

  const handleNavigate = (direction) => {
    if (viewMode === 'week') {
      setCurrentDate((previousDate) => addDays(previousDate, direction * 7));
      setSelectedDate((previousDate) => addDays(previousDate, direction * 7));
      return;
    }

    setCurrentDate((previousDate) => new Date(
      previousDate.getFullYear(),
      previousDate.getMonth() + direction,
      1
    ));
  };

  const handleResetToToday = () => {
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const handleDateSelect = (date) => {
    const normalizedDate = startOfDay(date);
    setSelectedDate(normalizedDate);

    if (viewMode === 'week') {
      setCurrentDate(normalizedDate);
    }
  };

  const handleViewModeChange = (nextMode) => {
    setViewMode(nextMode);

    if (nextMode === 'week') {
      setCurrentDate(selectedDate);
    }
  };

  const handleProjectToggle = (projectId) => {
    setSelectedProjectIds((previousIds) => (
      previousIds.includes(projectId)
        ? previousIds.filter((value) => value !== projectId)
        : [...previousIds, projectId]
    ));
  };

  const openAddTask = () => setIsAddTaskModalOpen(true);
  const openGenerateTasks = () => setIsGenerateModalOpen(true);
  const openAddProject = () => setIsAddProjectModalOpen(true);

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gradient-to-r from-slate-50 via-white to-sky-50 px-6 py-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">Planning Lens</p>
              <h2 className="mt-2 text-3xl font-semibold text-gray-900">Plan every deadline in one view</h2>
              <p className="mt-3 text-sm text-gray-600">
                Switch between month and week, then use project filters to narrow the calendar. With no project selected, standalone and project tasks all stay visible.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={openAddTask}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-600 px-5 text-sm font-medium text-white shadow-md transition-all hover:from-sky-700 hover:to-cyan-700 focus:outline-none focus:ring-4 focus:ring-sky-200"
              >
                <Plus className="h-4 w-4" />
                Add Task
              </button>
              <button
                type="button"
                onClick={openGenerateTasks}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 text-sm font-medium text-white shadow-md transition-all hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-emerald-200"
              >
                <Sparkles className="h-4 w-4" />
                Generate
              </button>
              <button
                type="button"
                onClick={openAddProject}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-slate-700 to-sky-700 px-5 text-sm font-medium text-white shadow-md transition-all hover:from-slate-800 hover:to-sky-800 focus:outline-none focus:ring-4 focus:ring-sky-200"
              >
                <FolderPlus className="h-4 w-4" />
                Add Project
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2.05fr)_minmax(280px,0.75fr)]">
        <div className="space-y-6">
          <CalendarGrid
            currentDate={currentDate}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onNavigate={handleNavigate}
            onResetToToday={handleResetToToday}
            tasksByDate={activeTasksByDate}
            onTaskUpdated={onTaskUpdated}
            viewMode={viewMode}
            showViewModeToggle
            onViewModeChange={handleViewModeChange}
          />

          {viewMode === 'week' ? (
            <ProjectFocusWeekAgenda
              selectedDate={selectedDate}
              tasks={selectedTasks}
              selectedProjectCount={validSelectedProjectIds.length}
              onTaskUpdated={onTaskUpdated}
            />
          ) : null}
        </div>

        <div className="h-full" style={{ maxHeight: 'calc(100vh - 150px)' }}>
          <ProjectFocusPanel
            projects={projectSidebarItems}
            selectedProjectIds={validSelectedProjectIds}
            onToggleProject={handleProjectToggle}
            onSelectAllProjects={() => setSelectedProjectIds(projects.map((project) => project._id))}
            onClearProjects={() => setSelectedProjectIds([])}
            selectedDate={selectedDate}
            tasks={selectedTasks}
            onTaskUpdated={onTaskUpdated}
            showSelectedDayTasks={viewMode === 'month'}
            onAddTask={openAddTask}
            onGenerateTasks={openGenerateTasks}
          />
        </div>
      </div>

      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        onTaskCreated={onTaskUpdated}
        initialDueDate={selectedDate ? toMidnightDateTimeLocalValue(selectedDate) : ''}
        initialProjectId={initialProjectIdForNewTask}
      />

      <DetailRequestModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        selectedDate={selectedDate}
        onTasksGenerated={onTaskUpdated}
      />

      {isAddProjectModalOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setIsAddProjectModalOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-sky-600 to-cyan-600 px-6 py-4">
              <h2 className="text-xl font-semibold text-white">Add Project</h2>
            </div>
            <div className="p-6">
              <AddProjectForm
                onClose={() => setIsAddProjectModalOpen(false)}
                onProjectCreated={onTaskUpdated}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default CalendarView;
