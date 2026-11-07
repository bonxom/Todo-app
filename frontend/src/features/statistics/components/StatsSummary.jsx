import { getLocale } from "@/shared/i18n";
import { useTranslation } from "react-i18next";
import { createElement } from "react";
import { Check, CircleDot, ListTodo, TrendingUp } from "lucide-react";

const StatsSummary = ({ stats }) => {
  const { t } = useTranslation("workspace");
  const number = new Intl.NumberFormat(getLocale());

  if (!stats) return null;
  const rate = stats.totalTasks
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;
  return (
    <section
      className="statistics-overview"
      aria-label={t("allTimeTaskOverview")}
    >
      <div className="statistics-intro">
        <p className="statistics-eyebrow">{t("theBiggerPicture")}</p>
        <h2>
          {t("smallEfforts")}
          <br />
          <em>{t("visibleProgress")}</em>
        </h2>
        <p>{t("aLookAtEverythingYouVeSetInMotion")}</p>
      </div>
      <div className="statistics-metrics">
        {[
          {
            label: t("totalTasks"),
            value: stats.totalTasks,
            Icon: ListTodo,
            note: t("ideasPutIntoAction"),
          },
          {
            label: t("completed"),
            value: stats.completedTasks,
            Icon: Check,
            note: t("stepsInTheRightDirection"),
          },
          {
            label: t("inProgress"),
            value: stats.inProgressTasks,
            Icon: CircleDot,
            note: t("goodThingsInMotion"),
          },
        ].map(({ label, value, Icon, note }) => (
          <div className="statistics-metric" key={label}>
            <span>
              {createElement(Icon, { size: 15 })}
              {label}
            </span>
            <strong>{number.format(value || 0)}</strong>
            <small>{note}</small>
          </div>
        ))}
      </div>
      <div className="statistics-progress">
        <TrendingUp size={17} />
        <strong>{t("percentComplete", { percent: rate })}</strong>
        <div
          className="statistics-progress-track"
          role="progressbar"
          aria-label={t("allTimeCompletion")}
          aria-valuenow={rate}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <i style={{ width: `${rate}%` }} />
        </div>
        <span>
          {number.format(stats.pendingTasks || 0)} {t("pending")}
          <b>·</b> {number.format(stats.givenUpTasks || 0)} {t("givenUp")}
        </span>
      </div>
    </section>
  );
};
export default StatsSummary;
