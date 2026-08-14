import { useMemo, useState } from 'react';
import { useActivityQuery } from '../api/statQueries';
import { createHeatmapModel, formatDateKeyLabel } from './statsUtils';
import { useTaskFilter, useVisibleTasks } from '@/context/useTaskFilter';
import { getApiErrorMessage } from '@/shared/services/apiError';

const CELL_LEVEL_STYLES = [
  'bg-[var(--color-surface-muted)] border-[color:var(--color-line)]',
  'bg-[#edf3ef] border-[#d7e5dd]',
  'bg-[#d6e7dc] border-[#b8d2c1]',
  'bg-[#a7c4b3] border-[#87aa96]',
  'bg-[#5e8f72] border-[#507a62]',
];

const WEEKDAY_LABELS = [
  { label: '', ariaLabel: 'Sunday' },
  { label: 'Mon', ariaLabel: 'Monday' },
  { label: '', ariaLabel: 'Tuesday' },
  { label: 'Wed', ariaLabel: 'Wednesday' },
  { label: '', ariaLabel: 'Thursday' },
  { label: 'Fri', ariaLabel: 'Friday' },
  { label: '', ariaLabel: 'Saturday' },
];

const NUMBER_FORMATTER = new Intl.NumberFormat();

const formatCompletionLabel = (dateKey, count) => {
  const taskLabel = count === 1 ? 'task completed' : 'tasks completed';
  return `${formatDateKeyLabel(dateKey)}: ${NUMBER_FORMATTER.format(count)} ${taskLabel}`;
};

const formatDateTimeLabel = (value) => {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsedDate);
};

const formatTimeLabel = (value) => {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsedDate);
};

const getTaskProjectName = (task) => task?.project?.name || task?.projectId?.name || 'Standalone';
const getTaskCategoryName = (task) => task?.category?.name || task?.categoryId?.name || 'Uncategorized';

const MetadataBadge = ({ children, tone = 'neutral' }) => {
  const toneClassName = {
    success: 'ui-badge ui-badge--success',
    warning: 'ui-badge ui-badge--warning',
    danger: 'ui-badge ui-badge--danger',
    accent: 'ui-badge ui-badge--accent',
    neutral: 'ui-badge',
  }[tone] || 'ui-badge';

  return <span className={toneClassName}>{children}</span>;
};

const getPriorityTone = (priority) => {
  if (priority === 'High') {
    return 'danger';
  }

  if (priority === 'Medium') {
    return 'warning';
  }

  return 'accent';
};

