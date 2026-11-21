import { useTranslation } from "react-i18next";
import { AlertTriangle, Clock, ListChecks, Sparkles } from "lucide-react";
import GlassPanel from "./GlassPanel";
import type { Stat, TaskStatus } from "@/shared/types/domain";

export interface DashboardFocusStripProps {
  stats?: Stat;
  overdueCount: number;
  highPriorityCount: number;
  activeStatus: TaskStatus | "";
  onSelectStatus: (status: TaskStatus | "") => void;
  onQuickChatSend: (prompt: string) => void;
}

export default function DashboardFocusStrip({
  stats,
  overdueCount,
  highPriorityCount,
  activeStatus,
  onSelectStatus,
  onQuickChatSend,
}: DashboardFocusStripProps) {
  const { t } = useTranslation("v2");
  const inProgressCount = stats?.inProgressTasks ?? 0;
  const pendingCount = stats?.pendingTasks ?? 0;

  return (
    <GlassPanel
      as="section"
      data-testid="v2-dashboard-focus"
      aria-label={t("todayFocusTitle")}
      className="v2-focus-strip flex flex-col gap-3.5 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight text-[var(--v2-ink)]">
            {t("todayFocusTitle")}
          </h2>
          <p className="mt-0.5 text-xs text-[var(--v2-muted)]">
            {t("todayFocusSubtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onQuickChatSend(t("askAiPlanTodayPrompt"))}
          className="v2-btn v2-glass-pill text-xs font-semibold"
        >
          <Sparkles
            size={15}
            className="text-[var(--v2-accent)]"
            aria-hidden="true"
          />
          <span>{t("askAiPlanToday")}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {/* Bucket 1: Overdue & High Priority */}
        <article className="flex flex-col justify-between gap-2.5 rounded-2xl border border-[var(--v2-border)] bg-[var(--v2-input-fill)] p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--v2-warning)_16%,transparent)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--v2-warning)]">
              <AlertTriangle size={12} aria-hidden="true" />
              {t("focusBucketOverdueBadge")}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--v2-ink)]">
              {t("focusBucketOverdueTitle")}
            </h3>
            <p className="mt-0.5 text-xs text-[var(--v2-muted)]">
              {t("focusBucketOverdueDesc", {
                overdue: overdueCount,
                high: highPriorityCount,
              })}
            </p>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => onQuickChatSend(t("focusBucketOverduePrompt"))}
              className="v2-btn min-h-[32px] px-3 py-1 text-xs font-semibold"
            >
              <Sparkles size={13} aria-hidden="true" />
              <span>{t("focusBucketOverdueAction")}</span>
            </button>
          </div>
        </article>

        {/* Bucket 2: In Progress Now */}
        <article className="flex flex-col justify-between gap-2.5 rounded-2xl border border-[var(--v2-border)] bg-[var(--v2-input-fill)] p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--v2-accent)_15%,transparent)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--v2-accent)]">
              <Clock size={12} aria-hidden="true" />
              {t("focusBucketActiveBadge")}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--v2-ink)]">
              {t("focusBucketActiveTitle")}
            </h3>
            <p className="mt-0.5 text-xs text-[var(--v2-muted)]">
              {t("focusBucketActiveDesc", { count: inProgressCount })}
            </p>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              aria-pressed={activeStatus === "in-progress"}
              onClick={() =>
                onSelectStatus(
                  activeStatus === "in-progress" ? "" : "in-progress",
                )
              }
              className={`v2-btn min-h-[32px] px-3 py-1 text-xs font-semibold ${
                activeStatus === "in-progress" ? "v2-btn-primary" : ""
              }`}
            >
              <span>
                {activeStatus === "in-progress"
                  ? t("focusResetFilter")
                  : t("focusBucketActiveAction")}
              </span>
            </button>
          </div>
        </article>

        {/* Bucket 3: Pending Queue */}
        <article className="flex flex-col justify-between gap-2.5 rounded-2xl border border-[var(--v2-border)] bg-[var(--v2-input-fill)] p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--v2-success)_15%,transparent)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--v2-success)]">
              <ListChecks size={12} aria-hidden="true" />
              {t("focusBucketPendingBadge")}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--v2-ink)]">
              {t("focusBucketPendingTitle")}
            </h3>
            <p className="mt-0.5 text-xs text-[var(--v2-muted)]">
              {t("focusBucketPendingDesc", { count: pendingCount })}
            </p>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              aria-pressed={activeStatus === "pending"}
              onClick={() =>
                onSelectStatus(activeStatus === "pending" ? "" : "pending")
              }
              className={`v2-btn min-h-[32px] px-3 py-1 text-xs font-semibold ${
                activeStatus === "pending" ? "v2-btn-primary" : ""
              }`}
            >
              <span>
                {activeStatus === "pending"
                  ? t("focusResetFilter")
                  : t("focusBucketPendingAction")}
              </span>
            </button>
          </div>
        </article>
      </div>
    </GlassPanel>
  );
}
