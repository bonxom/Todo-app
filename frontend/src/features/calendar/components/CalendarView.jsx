import { useMemo, useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import CalendarGrid from './CalendarGrid';
import ProjectFocusPanel from './ProjectFocusPanel';
import ProjectFocusWeekAgenda from './ProjectFocusWeekAgenda';
import DetailRequestModal from './DetailRequestModal';
import AddTaskModal from '@/features/tasks/components/dialogs/AddTaskModal';
import AddProjectForm from '@/features/tasks/components/Form/AddProjectForm';
import { addDays, getDateKey, groupTasksByDate, sortTasksByDueTime, startOfDay } from './calendarUtils';
import { toMidnightDateTimeLocalValue } from '@/shared/utils/dateTime';
import { PROJECT_STATUS, filterProjectsByVisibility } from '@/shared/utils/projectStatus';

const getProjectId = (task) => task.projectId?._id || task.projectId || null;

const CalendarView = ({
  tasks,
  projects,
  onTaskUpdated,
  currentDate,
  viewMode,
  isRangeLoading,
  onCurrentDateChange,
  onViewModeChange,
  onTaskStatusChange,
  onTaskDelete,
  onTaskDueDateChange,
  onTaskCopy,
  onProjectStatusChange,
}) => {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [showCompletedProjects, setShowCompletedProjects] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);

  const visibleProjects = useMemo(
    () => filterProjectsByVisibility(projects, showCompletedProjects),
    [projects, showCompletedProjects]
  );

  const validSelectedProjectIds = useMemo(
    () => selectedProjectIds.filter((projectId) => visibleProjects.some((project) => project._id === projectId)),
    [visibleProjects, selectedProjectIds]
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

    return visibleProjects.map((project) => {
      const summary = project.summary || {};
      const selectedDayCount = (allTasksByDate[selectedDayKey] || [])
        .filter((task) => getProjectId(task) === project._id)
        .length;

      return {
        ...project,
        canComplete: Boolean(summary.canComplete),
        scheduledCount: summary.scheduledTasks || 0,
        selectedDayCount,
      };
    });
  }, [allTasksByDate, visibleProjects, selectedDate]);

  const initialProjectIdForNewTask = validSelectedProjectIds.length === 1
    ? validSelectedProjectIds[0]
    : '';

  const handleNavigate = (direction) => {
    if (viewMode === 'week') {
      onCurrentDateChange?.((previousDate) => addDays(previousDate, direction * 7));
      setSelectedDate((previousDate) => addDays(previousDate, direction * 7));
      return;
    }

    onCurrentDateChange?.((previousDate) => new Date(
      previousDate.getFullYear(),
      previousDate.getMonth() + direction,
      1
    ));
  };

  const handleResetToToday = () => {
    onCurrentDateChange?.(today);
    setSelectedDate(today);
  };

  const handleDateSelect = (date) => {
    const normalizedDate = startOfDay(date);
    setSelectedDate(normalizedDate);

    if (viewMode === 'week') {
      onCurrentDateChange?.(normalizedDate);
    }
  };

  const handleViewModeChange = (nextMode) => {
    onViewModeChange?.(nextMode);

    if (nextMode === 'week') {
      onCurrentDateChange?.(selectedDate);
    }
  };

  const handleProjectToggle = (projectId) => {
    setSelectedProjectIds((previousIds) => (
      previousIds.includes(projectId)
        ? previousIds.filter((value) => value !== projectId)
        : [...previousIds, projectId]
    ));
  };

  const handleCompleteProject = async (projectId) => {
    try {
      await onProjectStatusChange?.(projectId, PROJECT_STATUS.COMPLETED);
      setSelectedProjectIds((previousIds) => previousIds.filter((value) => value !== projectId));
    } catch (error) {
      console.error('Failed to complete project:', error);
    }
  };

  const handleRestoreProject = async (projectId) => {
    try {
      await onProjectStatusChange?.(projectId, PROJECT_STATUS.ACTIVE);
    } catch (error) {
      console.error('Failed to restore project:', error);
    }
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
            onTaskDueDateChange={onTaskDueDateChange}
            onTaskCopy={onTaskCopy}
            viewMode={viewMode}
            isRangeLoading={isRangeLoading}
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
            onTaskStatusChange={onTaskStatusChange}
            onTaskDelete={onTaskDelete}
          />
        </div>

        <div className="h-full" style={{ maxHeight: 'calc(100vh - 150px)' }}>
          <ProjectFocusPanel
            projects={projectSidebarItems}
            selectedProjectIds={validSelectedProjectIds}
            onToggleProject={handleProjectToggle}
            onClearProjects={() => setSelectedProjectIds([])}
            onAddProject={openAddProject}
            onProjectUpdated={onTaskUpdated}
            showCompletedProjects={showCompletedProjects}
            onShowCompletedProjectsChange={setShowCompletedProjects}
            onCompleteProject={handleCompleteProject}
            onRestoreProject={handleRestoreProject}
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
