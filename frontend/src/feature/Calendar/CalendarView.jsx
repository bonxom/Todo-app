import { useMemo, useState } from 'react';
import CalendarGrid from './CalendarGrid';
import TaskListPanel from './TaskListPanel';
import ProjectFocusPanel from './ProjectFocusPanel';
import { addDays, getDateKey, groupTasksByDate, startOfDay } from './calendarUtils';

const getProjectId = (task) => task.projectId?._id || task.projectId || null;

const CalendarView = ({ tasks, projects, onTaskUpdated }) => {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [calendarMode, setCalendarMode] = useState('overall');
  const [focusViewMode, setFocusViewMode] = useState('month');
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);

  const validSelectedProjectIds = useMemo(
    () => selectedProjectIds.filter((projectId) => projects.some((project) => project._id === projectId)),
    [projects, selectedProjectIds]
  );

  const overallTasksByDate = useMemo(() => groupTasksByDate(tasks), [tasks]);

  const projectFocusTasks = useMemo(() => {
    if (validSelectedProjectIds.length === 0) {
      return [];
    }

    const selectedSet = new Set(validSelectedProjectIds);
    return tasks.filter((task) => selectedSet.has(getProjectId(task)));
  }, [tasks, validSelectedProjectIds]);

  const projectFocusTasksByDate = useMemo(
    () => groupTasksByDate(projectFocusTasks),
    [projectFocusTasks]
  );

  const activeTasksByDate = calendarMode === 'project-focus'
    ? projectFocusTasksByDate
    : overallTasksByDate;

  const selectedTasks = useMemo(() => {
    const dateKey = getDateKey(selectedDate);
    return activeTasksByDate[dateKey] || [];
  }, [activeTasksByDate, selectedDate]);

  const projectSidebarItems = useMemo(() => {
    const selectedDayKey = getDateKey(selectedDate);

    return projects.map((project) => {
      const scheduledCount = tasks.filter((task) => getProjectId(task) === project._id).length;
      const selectedDayCount = (overallTasksByDate[selectedDayKey] || [])
        .filter((task) => getProjectId(task) === project._id)
        .length;

      return {
        ...project,
        scheduledCount,
        selectedDayCount,
      };
    });
  }, [overallTasksByDate, projects, selectedDate, tasks]);

  const handleNavigate = (direction) => {
    if (calendarMode === 'project-focus' && focusViewMode === 'week') {
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

    if (calendarMode === 'project-focus' && focusViewMode === 'week') {
      setCurrentDate(normalizedDate);
    }
  };

  const handleProjectToggle = (projectId) => {
    setSelectedProjectIds((previousIds) => (
      previousIds.includes(projectId)
        ? previousIds.filter((value) => value !== projectId)
        : [...previousIds, projectId]
    ));
  };

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gradient-to-r from-slate-50 via-white to-sky-50 px-6 py-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">Planning Lens</p>
              <h2 className="mt-2 text-3xl font-semibold text-gray-900">
                {calendarMode === 'overall' ? 'See every scheduled deadline' : 'Filter the calendar by project'}
              </h2>
              <p className="mt-3 text-sm text-gray-600">
                {calendarMode === 'overall'
                  ? 'Overall mode keeps the existing month-first calendar intact, with exact-day task detail on the right.'
                  : 'Project Focus narrows the calendar to the projects you choose and adds a weekly zoom for tighter planning.'}
              </p>
            </div>

            <div className="inline-flex rounded-[1.4rem] bg-gray-100 p-1.5 shadow-inner">
              <button
                type="button"
                onClick={() => setCalendarMode('overall')}
                className={`rounded-[1rem] px-5 py-3 text-sm font-medium transition-all ${
                  calendarMode === 'overall'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Overall
              </button>
              <button
                type="button"
                onClick={() => setCalendarMode('project-focus')}
                className={`rounded-[1rem] px-5 py-3 text-sm font-medium transition-all ${
                  calendarMode === 'project-focus'
                    ? 'bg-white text-sky-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Project Focus
              </button>
            </div>
          </div>
        </div>
      </div>

      {calendarMode === 'overall' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[70%_30%]">
          <CalendarGrid
            currentDate={currentDate}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onNavigate={handleNavigate}
            onResetToToday={handleResetToToday}
            tasksByDate={overallTasksByDate}
            onTaskUpdated={onTaskUpdated}
            viewMode="month"
          />

          <div className="h-full" style={{ maxHeight: 'calc(100vh - 150px)' }}>
            <TaskListPanel
              selectedDate={selectedDate}
              tasks={selectedTasks}
              onTaskUpdated={onTaskUpdated}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.95fr)]">
          <CalendarGrid
            currentDate={currentDate}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onNavigate={handleNavigate}
            onResetToToday={handleResetToToday}
            tasksByDate={projectFocusTasksByDate}
            onTaskUpdated={onTaskUpdated}
            viewMode={focusViewMode}
            showViewModeToggle
            onViewModeChange={(nextMode) => {
              setFocusViewMode(nextMode);
              if (nextMode === 'week') {
                setCurrentDate(selectedDate);
              }
            }}
          />

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
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default CalendarView;
