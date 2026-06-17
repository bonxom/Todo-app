import { useMemo, useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import CalendarGrid from './CalendarGrid';
import ProjectFocusPanel from './ProjectFocusPanel';
import ProjectFocusWeekAgenda from './ProjectFocusWeekAgenda';
import DetailRequestModal from './DetailRequestModal';
import AddTaskModal from '../Dialog/AddTaskModal';
import AddProjectForm from '../Todo/Form/AddProjectForm';
import { addDays, getDateKey, groupTasksByDate, sortTasksByDueTime, startOfDay } from './calendarUtils';
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
    return sortTasksByDueTime(activeTasksByDate[dateKey] || []);
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
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2.05fr)_minmax(300px,0.78fr)]">
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
            actions={(
              <>
                <button
                  type="button"
                  onClick={openAddTask}
                  className="ui-btn-primary ui-focus-ring"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add Task
                </button>
                <button
                  type="button"
                  onClick={openGenerateTasks}
                  className="ui-btn-secondary ui-focus-ring"
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Generate
                </button>
              </>
            )}
          />

          <ProjectFocusWeekAgenda
            selectedDate={selectedDate}
            tasks={selectedTasks}
            selectedProjectCount={validSelectedProjectIds.length}
            onTaskUpdated={onTaskUpdated}
          />
        </div>

        <div className="h-full" style={{ maxHeight: 'calc(100vh - 150px)' }}>
          <ProjectFocusPanel
            projects={projectSidebarItems}
            selectedProjectIds={validSelectedProjectIds}
            onToggleProject={handleProjectToggle}
            onClearProjects={() => setSelectedProjectIds([])}
            onAddProject={openAddProject}
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
          className="ui-modal-overlay fixed inset-0 z-[70] flex items-center justify-center p-4"
          onClick={() => setIsAddProjectModalOpen(false)}
        >
          <div
            className="ui-modal-shell animate-fadeIn"
            style={{ width: 'min(100%, 34rem)' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="ui-modal-header">
              <h2 className="text-xl font-semibold text-[var(--color-text)]">Add Project</h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Create a project first, then use the filter rail to narrow the calendar.
              </p>
            </div>
            <div className="ui-modal-body">
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
