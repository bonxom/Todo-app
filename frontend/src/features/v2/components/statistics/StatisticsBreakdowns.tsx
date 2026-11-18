import { useTranslation } from "react-i18next";
import { useTheme } from "@/shared/theme/theme";
import GlassPanel from "../GlassPanel";
import { buildStatuses, buildCategories } from "./statisticsModel";
import type { Stat } from "@/shared/types/domain";

export interface StatisticsBreakdownsProps {
  stats: Stat;
}

const STATUS_COLORS_LIGHT: Record<string, string> = {
  pending: "#526c72",
  "in-progress": "#d97706",
  completed: "#14675f",
  "given-up": "#ef4444",
};

const STATUS_COLORS_DARK: Record<string, string> = {
  pending: "#adc5c8",
  "in-progress": "#fbbf24",
  completed: "#2dd4bf",
  "given-up": "#f87171",
};

const CATEGORY_PALETTE_LIGHT = [
  "#14675f",
  "#2a9d8f",
  "#e76f51",
  "#f4a261",
  "#457b9d",
  "#6a4c93",
  "#8338ec",
  "#3a86ff",
  "#06d6a0",
  "#118ab2",
];

const CATEGORY_PALETTE_DARK = [
  "#2dd4bf",
  "#38bdf8",
  "#fb923c",
  "#f472b6",
  "#a78bfa",
  "#4ade80",
  "#facc15",
  "#818cf8",
  "#22d3ee",
  "#94a3b8",
];

function buildConicGradient(
  items: Array<{ percentage: number; color: string }>,
): string {
  let currentDegree = 0;
  const segments: string[] = [];

  items.forEach((item) => {
    if (item.percentage <= 0) return;
    const nextDegree = currentDegree + (item.percentage / 100) * 360;
    segments.push(`${item.color} ${currentDegree}deg ${nextDegree}deg`);
    currentDegree = nextDegree;
  });

  if (segments.length === 0) {
    return "rgba(20, 103, 95, 0.1) 0deg 360deg";
  }

  // Cap remainder if roundoff left a gap
  if (currentDegree < 360) {
    const lastColor = items[items.length - 1]?.color || "transparent";
    segments.push(`${lastColor} ${currentDegree}deg 360deg`);
  }

  return segments.join(", ");
}

export default function StatisticsBreakdowns({
  stats,
}: StatisticsBreakdownsProps) {
  const { t, i18n } = useTranslation("v2");
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const locale = i18n.language || "en";

  const statusColors = isDark ? STATUS_COLORS_DARK : STATUS_COLORS_LIGHT;
  const categoryPalette = isDark
    ? CATEGORY_PALETTE_DARK
    : CATEGORY_PALETTE_LIGHT;

  const rawStatuses = buildStatuses(stats);
  const statusItems = rawStatuses.map((item) => {
    let localizedLabel = item.label;
    if (item.key === "pending") localizedLabel = t("pending");
    else if (item.key === "in-progress") localizedLabel = t("inProgress");
    else if (item.key === "completed") localizedLabel = t("completed");
    else if (item.key === "given-up") localizedLabel = t("givenUp");

    return {
      ...item,
      label: localizedLabel,
      color: statusColors[item.key] || (isDark ? "#adc5c8" : "#526c72"),
    };
  });

  const totalStatusTasks = statusItems.reduce((acc, it) => acc + it.value, 0);

  const rawCategories = buildCategories(stats.dailyStats);
  const categoryItems = rawCategories.map((item, idx) => ({
    ...item,
    color: categoryPalette[idx % categoryPalette.length],
  }));

  const totalCategoryCompleted = categoryItems.reduce(
    (acc, it) => acc + it.value,
    0,
  );

  return (
    <section
      aria-label={t("statisticsPage.breakdowns")}
      className="v2-statistics-breakdowns"
    >
      {/* Current Task Status Breakdown */}
      <GlassPanel className="v2-workspace-panel v2-statistics-breakdown-card">
        <div className="v2-statistics-card-header">
          <h2 className="v2-statistics-card-title">
            {t("statisticsPage.statusDistribution")}
          </h2>
          <span className="v2-statistics-card-subtitle">
            {t("statisticsPage.allTimeScope")}
          </span>
        </div>

        {totalStatusTasks === 0 ? (
          <div className="v2-statistics-empty-text">
            {t("statisticsPage.noData")}
          </div>
        ) : (
          <div className="v2-statistics-donut-container">
            <div
              className="v2-statistics-donut"
              style={{
                background: `conic-gradient(${buildConicGradient(statusItems)})`,
              }}
              role="img"
              aria-label={t("statisticsPage.statusDistribution")}
            >
              <div className="v2-statistics-donut-hole">
                <span className="v2-statistics-donut-total">
                  {totalStatusTasks.toLocaleString(locale)}
                </span>
                <span className="v2-statistics-donut-label">{t("total")}</span>
              </div>
            </div>

            <div className="v2-statistics-legend">
              {statusItems.map((item) => (
                <div key={item.key} className="v2-statistics-legend-item">
                  <span className="v2-statistics-legend-name">
                    <span
                      className="v2-statistics-legend-dot"
                      style={{ background: item.color }}
                    />
                    <span>{item.label}</span>
                  </span>
                  <span className="v2-statistics-legend-value">
                    {item.value.toLocaleString(locale)} (
                    {item.percentage.toLocaleString(locale, {
                      maximumFractionDigits: 1,
                    })}
                    %)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassPanel>

      {/* Completed by Category Breakdown */}
      <GlassPanel className="v2-workspace-panel v2-statistics-breakdown-card">
        <div className="v2-statistics-card-header">
          <h2 className="v2-statistics-card-title">
            {t("statisticsPage.categoryDistribution")}
          </h2>
          <span className="v2-statistics-card-subtitle">
            {t("statisticsPage.categoryHistoryScope")}
          </span>
        </div>

        {totalCategoryCompleted === 0 || categoryItems.length === 0 ? (
          <div className="v2-statistics-empty-text">
            {t("statisticsPage.noCategoryHistory")}
          </div>
        ) : (
          <div className="v2-statistics-donut-container">
            <div
              className="v2-statistics-donut"
              style={{
                background: `conic-gradient(${buildConicGradient(categoryItems)})`,
              }}
              role="img"
              aria-label={t("statisticsPage.categoryDistribution")}
            >
              <div className="v2-statistics-donut-hole">
                <span className="v2-statistics-donut-total">
                  {totalCategoryCompleted.toLocaleString(locale)}
                </span>
                <span className="v2-statistics-donut-label">
                  {t("completed")}
                </span>
              </div>
            </div>

            <div className="v2-statistics-legend">
              {categoryItems.map((item) => (
                <div key={item.key} className="v2-statistics-legend-item">
                  <span className="v2-statistics-legend-name">
                    <span
                      className="v2-statistics-legend-dot"
                      style={{ background: item.color }}
                    />
                    <span>{item.label}</span>
                  </span>
                  <span className="v2-statistics-legend-value">
                    {item.value.toLocaleString(locale)} (
                    {item.percentage.toLocaleString(locale, {
                      maximumFractionDigits: 1,
                    })}
                    %)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassPanel>
    </section>
  );
}
