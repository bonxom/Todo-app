import { useTranslation } from "react-i18next";
import {
  ListTodo,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { useTheme } from "@/shared/theme/theme";
import GlassPanel from "../GlassPanel";
import { completionRate } from "./statisticsModel";
import type { Stat } from "@/shared/types/domain";

export interface StatisticsOverviewProps {
  stats: Stat;
}

export default function StatisticsOverview({ stats }: StatisticsOverviewProps) {
  const { t, i18n } = useTranslation("v2");
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const locale = i18n.language || "en";
  const rate = completionRate(stats);

  const metrics = [
    {
      key: "total",
      label: t("total"),
      value: (stats.totalTasks || 0).toLocaleString(locale),
      icon: ListTodo,
      color: isDark ? "#38bdf8" : "#0284c7",
      bg: isDark ? "rgba(56, 189, 248, 0.14)" : "rgba(2, 132, 199, 0.1)",
    },
    {
      key: "completed",
      label: t("completed"),
      value: (stats.completedTasks || 0).toLocaleString(locale),
      icon: CheckCircle2,
      color: isDark ? "#2dd4bf" : "#14675f",
      bg: isDark ? "rgba(45, 212, 191, 0.14)" : "rgba(20, 103, 95, 0.1)",
    },
    {
      key: "inProgress",
      label: t("inProgress"),
      value: (stats.inProgressTasks || 0).toLocaleString(locale),
      icon: Clock,
      color: isDark ? "#fbbf24" : "#d97706",
      bg: isDark ? "rgba(251, 191, 36, 0.14)" : "rgba(217, 119, 6, 0.1)",
    },
    {
      key: "pending",
      label: t("pending"),
      value: (stats.pendingTasks || 0).toLocaleString(locale),
      icon: AlertCircle,
      color: isDark ? "#adc5c8" : "#526c72",
      bg: isDark ? "rgba(173, 197, 200, 0.14)" : "rgba(82, 108, 114, 0.1)",
    },
    {
      key: "givenUp",
      label: t("givenUp"),
      value: (stats.givenUpTasks || 0).toLocaleString(locale),
      icon: XCircle,
      color: isDark ? "#f87171" : "#ef4444",
      bg: isDark ? "rgba(248, 113, 113, 0.14)" : "rgba(239, 68, 68, 0.1)",
    },
  ];

  return (
    <section
      aria-label={t("statisticsPage.allTimeOverview")}
      className="v2-statistics-overview"
    >
      <div className="v2-statistics-metric-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <GlassPanel
              key={metric.key}
              className="v2-summary-item v2-statistics-metric-card"
            >
              <div className="min-w-0">
                <p className="v2-statistics-metric-label">{metric.label}</p>
                <span className="v2-statistics-metric-value mt-1.5 block">
                  {metric.value}
                </span>
              </div>
              <div
                className="v2-summary-icon shrink-0"
                style={{ color: metric.color }}
              >
                <Icon size={22} aria-hidden="true" />
              </div>
            </GlassPanel>
          );
        })}
      </div>

      <GlassPanel className="v2-workspace-panel v2-statistics-track-card">
        <div className="v2-statistics-track-header">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--v2-ink)]">
              {t("statisticsPage.allTimeCompletionRate")}
            </span>
          </div>
          <span className="v2-statistics-track-rate">{rate}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={rate}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("statisticsPage.completionRate")}
          className="v2-statistics-progress-bg"
        >
          <div
            className="v2-statistics-progress-fill"
            style={{ width: `${rate}%` }}
          />
        </div>
      </GlassPanel>
    </section>
  );
}
