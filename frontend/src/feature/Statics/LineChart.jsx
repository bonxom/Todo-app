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
  Filler
} from 'chart.js';
import {
  formatUtcDateLabel,
  getDateKeysInRange,
  getUtcTodayKey,
  shiftUtcDateKey,
} from './statsUtils';

// Register Chart.js components
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

const LineChart = ({ dailyStats }) => {
  const todayKey = getUtcTodayKey();
  const [startDate, setStartDate] = useState(() => shiftUtcDateKey(todayKey, -29));
  const [endDate, setEndDate] = useState(todayKey);

  const chartData = useMemo(() => {
    if (!dailyStats || dailyStats.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    const dataMap = new Map();
    dailyStats.forEach((stat) => {
      const dateKey = stat.dateKey;

      if (!dateKey) {
        return;
      }

      dataMap.set(dateKey, stat);
    });

    const allDates = getDateKeysInRange(startDate, endDate);
    const labels = [];
    const completed = [];
    const givenUp = [];

    allDates.forEach((dateKey) => {
      const stat = dataMap.get(dateKey);

      labels.push(formatUtcDateLabel(dateKey, { month: 'short', day: 'numeric' }));
      completed.push(stat?.completedTasks || 0);
      givenUp.push(stat?.givenUpTasks || 0);
    });

    return {
      labels,
      datasets: [
        {
          label: 'Completed Tasks',
          data: completed,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true,
          pointRadius: 6,
          pointHoverRadius: 10,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: '#10b981',
          pointHoverBorderColor: '#fff',
        },
        {
          label: 'Given Up Tasks',
          data: givenUp,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
          fill: true,
          pointRadius: 6,
          pointHoverRadius: 10,
          pointBackgroundColor: '#ef4444',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: '#ef4444',
          pointHoverBorderColor: '#fff',
        }
      ]
    };
  }, [dailyStats, startDate, endDate]);

  const setQuickRange = (days) => {
    const nextEndDate = getUtcTodayKey();
    setStartDate(shiftUtcDateKey(nextEndDate, -(days - 1)));
    setEndDate(nextEndDate);
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 13,
            family: "'Inter', sans-serif"
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false
        },
        ticks: {
          font: {
            size: 12
          },
          maxRotation: 45,
          minRotation: 0
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false
        },
        ticks: {
          font: {
            size: 12
          },
          precision: 0
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">
          Daily Tasks Trend
        </h2>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => setQuickRange(7)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
            >
              7D
            </button>
            <button
              onClick={() => setQuickRange(14)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
            >
              14D
            </button>
            <button
              onClick={() => setQuickRange(30)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
            >
              30D
            </button>
            <button
              onClick={() => setQuickRange(90)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
            >
              90D
            </button>
          </div>
        </div>
      </div>
      
      <div className="relative h-80">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default LineChart;
