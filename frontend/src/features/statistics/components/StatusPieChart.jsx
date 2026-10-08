import { useMemo } from "react";
import DonutChartCard from "./DonutChartCard";

const STATUS_COLORS = {
  Pending: "var(--color-warning)",
  "In Progress": "var(--color-accent)",
  Completed: "var(--color-success)",
  "Given Up": "var(--color-text-muted)",
};

const StatusPieChart = ({ stats }) => {
  const chartData = useMemo(() => {
    if (!stats) {
      return { items: [], total: 0 };
    }

    const items = [
      { label: "Pending", value: stats.pendingTasks || 0 },
      { label: "In Progress", value: stats.inProgressTasks || 0 },
      { label: "Completed", value: stats.completedTasks || 0 },
      { label: "Given Up", value: stats.givenUpTasks || 0 },
    ]
      .filter((item) => item.value > 0)
      .map((item) => ({ ...item, color: STATUS_COLORS[item.label] }));

    const total = items.reduce((sum, item) => sum + item.value, 0);

    return {
      items: items.map((item) => ({
        ...item,
        percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0",
      })),
      total,
    };
  }, [stats]);

  return (
    <DonutChartCard
      title="Where things stand"
      description="A snapshot of your task collection."
      total={chartData.total}
      totalLabel="Tasks"
      items={chartData.items}
      emptyMessage="No tasks yet."
    />
  );
};

export default StatusPieChart;
