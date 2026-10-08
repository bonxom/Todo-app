import FormDialog from "@/shared/components/FormDialog";
import { createElement, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  CircleDot,
  SlidersHorizontal,
  Plus,
  Sparkles,
} from "lucide-react";
import CalendarGrid from "./CalendarGrid";
import ProjectFocusPanel from "./ProjectFocusPanel";
import ProjectFocusWeekAgenda from "./ProjectFocusWeekAgenda";
import DetailRequestModal from "./DetailRequestModal";
import AddTaskModal from "@/features/tasks/components/dialogs/AddTaskModal";
import AddProjectForm from "@/features/tasks/components/Form/AddProjectForm";
import {
  addDays,
  getDateKey,
  groupTasksByDate,
  sortTasksByDueTime,
  startOfDay,
} from "./calendarUtils";
import { toMidnightDateTimeLocalValue } from "@/shared/utils/dateTime";
import {
  PROJECT_STATUS,
  filterProjectsByVisibility,
} from "@/shared/utils/projectStatus";

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
  const [selectedDate, setSelectedDate] = useState(() =>
    startOfDay(currentDate || today),
  );
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [showCompletedProjects, setShowCompletedProjects] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [isProjectFiltersOpen, setIsProjectFiltersOpen] = useState(false);

  const visibleProjects = useMemo(
    () => filterProjectsByVisibility(projects, showCompletedProjects),
    [projects, showCompletedProjects],
  );

  const validSelectedProjectIds = useMemo(
    () =>
      selectedProjectIds.filter((projectId) =>
        visibleProjects.some((project) => project._id === projectId),
      ),
    [visibleProjects, selectedProjectIds],
  );

  const filteredTasks = useMemo(() => {
    if (validSelectedProjectIds.length === 0) {
      return tasks;
    }

    const selectedSet = new Set(validSelectedProjectIds);
    return tasks.filter((task) => selectedSet.has(getProjectId(task)));
  }, [tasks, validSelectedProjectIds]);

  const allTasksByDate = useMemo(() => groupTasksByDate(tasks), [tasks]);
  const activeTasksByDate = useMemo(
    () => groupTasksByDate(filteredTasks),
    [filteredTasks],
  );

  const selectedTasks = useMemo(() => {
    const dateKey = getDateKey(selectedDate);
    return sortTasksByDueTime(activeTasksByDate[dateKey] || []);
  }, [activeTasksByDate, selectedDate]);

  const projectSidebarItems = useMemo(() => {
    const selectedDayKey = getDateKey(selectedDate);

    return visibleProjects.map((project) => {
      const summary = project.summary || {};
      const selectedDayCount = (allTasksByDate[selectedDayKey] || []).filter(
        (task) => getProjectId(task) === project._id,
      ).length;

      return {
        ...project,
        canComplete: Boolean(summary.canComplete),
        scheduledCount: tasks.filter(
          (task) => getProjectId(task) === project._id,
        ).length,
        selectedDayCount,
      };
    });
  }, [allTasksByDate, visibleProjects, selectedDate, tasks]);

  const initialProjectIdForNewTask =
    validSelectedProjectIds.length === 1 ? validSelectedProjectIds[0] : "";

  const handleNavigate = (direction) => {
    if (viewMode === "week") {
      onCurrentDateChange?.((previousDate) =>
        addDays(previousDate, direction * 7),
      );
      setSelectedDate((previousDate) => addDays(previousDate, direction * 7));
      return;
    }

    const nextDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + direction,
      1,
    );
    onCurrentDateChange?.(nextDate);
    setSelectedDate(nextDate);
  };

  const handleResetToToday = () => {
    onCurrentDateChange?.(today);
    setSelectedDate(today);
  };

  const handleDateSelect = (date) => {
    const normalizedDate = startOfDay(date);
    setSelectedDate(normalizedDate);

    onCurrentDateChange?.(normalizedDate);
  };

  const handleViewModeChange = (nextMode) => {
    onViewModeChange?.(nextMode);

    if (nextMode === "week") {
      onCurrentDateChange?.(selectedDate);
    }
  };

  const handleProjectToggle = (projectId) => {
    setSelectedProjectIds((previousIds) =>
      previousIds.includes(projectId)
        ? previousIds.filter((value) => value !== projectId)
        : [...previousIds, projectId],
    );
  };

  const handleCompleteProject = async (projectId) => {
    try {
      await onProjectStatusChange?.(projectId, PROJECT_STATUS.COMPLETED);
      setSelectedProjectIds((previousIds) =>
        previousIds.filter((value) => value !== projectId),
      );
    } catch (error) {
      console.error("Failed to complete project:", error);
    }
  };

  const handleRestoreProject = async (projectId) => {
    try {
      await onProjectStatusChange?.(projectId, PROJECT_STATUS.ACTIVE);
    } catch (error) {
      console.error("Failed to restore project:", error);
    }
  };

  const openAddTask = () => setIsAddTaskModalOpen(true);
  const openGenerateTasks = () => setIsGenerateModalOpen(true);
  const openAddProject = () => setIsAddProjectModalOpen(true);

  return (
    <section className="calendar-workspace">
      <header className="ui-workspace-heading">
        <h1 className="ui-page-title">Calendar</h1>
        <div className="calendar-heading-actions">
          <button
            type="button"
            onClick={openGenerateTasks}
            className="ui-btn-secondary ui-focus-ring"
          >
            <Sparkles size={16} aria-hidden="true" /> Generate
          </button>
          <button
            type="button"
            onClick={openAddTask}
            className="ui-btn-primary ui-page-add-button ui-focus-ring"
          >
            <Plus size={17} aria-hidden="true" /> Add Task
          </button>
        </div>
      </header>

      <section className="calendar-overview" aria-label="Schedule overview">
        <div className="calendar-overview-intro">
          <span className="calendar-eyebrow">MAKE ROOM FOR WHAT MATTERS</span>
          <h2>
            A little structure.
            <br />
            <em>A clearer mind.</em>
          </h2>
          <p>Your plans, at a comfortable pace.</p>
          <CalendarDays className="calendar-overview-art" aria-hidden="true" />
        </div>
        <div className="calendar-metrics">
          {[
            [CalendarDays, filteredTasks.length, "Scheduled", "In this view"],
            [
              CircleDot,
              filteredTasks.filter((task) =>
                ["pending", "in-progress"].includes(task.status),
              ).length,
              "To do",
              "One step at a time",
            ],
            [
              Check,
              filteredTasks.filter((task) => task.status === "completed")
                .length,
              "Completed",
              "Progress to be proud of",
            ],
          ].map(([Icon, count, label, note]) => (
            <div className="calendar-metric" key={label}>
              <span>
                {createElement(Icon, { size: 15, "aria-hidden": true })}
                {label}
              </span>
              <strong>{count}</strong>
              <small>{note}</small>
            </div>
          ))}
        </div>
      </section>

      <div className="calendar-filter-bar">
        <div>
          <span className="calendar-eyebrow">YOUR SCHEDULE</span>
          <span className="calendar-filter-caption">
            {validSelectedProjectIds.length
              ? `${validSelectedProjectIds.length} project${validSelectedProjectIds.length === 1 ? "" : "s"} selected`
              : "All projects & personal tasks"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsProjectFiltersOpen((value) => !value)}
          className="ui-btn-secondary ui-focus-ring"
          aria-label={
            isProjectFiltersOpen
              ? "Hide project filters"
              : "Show project filters"
          }
          aria-controls="calendar-project-filters"
          aria-expanded={isProjectFiltersOpen}
        >
          <SlidersHorizontal size={15} aria-hidden="true" /> Projects
          {validSelectedProjectIds.length > 0 && (
            <span className="calendar-filter-count">
              {validSelectedProjectIds.length}
            </span>
          )}
        </button>
      </div>
      <div className="calendar-layout" data-filters-open={isProjectFiltersOpen}>
        <div className="calendar-main">
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
          />
          <ProjectFocusWeekAgenda
            selectedDate={selectedDate}
            tasks={selectedTasks}
            selectedProjectCount={validSelectedProjectIds.length}
            onTaskUpdated={onTaskUpdated}
            onTaskStatusChange={onTaskStatusChange}
            onTaskDelete={onTaskDelete}
            onAddTask={openAddTask}
          />
        </div>
        {isProjectFiltersOpen && (
          <div className="calendar-filters">
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
        )}
      </div>

      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        onTaskCreated={onTaskUpdated}
        initialDueDate={
          selectedDate ? toMidnightDateTimeLocalValue(selectedDate) : ""
        }
        initialProjectId={initialProjectIdForNewTask}
      />

      <DetailRequestModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        selectedDate={selectedDate}
        onTasksGenerated={onTaskUpdated}
      />

      <FormDialog
        isOpen={isAddProjectModalOpen}
        onClose={() => setIsAddProjectModalOpen(false)}
        title="Add Project"
        kind="project"
      >
        <AddProjectForm
          onClose={() => setIsAddProjectModalOpen(false)}
          onProjectCreated={onTaskUpdated}
        />
      </FormDialog>
    </section>
  );
};

export default CalendarView;
