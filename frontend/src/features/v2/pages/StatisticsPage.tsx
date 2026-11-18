import { useTranslation } from "react-i18next";
import { RefreshCw, AlertCircle } from "lucide-react";
import { useStatsQuery } from "@/features/statistics/api/statQueries";
import { getApiErrorMessage } from "@/shared/services/apiError";
import GlassPanel from "../components/GlassPanel";
import StatisticsOverview from "../components/statistics/StatisticsOverview";
import StatisticsTrend from "../components/statistics/StatisticsTrend";
import StatisticsActivity from "../components/statistics/StatisticsActivity";
import StatisticsBreakdowns from "../components/statistics/StatisticsBreakdowns";
import "../styles/statistics.css";

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
      <div className="v2-statistics" data-testid="v2-statistics-page">
        <h1 className="sr-only">{t("statisticsPage.title")}</h1>

        <div
          data-testid="statistics-loading-skeleton"
          className="v2-statistics-skeleton"
          aria-busy="true"
          aria-label={t("statisticsPage.loading")}
        >
          <div
            className="v2-statistics-skeleton-box"
            style={{ height: "120px" }}
          />
          <div
            className="v2-statistics-skeleton-box"
            style={{ height: "80px" }}
          />
          <div
            className="v2-statistics-skeleton-box"
            style={{ height: "280px" }}
          />
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
      <div className="v2-statistics" data-testid="v2-statistics-page">
        <h1 className="sr-only">{t("statisticsPage.title")}</h1>

        <GlassPanel className="v2-statistics-alert" role="alert">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="v2-statistics-link cursor-pointer"
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
    <div className="v2-statistics" data-testid="v2-statistics-page">
      <h1 className="sr-only">{t("statisticsPage.title")}</h1>

      {/* Nonblocking alert on background refetch failure with cached data */}
      {backgroundErrorMsg && (
        <div className="v2-statistics-alert" role="alert">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="shrink-0" aria-hidden="true" />
            <span>{backgroundErrorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="v2-statistics-link cursor-pointer"
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
