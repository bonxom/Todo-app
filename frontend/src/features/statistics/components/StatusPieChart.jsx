import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import DonutChartCard from "./DonutChartCard";

const STATUS_COLORS = {
  Pending: "var(--color-warning)",
  "In Progress": "var(--color-accent)",
  Completed: "var(--color-success)",
  "Given Up": "var(--color-text-muted)",
};

const StatusPieChart = ({ stats }) => {
  const { t } = useTranslation("workspace");

  const chartData = useMemo(() => {
    if (!stats) {
      return { items: [], total: 0 };
    }

    const items = [
      { label: t("pending"), value: stats.pendingTasks || 0 },
      {
        label: t("inProgressCasedInProgress"),
        value: stats.inProgressTasks || 0,
      },
      { label: t("completed"), value: stats.completedTasks || 0 },
      { label: t("givenUpCasedGivenUp"), value: stats.givenUpTasks || 0 },
    ]
      .filter((item) => item.value > 0)
      .map((item) => ({
        ...item,
        color: [
          STATUS_COLORS.Pending,
          STATUS_COLORS["In Progress"],
          STATUS_COLORS.Completed,
          STATUS_COLORS["Given Up"],
        ][
          [
            t("pending"),
            t("inProgressCasedInProgress"),
            t("completed"),
            t("givenUpCasedGivenUp"),
          ].indexOf(item.label)
        ],
      }));

    const total = items.reduce((sum, item) => sum + item.value, 0);

    return {
      items: items.map((item) => ({
        ...item,
        percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0",
      })),
      total,
    };
  }, [stats, t]);

  return (
    <DonutChartCard
      title={t("whereThingsStand")}
      description={t("aSnapshotOfYourTaskCollection")}
      total={chartData.total}
      totalLabel={t("tasks")}
      items={chartData.items}
      emptyMessage={t("noTasksYet")}
    />
  );
};

export default StatusPieChart;
