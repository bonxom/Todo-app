import { useMemo } from 'react';
import DonutChartCard from './DonutChartCard';

const STATUS_COLORS = {
  Pending: '#A46A2A',
  'In Progress': '#456B8C',
  Completed: '#2F7D5A',
  'Given Up': '#7A7F87',
};

const StatusPieChart = ({ stats }) => {
  const chartData = useMemo(() => {
    if (!stats) {
      return { items: [], total: 0 };
    }

    const items = [
      { label: 'Pending', value: stats.pendingTasks || 0 },
      { label: 'In Progress', value: stats.inProgressTasks || 0 },
      { label: 'Completed', value: stats.completedTasks || 0 },
      { label: 'Given Up', value: stats.givenUpTasks || 0 },
    ]
      .filter((item) => item.value > 0)
      .map((item) => ({ ...item, color: STATUS_COLORS[item.label] }));

    const total = items.reduce((sum, item) => sum + item.value, 0);

    return {
      items: items.map((item) => ({
        ...item,
        percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0',
      })),
      total,
    };
  }, [stats]);

  return (
    <DonutChartCard
      title="Task Status Mix"
      total={chartData.total}
      totalLabel="Tasks"
      items={chartData.items}
      emptyMessage="No tasks yet."
    />
  );
};

export default StatusPieChart;
