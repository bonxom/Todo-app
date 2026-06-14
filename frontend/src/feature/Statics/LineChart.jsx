import { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import {
  formatUtcDateLabel,
  getDateKeysInRange,
  getUtcTodayKey,
  shiftUtcDateKey,
} from './statsUtils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const QUICK_RANGES = [7, 14, 30, 90];
const AXIS_TEXT = '#667085';
const GRID_COLOR = 'rgba(31, 35, 40, 0.08)';
const COMPLETED_COLOR = '#2F7D5A';
const COMPLETED_FILL = 'rgba(47, 125, 90, 0.12)';
const GIVEN_UP_COLOR = '#B25547';
const GIVEN_UP_FILL = 'rgba(178, 85, 71, 0.08)';

const formatRangeLabel = (startDate, endDate) => {
  const startLabel = formatUtcDateLabel(startDate, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const endLabel = formatUtcDateLabel(endDate, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return `${startLabel} to ${endLabel}`;
};

const isQuickRangeActive = (days, startDate, endDate, todayKey) => {
  return endDate === todayKey && startDate === shiftUtcDateKey(todayKey, -(days - 1));
};

const LineChart = ({ dailyStats }) => {
  const todayKey = getUtcTodayKey();
  const [startDate, setStartDate] = useState(() => shiftUtcDateKey(todayKey, -29));
  const [endDate, setEndDate] = useState(todayKey);

  const chartData = useMemo(() => {
    if (!dailyStats || dailyStats.length === 0) {
      return {
        labels: [],
        datasets: [],
        dateKeys: [],
      };
    }

    const dataMap = new Map();
    dailyStats.forEach((stat) => {
      if (stat.dateKey) {
        dataMap.set(stat.dateKey, stat);
      }
    });

    const allDates = getDateKeysInRange(startDate, endDate);
    const labels = [];
    const dateKeys = [];
    const completed = [];
    const givenUp = [];

    allDates.forEach((dateKey) => {
      const stat = dataMap.get(dateKey);

      dateKeys.push(dateKey);
      labels.push(formatUtcDateLabel(dateKey, { month: 'short', day: 'numeric' }));
      completed.push(stat?.completedTasks || 0);
      givenUp.push(stat?.givenUpTasks || 0);
    });

    return {
      labels,
      dateKeys,
      datasets: [
        {
          label: 'Completed Tasks',
          data: completed,
          borderColor: COMPLETED_COLOR,
          backgroundColor: COMPLETED_FILL,
          borderWidth: 2,
          tension: 0.3,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointBackgroundColor: COMPLETED_COLOR,
          pointBorderColor: '#fff',
          pointBorderWidth: 1.5,
        },
        {
          label: 'Given Up Tasks',
          data: givenUp,
          borderColor: GIVEN_UP_COLOR,
          backgroundColor: GIVEN_UP_FILL,
          borderWidth: 2,
          tension: 0.3,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointBackgroundColor: GIVEN_UP_COLOR,
          pointBorderColor: '#fff',
          pointBorderWidth: 1.5,
        },
      ],
    };
  }, [dailyStats, startDate, endDate]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          boxHeight: 8,
          padding: 18,
          color: AXIS_TEXT,
          font: {
            size: 12,
            weight: '600',
          },
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(31, 35, 40, 0.92)',
        padding: 10,
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        callbacks: {
          title: (tooltipItems) => {
            const item = tooltipItems[0];
            const dateKey = chartData.dateKeys[item.dataIndex];

            return dateKey
              ? formatUtcDateLabel(dateKey, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : item.label;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: GRID_COLOR,
          drawBorder: false,
        },
        ticks: {
          color: AXIS_TEXT,
          font: {
            size: 11,
          },
          maxRotation: 0,
          autoSkipPadding: 14,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: GRID_COLOR,
          drawBorder: false,
        },
        ticks: {
          color: AXIS_TEXT,
          font: {
            size: 11,
          },
          precision: 0,
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  }), [chartData.dateKeys]);

  const setQuickRange = (days) => {
    const nextEndDate = getUtcTodayKey();
    setStartDate(shiftUtcDateKey(nextEndDate, -(days - 1)));
    setEndDate(nextEndDate);
  };

  const rangeLabel = formatRangeLabel(startDate, endDate);
  const hasNoData = chartData.labels.length === 0;

  return (
    <section className="ui-section-card ui-card-padding">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[color:var(--color-text)]">Daily Completion Trend</h2>
          <p className="mt-2 max-w-2xl text-sm text-[color:var(--color-text-muted)]">
            Compare completed and given-up tasks over time without the extra dashboard chrome.
          </p>
        </div>
        <span className="ui-chip ui-tabular">{rangeLabel}</span>
      </div>

      <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-[color:var(--color-text)]">
            <span>From</span>
            <input
              type="date"
              name="stats_range_start"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              max={endDate}
              className="ui-input min-w-[11rem]"
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-[color:var(--color-text)]">
            <span>To</span>
            <input
              type="date"
              name="stats_range_end"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              min={startDate}
              className="ui-input min-w-[11rem]"
              autoComplete="off"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_RANGES.map((days) => {
            const isActive = isQuickRangeActive(days, startDate, endDate, todayKey);

            return (
              <button
                key={days}
                type="button"
                onClick={() => setQuickRange(days)}
                aria-pressed={isActive}
                className={`inline-flex min-h-[2.25rem] items-center justify-center rounded-full border px-3.5 text-xs font-semibold transition-[background-color,border-color,color] duration-150 ${
                  isActive
                    ? 'border-transparent bg-[var(--color-accent-soft)] text-[color:var(--color-accent)]'
                    : 'border-[color:var(--color-line)] bg-[var(--color-surface)] text-[color:var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[color:var(--color-text)]'
                }`}
              >
                {days}D
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        {hasNoData ? (
          <div className="flex h-80 items-center justify-center rounded-[12px] border border-dashed border-[color:var(--color-line)] bg-[var(--color-surface-muted)] px-4 text-sm text-[color:var(--color-text-muted)]">
            No trend data available for this date range.
          </div>
        ) : (
          <div className="relative h-80 rounded-[12px] border border-[color:var(--color-line)] bg-[var(--color-surface)] p-3">
            <Line data={chartData} options={options} />
          </div>
        )}
      </div>
    </section>
  );
};

export default LineChart;
