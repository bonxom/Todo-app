import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock, ListTodo } from "lucide-react";
import GlassPanel from "./GlassPanel";
import type { Stat } from "@/shared/types/domain";

export interface DashboardSummaryProps {
  stats?: Stat;
  isLoading: boolean;
  isError: boolean;
}

export default function DashboardSummary({
  stats,
  isLoading,
  isError,
}: DashboardSummaryProps) {
  const { t } = useTranslation("v2");

  const cards = [
    {
      id: "total",
      label: t("total"),
      value: stats ? stats.totalTasks : undefined,
      icon: ListTodo,
      color: "var(--v2-accent)",
    },
    {
      id: "inProgress",
      label: t("inProgress"),
      value: stats ? stats.inProgressTasks : undefined,
      icon: Clock,
      color: "var(--v2-warning)",
    },
    {
      id: "completed",
      label: t("completed"),
      value: stats ? stats.completedTasks : undefined,
      icon: CheckCircle2,
      color: "var(--v2-success)",
    },
  ];

  return (
    <section
      aria-label={t("summary")}
      className="v2-summary grid grid-cols-[repeat(3,minmax(0,1fr))] gap-[16px] [@media(max-width:767px)]:gap-[8px]"
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <GlassPanel
            key={card.id}
            className="v2-summary-item items-center relative [@media(max-width:767px)]:[&_p]:[letter-spacing:0.2px]"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--v2-muted)]">
                {card.label}
              </p>
              <div className="mt-1.5 flex items-baseline">
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
              </div>
            </div>
            <div
              className="v2-summary-icon w-[44px] h-[44px] [border:1px_solid_var(--v2-border)] rounded-[50%] grid place-items-center
              [background:var(--v2-shell-fill)] [@media(max-width:767px)]:[display:none]"
              style={{ color: card.color }}
            >
              <Icon size={22} aria-hidden="true" />
            </div>
          </GlassPanel>
        );
      })}
    </section>
  );
}
