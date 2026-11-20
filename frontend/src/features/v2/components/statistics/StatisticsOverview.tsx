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
      className="v2-statistics-overview flex flex-col gap-[1rem]"
    >
      <div className="v2-statistics-metric-grid grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-[0.75rem]">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <GlassPanel
              key={metric.key}
              className="v2-summary-item items-center relative [@media(max-width:767px)]:[&_p]:[letter-spacing:0.2px]
                v2-statistics-metric-card flex-row min-w-[0] [@media(max-width:600px)]:[&:last-child]:col-[1_/_-1]"
            >
              <div className="min-w-0">
                <p className="v2-statistics-metric-label text-[0.75rem] [font-weight:600] uppercase [letter-spacing:0.05em] text-[var(--v2-muted)]">
                  {metric.label}
                </p>
                <span className="v2-statistics-metric-value text-[1.875rem] [font-weight:700] text-[var(--v2-ink)] [font-variant-numeric:tabular-nums] [line-height:1.1] [letter-spacing:-0.02em] mt-1.5 block">
                  {metric.value}
                </span>
              </div>
              <div
                className="v2-summary-icon w-[44px] h-[44px] [border:1px_solid_var(--v2-border)] rounded-[50%] grid place-items-center
                  [background:var(--v2-shell-fill)] [@media(max-width:767px)]:[display:none] shrink-0"
                style={{ color: metric.color }}
              >
                <Icon size={22} aria-hidden="true" />
              </div>
            </GlassPanel>
          );
        })}
      </div>

      <GlassPanel className="v2-workspace-panel overflow-hidden v2-statistics-track-card flex flex-col gap-[0.75rem]">
        <div className="v2-statistics-track-header flex justify-between items-center text-[0.875rem] [font-weight:600] text-[var(--v2-ink)] [@media(max-width:600px)]:gap-[1rem]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--v2-ink)]">
              {t("statisticsPage.allTimeCompletionRate")}
            </span>
          </div>
          <span className="v2-statistics-track-rate text-[1.375rem] [font-weight:800] text-[var(--v2-accent,#14675f)] [font-variant-numeric:tabular-nums] [letter-spacing:-0.02em]">
            {rate}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={rate}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("statisticsPage.completionRate")}
          className="v2-statistics-progress-bg w-full h-[0.75rem] rounded-[9999px] overflow-hidden relative"
        >
          <div
            className="v2-statistics-progress-fill h-full rounded-[9999px]"
            style={{ width: `${rate}%` }}
          />
        </div>
      </GlassPanel>
    </section>
  );
}