const CompletedTaskCard = ({ task }) => {
  const completedLabel = formatTimeLabel(task.completedAt || task.completionDate);
  const dueLabel = formatDateTimeLabel(task.dueDate);

  return (
    <article className="rounded-[12px] border border-[color:var(--color-line)] bg-[var(--color-surface)] px-4 py-3 shadow-[var(--shadow-xs)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-[color:var(--color-text)]">
            {task.title || 'Untitled task'}
          </h3>
          {task.description ? (
            <p className="mt-1 break-words text-xs leading-5 text-[color:var(--color-text-muted)]">
              {task.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          {task.priority ? (
            <MetadataBadge tone={getPriorityTone(task.priority)}>{task.priority}</MetadataBadge>
          ) : null}
          {completedLabel ? <MetadataBadge tone="success">Completed {completedLabel}</MetadataBadge> : null}
          {dueLabel ? <MetadataBadge>Due {dueLabel}</MetadataBadge> : null}
          <MetadataBadge>{getTaskProjectName(task)}</MetadataBadge>
          <MetadataBadge>{getTaskCategoryName(task)}</MetadataBadge>
        </div>
      </div>
    </article>
  );
};

const SummaryCard = ({ label, value }) => (
  <div className="ui-section-card p-4">
    <p className="text-xs font-medium text-[color:var(--color-text-muted)]">{label}</p>
    <p className="ui-tabular mt-2 text-xl font-semibold text-[color:var(--color-text)]">{value}</p>
  </div>
);

const ActivityHeatmap = ({ dailyStats = [], isLoading = false, errorMessage = '' }) => {
  const [activeDateKey, setActiveDateKey] = useState(null);
  const [selectedDateKey, setSelectedDateKey] = useState(null);

  const activityQuery = useActivityQuery(selectedDateKey || undefined);
  const isTaskListLoading = activityQuery.isLoading && Boolean(selectedDateKey);
  const taskListError = activityQuery.isError
    ? getApiErrorMessage(activityQuery.error, 'Unable to load completed tasks for this day.')
    : '';
  const completedTasks = useMemo(() => {
    const data = activityQuery.data;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.tasks)) return data.tasks;
    return [];
  }, [activityQuery.data]);

  const { onlyInProgress } = useTaskFilter();
  const visibleCompletedTasks = useVisibleTasks(completedTasks);
  const heatmap = useMemo(() => createHeatmapModel(dailyStats, 365), [dailyStats]);

  const monthLabelByColumn = useMemo(() => {
    const labels = new Map();

    heatmap.monthLabels.forEach((monthLabel) => {
      labels.set(monthLabel.columnIndex, monthLabel.label);
    });

    return labels;
  }, [heatmap.monthLabels]);

  const fallbackCell = useMemo(() => {
    if (heatmap.bestDay?.count > 0) {
      return heatmap.bestDay;
    }

    const lastWeek = heatmap.weeks[heatmap.weeks.length - 1];

    if (!lastWeek || lastWeek.length === 0) {
      return null;
    }

    const inRangeCells = [...lastWeek].reverse();
    return inRangeCells.find((cell) => cell.isInRange) || lastWeek[lastWeek.length - 1];
  }, [heatmap.bestDay, heatmap.weeks]);

  const activeCell = useMemo(() => {
    if (!activeDateKey) {
      return fallbackCell;
    }

    return heatmap.weeks.flat().find((cell) => cell.dateKey === activeDateKey) || fallbackCell;
  }, [activeDateKey, fallbackCell, heatmap.weeks]);

  const selectedCell = useMemo(() => {
    if (!selectedDateKey) {
      return null;
    }

    return heatmap.weeks.flat().find((cell) => cell.dateKey === selectedDateKey) || null;
  }, [heatmap.weeks, selectedDateKey]);

  const handleCellSelect = (cell) => {
    if (!cell?.isInRange) {
      return;
    }

    setSelectedDateKey(cell.dateKey);
  };

  if (isLoading) {
    return (
      <section className="ui-section-card ui-card-padding">
        <div className="max-w-3xl">
          <p className="ui-page-kicker">Completion Rhythm</p>
          <h2 className="mt-3 text-2xl font-semibold text-[color:var(--color-text)]">Daily Activity Heatmap</h2>
          <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
            Building the last 365 days of completed task activity…
          </p>
        </div>
        <div className="mt-6 space-y-4" aria-live="polite">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-[12px] bg-[var(--color-surface-muted)]" />
            ))}
          </div>
          <div className="h-56 animate-pulse rounded-[12px] bg-[var(--color-surface-muted)]" />
        </div>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="ui-section-card ui-card-padding">
        <p className="ui-page-kicker">Completion Rhythm</p>
        <h2 className="mt-3 text-2xl font-semibold text-[color:var(--color-text)]">Daily Activity Heatmap</h2>
        <p className="mt-4 max-w-2xl text-sm text-[color:var(--color-text-muted)]">{errorMessage}</p>
      </section>
    );
  }

  const bestDayLabel = heatmap.bestDay?.count
    ? `${NUMBER_FORMATTER.format(heatmap.bestDay.count)} on ${formatDateKeyLabel(heatmap.bestDay.dateKey)}`
    : 'No activity yet';
  const hasNoCompletedTasks = heatmap.totalCompleted === 0;

  return (
    <section className="ui-section-card overflow-hidden">
      <div className="border-b border-[color:var(--color-line)] px-6 py-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="ui-page-kicker">Completion Rhythm</p>
            <h2 className="mt-3 text-2xl font-semibold text-[color:var(--color-text)]">Daily Activity Heatmap</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Completed" value={NUMBER_FORMATTER.format(heatmap.totalCompleted)} />
            <SummaryCard label="Active Days" value={NUMBER_FORMATTER.format(heatmap.activeDays)} />
            <SummaryCard label="Best Day" value={bestDayLabel} />
          </div>
        </div>
      </div>

      <div className="space-y-5 px-6 py-6">
        {hasNoCompletedTasks ? (
          <p className="rounded-[12px] border border-[color:var(--color-line)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-[color:var(--color-text-muted)]">
            No completed tasks in this range yet. Finish a task to start building your activity history.
          </p>
        ) : null}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="ui-section-card max-w-xl p-4">
            <p className="text-xs font-medium text-[color:var(--color-text-muted)]">Hover Detail</p>
            <p className="mt-2 text-sm font-medium text-[color:var(--color-text)]">
              {activeCell ? formatCompletionLabel(activeCell.dateKey, activeCell.count) : 'No day selected'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-[color:var(--color-text-muted)]">
            <span>Less</span>
            <div className="flex items-center gap-1">
              {CELL_LEVEL_STYLES.map((cellLevelStyle, index) => (
                <span
                  key={index}
                  aria-hidden="true"
                  className={`h-3.5 w-3.5 rounded-[4px] border ${cellLevelStyle}`}
                />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="inline-flex min-w-max gap-3">
            <div className="mt-6 flex flex-col gap-1 pr-1">
              {WEEKDAY_LABELS.map((weekday) => (
                <div
                  key={weekday.ariaLabel}
                  className="flex h-4 items-center text-[10px] font-medium text-[color:var(--color-text-muted)]"
                  aria-label={weekday.ariaLabel}
                >
                  {weekday.label}
                </div>
              ))}
            </div>

            <div>
              <div className="mb-2 flex gap-1">
                {heatmap.weeks.map((_, columnIndex) => (
                  <div
                    key={`month-${columnIndex}`}
                    className="w-4 text-[10px] font-medium text-[color:var(--color-text-muted)]"
                  >
                    {monthLabelByColumn.get(columnIndex) || ''}
                  </div>
                ))}
              </div>

              <div className="flex gap-1">
                {heatmap.weeks.map((week, weekIndex) => (
                  <div key={`week-${weekIndex}`} className="flex flex-col gap-1">
                    {week.map((cell) => {
                      const tooltipLabel = formatCompletionLabel(cell.dateKey, cell.count);
                      const isActive = activeCell?.dateKey === cell.dateKey;
                      const isSelected = selectedDateKey === cell.dateKey;

                      return (
                        <button
                          key={cell.dateKey}
                          type="button"
                          title={tooltipLabel}
                          aria-label={tooltipLabel}
                          aria-pressed={isSelected}
                          onClick={() => handleCellSelect(cell)}
                          onMouseEnter={() => setActiveDateKey(cell.dateKey)}
                          onFocus={() => setActiveDateKey(cell.dateKey)}
                          onMouseLeave={() => setActiveDateKey(null)}
                          onBlur={() => setActiveDateKey(null)}
                          className={[
                            'h-4 w-4 rounded-[4px] border transition-[transform,box-shadow,border-color] duration-150',
                            cell.isInRange ? CELL_LEVEL_STYLES[cell.level] : 'border-transparent bg-transparent',
                            cell.isInRange
                              ? 'hover:-translate-y-px focus-visible:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus-outline)] focus-visible:ring-offset-2'
                              : '',
                            isActive && cell.isInRange && !isSelected ? 'ring-2 ring-slate-900/15 ring-offset-1' : '',
                            isSelected && cell.isInRange ? 'ring-2 ring-[var(--color-accent)] ring-offset-2' : '',
                          ].join(' ')}
                          disabled={!cell.isInRange}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[14px] border border-[color:var(--color-line)] bg-[var(--color-surface-muted)] p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium text-[color:var(--color-text-muted)]">Completed Tasks</p>
              <h3 className="mt-1 text-lg font-semibold text-[color:var(--color-text)]">
                {selectedDateKey ? formatDateKeyLabel(selectedDateKey) : 'Select a heatmap day'}
              </h3>
            </div>

            {selectedCell ? (
              <span className="ui-chip ui-tabular">
                {formatCompletionLabel(selectedCell.dateKey, selectedCell.count)}
              </span>
            ) : null}
          </div>

          <div className="mt-4">
            {!selectedDateKey ? (
              <p className="rounded-[12px] border border-dashed border-[color:var(--color-line)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[color:var(--color-text-muted)]">
                Click any day cell to inspect the tasks completed on that date.
              </p>
            ) : null}

            {selectedDateKey && isTaskListLoading ? (
              <div className="space-y-3" aria-live="polite">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-20 animate-pulse rounded-[12px] bg-[var(--color-surface)]" />
                ))}
              </div>
            ) : null}

            {selectedDateKey && taskListError && !isTaskListLoading ? (
              <p className="rounded-[12px] border border-[color:var(--color-danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[color:var(--color-danger)]">
                {taskListError}
              </p>
            ) : null}

            {selectedDateKey && !isTaskListLoading && !taskListError && visibleCompletedTasks.length === 0 ? (
              <p className="rounded-[12px] border border-[color:var(--color-line)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[color:var(--color-text-muted)]">
                {onlyInProgress
                  ? 'No in-progress tasks match the global filter for this completed-task list.'
                  : 'No tasks were completed on this day.'}
              </p>
            ) : null}

            {selectedDateKey && !isTaskListLoading && !taskListError && visibleCompletedTasks.length > 0 ? (
              <div className="space-y-3">
                {visibleCompletedTasks.map((task) => (
                  <CompletedTaskCard key={task._id} task={task} />
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <p className="text-xs text-[color:var(--color-text-muted)]">
          Range: {formatDateKeyLabel(heatmap.rangeStartKey)} to {formatDateKeyLabel(heatmap.rangeEndKey)}
        </p>
      </div>
    </section>
  );
};

export default ActivityHeatmap;
