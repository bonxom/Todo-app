import { useMemo, useState } from 'react';
import { createHeatmapModel, formatDateKeyLabel } from './statsUtils';

const CELL_LEVEL_STYLES = [
  'bg-slate-200 border-slate-300/80',
  'bg-emerald-100 border-emerald-200',
  'bg-emerald-300 border-emerald-400/80',
  'bg-teal-500 border-teal-600/80',
  'bg-slate-900 border-slate-900',
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

const formatCompletionLabel = (dateKey, count) => {
  const taskLabel = count === 1 ? 'task completed' : 'tasks completed';
  return `${formatDateKeyLabel(dateKey)}: ${count} ${taskLabel}`;
};

const SummaryPill = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
    <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
  </div>
);

const ActivityHeatmap = ({ dailyStats = [], isLoading = false, errorMessage = '' }) => {
  const [activeDateKey, setActiveDateKey] = useState(null);
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

  if (isLoading) {
    return (
      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">Completion Rhythm</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">Daily activity heatmap</h2>
          <p className="mt-2 text-sm text-slate-600">Building the last 365 days of completed task activity…</p>
        </div>
        <div className="space-y-5 px-6 py-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
          <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="overflow-hidden rounded-[1.75rem] border border-rose-200 bg-white shadow-sm">
        <div className="px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-600">Completion Rhythm</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">Daily activity heatmap</h2>
          <p className="mt-4 max-w-2xl text-sm text-slate-600">{errorMessage}</p>
        </div>
      </section>
    );
  }

  const bestDayLabel = heatmap.bestDay?.count
    ? `${heatmap.bestDay.count} on ${formatDateKeyLabel(heatmap.bestDay.dateKey)}`
    : 'No activity yet';
  const hasNoCompletedTasks = heatmap.totalCompleted === 0;

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-white px-6 py-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">Completion Rhythm</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">Daily activity heatmap</h2>
            <p className="mt-2 text-sm text-slate-600">
              A year-long ledger of completed tasks. Darker cells mark heavier completion days, and missing dates are shown as zero activity.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryPill label="Completed" value={heatmap.totalCompleted} />
            <SummaryPill label="Active Days" value={heatmap.activeDays} />
            <SummaryPill label="Best Day" value={bestDayLabel} />
          </div>
        </div>
      </div>

      <div className="space-y-5 px-6 py-6">
        {hasNoCompletedTasks ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            No completed tasks in this range yet. Finish a task to start building your activity history.
          </p>
        ) : null}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Hover Detail</p>
            <p className="mt-2 text-sm font-medium text-slate-800">
              {activeCell ? formatCompletionLabel(activeCell.dateKey, activeCell.count) : 'No day selected'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
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
                  className="flex h-4 items-center text-[10px] font-medium text-slate-400"
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
                    className="w-4 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400"
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

                      return (
                        <button
                          key={cell.dateKey}
                          type="button"
                          title={tooltipLabel}
                          aria-label={tooltipLabel}
                          onMouseEnter={() => setActiveDateKey(cell.dateKey)}
                          onFocus={() => setActiveDateKey(cell.dateKey)}
                          onMouseLeave={() => setActiveDateKey(null)}
                          onBlur={() => setActiveDateKey(null)}
                          className={[
                            'h-4 w-4 rounded-[4px] border transition-transform duration-150',
                            cell.isInRange ? CELL_LEVEL_STYLES[cell.level] : 'border-transparent bg-transparent',
                            cell.isInRange ? 'hover:-translate-y-px focus-visible:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2' : '',
                            isActive && cell.isInRange ? 'ring-2 ring-slate-900/20 ring-offset-1' : '',
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

        <p className="text-xs text-slate-500">
          Range: {formatDateKeyLabel(heatmap.rangeStartKey)} to {formatDateKeyLabel(heatmap.rangeEndKey)}
        </p>
      </div>
    </section>
  );
};

export default ActivityHeatmap;
