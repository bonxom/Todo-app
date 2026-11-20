import { useTranslation } from "react-i18next";
import { RefreshCw, AlertCircle } from "lucide-react";
import { useStatsQuery } from "@/features/statistics/api/statQueries";
import { getApiErrorMessage } from "@/shared/services/apiError";
import GlassPanel from "../components/GlassPanel";
import StatisticsOverview from "../components/statistics/StatisticsOverview";
import StatisticsTrend from "../components/statistics/StatisticsTrend";
import StatisticsActivity from "../components/statistics/StatisticsActivity";
import StatisticsBreakdowns from "../components/statistics/StatisticsBreakdowns";

export default function StatisticsPage() {
  const { t } = useTranslation("v2");
  const statsQuery = useStatsQuery();

  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = statsQuery;

  // Initial loading state (no cached data yet)
  if (isLoading && !stats) {
    return (
      <div
        className="v2-statistics flex flex-col gap-[1.5rem] w-full max-w-[1200px] m-[0_auto] min-w-[0]"
        data-testid="v2-statistics-page"
      >
        <h1 className="sr-only">{t("statisticsPage.title")}</h1>

        <div
          data-testid="statistics-loading-skeleton"
          className="v2-statistics-skeleton flex flex-col gap-[1.5rem] w-full"
          aria-busy="true"
          aria-label={t("statisticsPage.loading")}
        >
          <div className="v2-statistics-skeleton-box h-[120px] rounded-[1rem]" />
          <div className="v2-statistics-skeleton-box h-[80px] rounded-[1rem]" />
          <div className="v2-statistics-skeleton-box h-[280px] rounded-[1rem]" />
        </div>
      </div>
    );
  }

  // Initial failure state (no cached data)
  if (isError && !stats) {
    const errorMsg = getApiErrorMessage(
      error,
      t("errorLoadingStats", "Failed to load statistics."),
    );

    return (
      <div
        className="v2-statistics flex flex-col gap-[1.5rem] w-full max-w-[1200px] m-[0_auto] min-w-[0]"
        data-testid="v2-statistics-page"
      >
        <h1 className="sr-only">{t("statisticsPage.title")}</h1>

        <GlassPanel
          className="v2-statistics-alert rounded-[0.75rem] flex items-center justify-between gap-[1rem] text-[0.875rem]"
          role="alert"
        >
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="v2-statistics-link inline-flex items-center gap-[0.5rem] p-[0.5rem_1.125rem] [background:var(--v2-input-fill)]
              [border:1px_solid_var(--v2-border)] rounded-[9999px] [backdrop-filter:blur(12px)]
              [-webkit-backdrop-filter:blur(12px)] [text-decoration:none] [&:hover]:[background:var(--v2-accent,#14675f)]
              [&:hover]:border-[var(--v2-accent,#14675f)] [&:focus-visible]:[outline:2px_solid_var(--v2-accent)]
              [&:focus-visible]:outline-offset-[2px] cursor-pointer"
          >
            <RefreshCw
              size={14}
              className={isFetching ? "animate-spin" : ""}
              aria-hidden="true"
            />
            <span>{t("retry")}</span>
          </button>
        </GlassPanel>
      </div>
    );
  }

  // Fallback safe stats if data exists
  const currentStats = stats || {
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    pendingTasks: 0,
    givenUpTasks: 0,
    dailyStats: [],
  };

  const backgroundErrorMsg =
    isError && stats
      ? getApiErrorMessage(error, t("statisticsPage.backgroundError"))
      : null;

  return (
    <div
      className="v2-statistics flex flex-col gap-[1.5rem] w-full max-w-[1200px] m-[0_auto] min-w-[0]"
      data-testid="v2-statistics-page"
    >
      <h1 className="sr-only">{t("statisticsPage.title")}</h1>

      {/* Nonblocking alert on background refetch failure with cached data */}
      {backgroundErrorMsg && (
        <div
          className="v2-statistics-alert rounded-[0.75rem] flex items-center justify-between gap-[1rem] text-[0.875rem]"
          role="alert"
        >
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="shrink-0" aria-hidden="true" />
            <span>{backgroundErrorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="v2-statistics-link inline-flex items-center gap-[0.5rem] p-[0.5rem_1.125rem] [background:var(--v2-input-fill)]
              [border:1px_solid_var(--v2-border)] rounded-[9999px] [backdrop-filter:blur(12px)]
              [-webkit-backdrop-filter:blur(12px)] [text-decoration:none] [&:hover]:[background:var(--v2-accent,#14675f)]
              [&:hover]:border-[var(--v2-accent,#14675f)] [&:focus-visible]:[outline:2px_solid_var(--v2-accent)]
              [&:focus-visible]:outline-offset-[2px] cursor-pointer"
          >
            <RefreshCw
              size={14}
              className={isFetching ? "animate-spin" : ""}
              aria-hidden="true"
            />
            <span>{t("retry")}</span>
          </button>
        </div>
      )}

      {/* All-time Overview and Completion Track */}
      <StatisticsOverview stats={currentStats} />

      {/* Completion Trend */}
      <StatisticsTrend dailyStats={currentStats.dailyStats} />

      {/* Activity Heatmap & Consistency */}
      <StatisticsActivity dailyStats={currentStats.dailyStats} />

      {/* Status & Category Breakdowns */}
      <StatisticsBreakdowns stats={currentStats} />
    </div>
  );
}
