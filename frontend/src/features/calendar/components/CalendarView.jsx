import { useTranslation } from "react-i18next";
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
  onTaskDatesChange,
  onTaskCopy,
  onProjectStatusChange,
}) => {
  const { t } = useTranslation("workspace");

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
    <section className="calendar-workspace flex flex-col">
      <header className="ui-workspace-heading flex items-center justify-between">
        <h1 className="ui-page-title m-[0] text-[var(--color-text)] [font-weight:650] text-balance">
          {t("calendar")}
        </h1>
        <div className="calendar-heading-actions flex gap-[10px] [@media(max-width:650px)]:gap-[6px] [@media(max-width:360px)]:w-full [@media(max-width:360px)]:justify-end">
          <button
            type="button"
            onClick={openGenerateTasks}
            className="ui-btn-secondary ui-focus-ring"
          >
            <Sparkles size={16} aria-hidden="true" /> {t("generate")}
          </button>
          <button
            type="button"
            onClick={openAddTask}
            className="ui-btn-primary ui-page-add-button shrink-0 ui-focus-ring"
          >
            <Plus size={17} aria-hidden="true" /> {t("addTaskCasedAddTask")}
          </button>
        </div>
      </header>

      <section
        className="calendar-overview grid [border:1px_solid_var(--color-line)] rounded-[18px] [background:var(--color-surface)] overflow-hidden"
        aria-label={t("scheduleOverview")}
      >
        <div
          className="calendar-overview-intro relative isolate overflow-hidden p-[25px_28px] [background:var(--color-accent-soft)]
          [&_h2]:[font-weight:550] [&_h2]:[letter-spacing:-0.035em] [&_h2]:[line-height:1.25] [&_h2]:m-[10px_0]
          [&_h2_em]:font-[Georgia,serif] [&_h2_em]:[font-weight:400] [&_h2_em]:text-[var(--color-accent)]
          [&_p]:text-[var(--color-text-muted)] [@media(max-width:650px)]:p-[20px]"
        >
          <span className="calendar-eyebrow text-[10px] [letter-spacing:0.13em] [font-weight:700] text-[var(--color-accent)]">
            {t("makeRoomForWhatMatters")}
          </span>
          <h2>
            {t("aLittleStructure")}
            <br />
            <em>{t("aClearerMind")}</em>
          </h2>
          <p>{t("yourPlansAtAComfortablePace")}</p>
          <CalendarDays
            className="calendar-overview-art absolute w-[120px] h-[120px] right-[-22px] bottom-[-22px] [transform:rotate(-15deg)] text-[var(--color-accent)] opacity-[0.08] z-[-1] [stroke-width:1]"
            aria-hidden="true"
          />
        </div>
        <div className="calendar-metrics grid grid-cols-[repeat(3,minmax(0,1fr))] items-center p-[25px_0] [@media(max-width:650px)]:py-[20px]">
          {[
            [
              CalendarDays,
              filteredTasks.length,
              t("scheduled"),
              t("inThisView"),
            ],
            [
              CircleDot,
              filteredTasks.filter((task) =>
                ["pending", "in-progress"].includes(task.status),
              ).length,
              t("toDo"),
              t("oneStepAtATime"),
            ],
            [
              Check,
              filteredTasks.filter((task) => task.status === "completed")
                .length,
              t("completed"),
              t("progressToBeProudOf"),
            ],
          ].map(([Icon, count, label, note]) => (
            <div
              className="calendar-metric flex flex-col [border-right:1px_solid_var(--color-line)] [&:last-child]:[border:0]
              [&_>_span]:flex [&_>_span]:items-center [&_>_span]:text-[var(--color-text-muted)]
              [&_svg]:text-[var(--color-accent)] [&_strong]:[font-weight:550] [&_strong]:[letter-spacing:-0.045em]
              [&_strong]:[font-variant-numeric:tabular-nums] [&_small]:text-[var(--color-text-muted)]"
              key={label}
            >
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

      <div className="calendar-filter-bar flex justify-between items-center gap-[12px] mb-[-10px] [&_>_div]:flex [@media(max-width:650px)]:[&_>_div]:flex-col">
        <div>
          <span className="calendar-eyebrow text-[10px] [letter-spacing:0.13em] [font-weight:700] text-[var(--color-accent)]">
            {t("yourSchedule")}
          </span>
          <span className="calendar-filter-caption text-[11px] text-[var(--color-text-muted)]">
            {validSelectedProjectIds.length
              ? t("selectedProjects", { count: validSelectedProjectIds.length })
              : t("allProjectsPersonalTasks")}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsProjectFiltersOpen((value) => !value)}
          className="ui-btn-secondary ui-focus-ring"
          aria-label={
            isProjectFiltersOpen
              ? t("hideProjectFilters")
              : t("showProjectFilters")
          }
          aria-controls="calendar-project-filters"
          aria-expanded={isProjectFiltersOpen}
        >
          <SlidersHorizontal size={15} aria-hidden="true" /> {t("projects")}
          {validSelectedProjectIds.length > 0 && (
            <span className="calendar-filter-count [background:var(--color-accent-soft)] text-[var(--color-accent)] p-[1px_6px] rounded-[4px]">
              {validSelectedProjectIds.length}
            </span>
          )}
        </button>
      </div>
      <div
        className="calendar-layout grid grid-cols-[minmax(0,1fr)] gap-[20px] [align-items:start]"
        data-filters-open={isProjectFiltersOpen}
      >
        <div className="calendar-main min-w-[0] flex flex-col gap-[24px]">
          <CalendarGrid
            currentDate={currentDate}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onNavigate={handleNavigate}
            onResetToToday={handleResetToToday}
            tasksByDate={activeTasksByDate}
            onTaskUpdated={onTaskUpdated}
            onTaskDueDateChange={onTaskDueDateChange}
            onTaskDatesChange={onTaskDatesChange}
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
          <div className="calendar-filters min-w-[0] max-h-[800px] overflow-auto rounded-[var(--radius-lg)] [&_aside]:h-auto [@media(max-width:1200px)]:row-1 [@media(max-width:1200px)]:max-h-[440px]">
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
        title={t("addProject")}
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
