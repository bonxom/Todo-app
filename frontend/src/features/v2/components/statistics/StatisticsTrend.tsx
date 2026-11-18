import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import {
  formatUtcDateLabel,
  getUtcTodayKey,
} from "@/features/statistics/components/statsUtils";
import { useTheme } from "@/shared/theme/theme";
import GlassPanel from "../GlassPanel";
import {
  buildTrend,
  presetRange,
  validateRange,
  type DateRange,
  type RangeError,
} from "./statisticsModel";
import type { DailyStat } from "@/shared/types/domain";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

export interface StatisticsTrendProps {
  dailyStats: DailyStat[];
}

const PRESETS: Array<7 | 14 | 30 | 90> = [7, 14, 30, 90];

export default function StatisticsTrend({ dailyStats }: StatisticsTrendProps) {
  const { t, i18n } = useTranslation("v2");
  const todayKey = getUtcTodayKey() || new Date().toISOString().slice(0, 10);

  const [activePreset, setActivePreset] = useState<7 | 14 | 30 | 90 | null>(30);
  const [appliedRange, setAppliedRange] = useState<DateRange>(() =>
    presetRange(30, todayKey),
  );
  const [draftStart, setDraftStart] = useState<string>(appliedRange.start);
  const [draftEnd, setDraftEnd] = useState<string>(appliedRange.end);
  const [rangeError, setRangeError] = useState<RangeError | null>(null);

  const getLocalizedErrorMessage = (error: RangeError): string => {
    switch (error) {
      case "required":
        return t("statisticsPage.errorRequired");
      case "invalid":
        return t("statisticsPage.errorInvalid");
      case "reversed":
        return t("statisticsPage.errorReversed");
      case "future":
        return t("statisticsPage.errorFuture");
      case "tooLong":
        return t("statisticsPage.errorTooLong");
      default:
        return t("statisticsPage.errorInvalid");
    }
  };

  const handlePresetClick = (preset: 7 | 14 | 30 | 90) => {
    const nextRange = presetRange(preset, todayKey);
    setAppliedRange(nextRange);
    setDraftStart(nextRange.start);
    setDraftEnd(nextRange.end);
    setActivePreset(preset);
    setRangeError(null);
  };

  const handleStartChange = (value: string) => {
    setDraftStart(value);
    const result = validateRange({ start: value, end: draftEnd }, todayKey);
    if (result.valid) {
      setAppliedRange(result.range);
      setRangeError(null);
      const match =
        PRESETS.find((p) => {
          const pr = presetRange(p, todayKey);
          return pr.start === result.range.start && pr.end === result.range.end;
        }) ?? null;
      setActivePreset(match);
    } else {
      setRangeError(result.error);
      setActivePreset(null);
    }
  };

  const handleEndChange = (value: string) => {
    setDraftEnd(value);
    const result = validateRange({ start: draftStart, end: value }, todayKey);
    if (result.valid) {
      setAppliedRange(result.range);
      setRangeError(null);
      const match =
        PRESETS.find((p) => {
          const pr = presetRange(p, todayKey);
          return pr.start === result.range.start && pr.end === result.range.end;
        }) ?? null;
      setActivePreset(match);
    } else {
      setRangeError(result.error);
      setActivePreset(null);
    }
  };

  const trendData = useMemo(
    () => buildTrend(dailyStats, appliedRange),
    [dailyStats, appliedRange],
  );

  const chartLabels = useMemo(
    () =>
      trendData.dateKeys.map((key) =>
        new Intl.DateTimeFormat(i18n.resolvedLanguage || "en", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }).format(new Date(`${key}T00:00:00Z`)),
      ),
    [trendData.dateKeys, i18n.resolvedLanguage],
  );

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const { theme } = useTheme();
  const isDark = theme === "dark";

  const completedColor = isDark ? "#2dd4bf" : "#14675f";
  const completedBg = isDark
    ? "rgba(45, 212, 191, 0.16)"
    : "rgba(20, 103, 95, 0.12)";
  const givenUpColor = isDark ? "#f87171" : "#ef4444";
  const givenUpBg = isDark
    ? "rgba(248, 113, 113, 0.12)"
    : "rgba(239, 68, 68, 0.08)";
  const axisColor = isDark ? "#adc5c8" : "#526c72";
  const gridColor = isDark
    ? "rgba(190, 232, 229, 0.08)"
    : "rgba(20, 103, 95, 0.08)";
  const tooltipBg = isDark
    ? "rgba(21, 44, 49, 0.95)"
    : "rgba(255, 255, 255, 0.95)";
  const tooltipTitle = isDark ? "#e4f3ef" : "#213d43";
  const tooltipBody = isDark ? "#adc5c8" : "#526c72";
  const tooltipBorder = isDark
    ? "rgba(190, 232, 229, 0.2)"
    : "rgba(56, 93, 99, 0.15)";

  const chartData = useMemo(
    () => ({
      labels: chartLabels,
      datasets: [
        {
          label: t("completed"),
          data: trendData.completed,
          borderColor: completedColor,
          backgroundColor: completedBg,
          borderWidth: 2,
          tension: 0.3,
          fill: true,
          pointRadius: trendData.dateKeys.length === 1 ? 4 : 0,
          pointHoverRadius: 4,
          pointBackgroundColor: completedColor,
        },
        {
          label: t("givenUp"),
          data: trendData.givenUp,
          borderColor: givenUpColor,
          backgroundColor: givenUpBg,
          borderWidth: 2,
          tension: 0.3,
          fill: false,
          pointRadius: trendData.dateKeys.length === 1 ? 4 : 0,
          pointHoverRadius: 4,
          pointBackgroundColor: givenUpColor,
        },
      ],
    }),
    [
      chartLabels,
      trendData.dateKeys.length,
      trendData.completed,
      trendData.givenUp,
      completedColor,
      completedBg,
      givenUpColor,
      givenUpBg,
      t,
    ],
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: reducedMotion ? (false as const) : { duration: 400 },
      plugins: {
        legend: {
          display: true,
          position: "bottom" as const,
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
            padding: 16,
            color: axisColor,
            font: { size: 12, weight: "bold" as const },
          },
        },
        tooltip: {
          mode: "index" as const,
          intersect: false,
          backgroundColor: tooltipBg,
          titleColor: tooltipTitle,
          bodyColor: tooltipBody,
          borderColor: tooltipBorder,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: axisColor, maxRotation: 0, autoSkipPadding: 14 },
        },
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: { color: axisColor, precision: 0 },
        },
      },
    }),
    [
      reducedMotion,
      axisColor,
      gridColor,
      tooltipBg,
      tooltipTitle,
      tooltipBody,
      tooltipBorder,
    ],
  );

  const formattedStart = formatUtcDateLabel(appliedRange.start, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedEnd = formatUtcDateLabel(appliedRange.end, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const rangeAriaLabel = `${t("statisticsPage.trendHeading")}: ${formattedStart} – ${formattedEnd}`;

  return (
    <GlassPanel className="v2-workspace-panel v2-statistics-trend-card">
      <div className="v2-statistics-card-header">
        <h2 className="v2-statistics-card-title">
          {t("statisticsPage.trendHeading")}
        </h2>
        <span className="v2-statistics-card-subtitle">
          {t("statisticsPage.trendDescription")}
        </span>
      </div>

      <div className="v2-statistics-controls">
        <div className="v2-statistics-presets">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handlePresetClick(preset)}
              aria-pressed={activePreset === preset}
              className="v2-statistics-preset-btn"
            >
              {t("statisticsPage.daysPreset", { count: preset })}
            </button>
          ))}
        </div>

        <div className="v2-statistics-date-inputs">
          <label
            className="v2-statistics-date-field"
            htmlFor="trend-range-start"
          >
            <span>{t("statisticsPage.from")}</span>
            <input
              id="trend-range-start"
              type="date"
              aria-label={t("statisticsPage.from")}
              value={draftStart}
              onChange={(e) => handleStartChange(e.target.value)}
              max={draftEnd || todayKey}
              className="v2-statistics-date-input"
            />
          </label>
          <label className="v2-statistics-date-field" htmlFor="trend-range-end">
            <span>{t("statisticsPage.to")}</span>
            <input
              id="trend-range-end"
              type="date"
              aria-label={t("statisticsPage.to")}
              value={draftEnd}
              onChange={(e) => handleEndChange(e.target.value)}
              min={draftStart}
              max={todayKey}
              className="v2-statistics-date-input"
            />
          </label>
        </div>
      </div>

      {rangeError && (
        <div className="v2-statistics-alert py-2 text-xs" role="alert">
          {getLocalizedErrorMessage(rangeError)}
        </div>
      )}

      {!trendData.hasHistory ? (
        <div className="v2-statistics-empty-text">
          {t("statisticsPage.emptyTrend")}
        </div>
      ) : (
        <div className="v2-statistics-chart-wrapper">
          <Line
            data={chartData}
            options={chartOptions}
            role="img"
            aria-label={rangeAriaLabel}
          />
        </div>
      )}

      {trendData.hasHistory &&
        trendData.completedTotal === 0 &&
        trendData.givenUpTotal === 0 && (
          <p className="text-center text-xs text-[var(--v2-muted)]">
            {t("statisticsPage.noActivityInRange")}
          </p>
        )}

      <p className="v2-statistics-trend-summary">
        {t("statisticsPage.trendSummary", {
          start: formattedStart,
          end: formattedEnd,
          completed: trendData.completedTotal,
          givenUp: trendData.givenUpTotal,
        })}
      </p>
    </GlassPanel>
  );
}
