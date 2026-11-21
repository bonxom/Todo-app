import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock, ListTodo, TrendingUp } from "lucide-react";
import GlassPanel from "./GlassPanel";
import type { Stat } from "@/shared/types/domain";

export interface DashboardSummaryProps {
  stats?: Stat;
  isLoading: boolean;
  isError: boolean;
  overdueCount?: number;
  highPriorityCount?: number;
}

export default function DashboardSummary({
  stats,
  isLoading,
  isError,
  overdueCount = 0,
  highPriorityCount = 0,
}: DashboardSummaryProps) {
  const { t } = useTranslation("v2");

  const total = stats?.totalTasks ?? 0;
  const completed = stats?.completedTasks ?? 0;
  const pending = stats?.pendingTasks ?? 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const recent7DaysCompleted = (stats?.dailyStats ?? [])
    .slice(-7)
    .reduce((sum, item) => sum + (item.completedTasks || 0), 0);

  const cards = [
    {
      id: "total",
      label: t("total"),
      value: stats ? stats.totalTasks : undefined,
      badge: stats ? t("completionRateBadge", { rate: completionRate }) : null,
      sub: stats ? t("completedPendingSub", { completed, pending }) : undefined,
      progress: stats ? completionRate : undefined,
      icon: ListTodo,
      color: "var(--v2-accent)",
    },
    {
      id: "inProgress",
      label: t("inProgress"),
      value: stats ? stats.inProgressTasks : undefined,
      badge: stats ? t("inProgressBadge") : null,
      sub: stats ? t("inProgressSub") : undefined,
      icon: Clock,
      color: "var(--v2-warning)",
    },
    {
      id: "completed",
      label: t("completed"),
      value: stats ? stats.completedTasks : undefined,
      badge: stats ? t("completedBadge") : null,
      sub: stats
        ? t("completedSub", { count: recent7DaysCompleted || completed })
        : undefined,
      icon: CheckCircle2,
      color: "var(--v2-success)",
    },
    {
      id: "completionRate",
      label: t("completionRateLabel"),
      value: stats ? `${completionRate}%` : undefined,
      badge: stats
        ? overdueCount > 0
          ? t("attentionOverdueBadge", { count: overdueCount })
          : t("attentionClearBadge")
        : null,
      badgeTone: overdueCount > 0 ? "danger" : "success",
      sub: stats
        ? t("attentionSub", { pending, high: highPriorityCount })
        : undefined,
      progress: stats ? completionRate : undefined,
      icon: TrendingUp,
      color: "var(--v2-accent)",
    },
  ];

  return (
    <section
      aria-label={t("summary")}
      className="v2-summary grid grid-cols-2 lg:grid-cols-4 gap-[14px] [@media(max-width:767px)]:gap-[10px]"
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <GlassPanel
            key={card.id}
            className="v2-summary-item flex flex-col justify-between items-stretch relative [@media(max-width:767px)]:[&_p]:[letter-spacing:0.2px]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--v2-muted)] truncate">
                  {card.label}
                </p>
                <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
                  {isLoading ? (
                    <span
                      aria-busy="true"
                      className="inline-block h-8 w-12 rounded bg-[var(--v2-muted)]/20 animate-pulse"
                    />
                  ) : isError || card.value === undefined ? (
                    <span className="text-2xl font-bold tracking-tight text-[var(--v2-muted)]">
                      —
                    </span>
                  ) : (
                    <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--v2-ink)] tabular-nums">
                      {card.value}
                    </span>
                  )}
                  {!isLoading && !isError && card.badge && (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        card.badgeTone === "danger"
                          ? "bg-[color-mix(in_srgb,var(--v2-danger,var(--v2-warning))_15%,transparent)] text-[var(--v2-danger,var(--v2-warning))]"
                          : card.badgeTone === "success"
                            ? "bg-[color-mix(in_srgb,var(--v2-success)_15%,transparent)] text-[var(--v2-success)]"
                            : "bg-[color-mix(in_srgb,var(--v2-accent)_14%,transparent)] text-[var(--v2-accent)]"
                      }`}
                    >
                      {card.badge}
                    </span>
                  )}
                </div>
              </div>
              <div
                className="v2-summary-icon w-[40px] h-[40px] shrink-0 [border:1px_solid_var(--v2-border)] rounded-[50%] grid place-items-center
                [background:var(--v2-shell-fill)] [@media(max-width:767px)]:[display:none]"
                style={{ color: card.color }}
              >
                <Icon size={20} aria-hidden="true" />
              </div>
            </div>

            {!isLoading && !isError && (
              <div className="mt-3 space-y-1.5">
                {card.progress !== undefined && (
                  <div
                    className="h-1.5 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--v2-accent)_14%,transparent)]"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full bg-[var(--v2-accent)] transition-all duration-300"
                      style={{
                        width: `${Math.min(Math.max(card.progress, 0), 100)}%`,
                      }}
                    />
                  </div>
                )}
                {card.sub && (
                  <p className="text-xs text-[var(--v2-muted)] truncate">
                    {card.sub}
                  </p>
                )}
              </div>
            )}
          </GlassPanel>
        );
      })}
    </section>
  );
}
