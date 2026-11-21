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

  const readToken = (name: string, fallback: string) => {
    if (typeof window === "undefined") return fallback;
    const host = document.querySelector(".v2-app") || document.documentElement;
    return getComputedStyle(host).getPropertyValue(name).trim() || fallback;
  };

  const completedColor = readToken(
    "--v2-accent",
    isDark ? "#a3e4ce" : "#14675f",
  );
  const completedBg = isDark
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.06)";
  const givenUpColor = isDark ? "#f87171" : "#c0392b";
  const givenUpBg = isDark
    ? "rgba(248, 113, 113, 0.12)"
    : "rgba(192, 57, 43, 0.08)";
  const axisColor = readToken("--v2-muted", isDark ? "#adc5c8" : "#526c72");
  const gridColor = readToken(
    "--v2-border",
    isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
  );
  const tooltipBg = readToken(
    "--v2-surface-solid",
    isDark ? "rgba(28, 52, 57, 0.96)" : "rgba(255, 255, 255, 0.96)",
  );
  const tooltipTitle = readToken("--v2-ink", isDark ? "#e4f3ef" : "#213d43");
  const tooltipBody = axisColor;
  const tooltipBorder = gridColor;

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
    <GlassPanel className="v2-workspace-panel overflow-hidden v2-statistics-trend-card flex flex-col gap-[1.25rem] min-w-[0]">
      <div className="v2-statistics-card-header flex flex-col gap-[0.25rem]">
        <h2 className="v2-statistics-card-title [font-family:var(--v2-font-heading,inherit)] text-[1.1875rem] [font-weight:700] text-[var(--v2-ink)] [letter-spacing:-0.015em]">
          {t("statisticsPage.trendHeading")}
        </h2>
        <span className="v2-statistics-card-subtitle text-[0.8125rem] text-[var(--v2-muted)]">
          {t("statisticsPage.trendDescription")}
        </span>
      </div>

      <div className="v2-statistics-controls flex items-center justify-between gap-[1rem] flex-wrap">
        <div className="v2-statistics-presets flex gap-[0.375rem] flex-wrap [@media(max-width:600px)]:grid [@media(max-width:600px)]:grid-cols-[repeat(4,minmax(0,1fr))] [@media(max-width:600px)]:w-full">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handlePresetClick(preset)}
              aria-pressed={activePreset === preset}
              className="v2-statistics-preset-btn p-[0.4rem_0.85rem] rounded-[0.5rem] [border:1px_solid_var(--v2-border)]
                cursor-pointer [&[aria-pressed=true]]:border-[var(--v2-accent,#14675f)]
                [@media(max-width:600px)]:px-[0.4rem] [@media(max-width:600px)]:min-h-[40px]"
            >
              {t("statisticsPage.daysPreset", { count: preset })}
            </button>
          ))}
        </div>

        <div className="v2-statistics-date-inputs flex items-center gap-[0.5rem] flex-wrap">
          <label
            className="v2-statistics-date-field flex items-center gap-[0.375rem] text-[0.8125rem] text-[var(--v2-muted)]"
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
              className="v2-statistics-date-input p-[0.4rem_0.65rem] rounded-[0.5rem] [border:1px_solid_var(--v2-border)]
                [transition:border-color_0.15s_ease,box-shadow_0.15s_ease] [&:focus]:[outline:2px_solid_var(--v2-accent)]
                [&:focus]:outline-offset-[1px]"
            />
          </label>
          <label
            className="v2-statistics-date-field flex items-center gap-[0.375rem] text-[0.8125rem] text-[var(--v2-muted)]"
            htmlFor="trend-range-end"
          >
            <span>{t("statisticsPage.to")}</span>
            <input
              id="trend-range-end"
              type="date"
              aria-label={t("statisticsPage.to")}
              value={draftEnd}
              onChange={(e) => handleEndChange(e.target.value)}
              min={draftStart}
              max={todayKey}
              className="v2-statistics-date-input p-[0.4rem_0.65rem] rounded-[0.5rem] [border:1px_solid_var(--v2-border)]
                [transition:border-color_0.15s_ease,box-shadow_0.15s_ease] [&:focus]:[outline:2px_solid_var(--v2-accent)]
                [&:focus]:outline-offset-[1px]"
            />
          </label>
        </div>
      </div>

      {rangeError && (
        <div
          className="v2-statistics-alert rounded-[0.75rem] flex items-center justify-between gap-[1rem] text-[0.875rem] py-2 text-xs"
          role="alert"
        >
          {getLocalizedErrorMessage(rangeError)}
        </div>
      )}

      {!trendData.hasHistory ? (
        <div className="v2-statistics-empty-text text-[0.875rem] text-[var(--v2-muted)] text-center p-[2.5rem_1rem]">
          {t("statisticsPage.emptyTrend")}
        </div>
      ) : (
        <div className="v2-statistics-chart-wrapper relative w-full h-[260px] min-w-[0]">
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

      <p
        className="v2-statistics-trend-summary text-[0.8125rem] text-[var(--v2-muted)] [font-variant-numeric:tabular-nums]
        p-[0.5rem_0.75rem] rounded-[0.5rem] [background:var(--v2-input-fill)] [border:1px_solid_var(--v2-border)]
        w-[fit-content]"
      >
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
