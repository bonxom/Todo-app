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
      className="statistics-overview grid grid-cols-[1fr_2fr] [border:1px_solid_var(--color-line)] rounded-[18px]
        overflow-hidden [background:var(--color-surface)] [@media(max-width:700px)]:grid-cols-[1fr]"
      aria-label={t("allTimeTaskOverview")}
    >
      <div
        className="statistics-intro relative p-[28px_30px] [background:var(--color-accent-soft)] [&_h2]:m-[12px_0]
        [&_h2]:text-[27px] [&_h2]:[line-height:1.3] [&_h2]:[font-weight:550] [&_h2]:[letter-spacing:-0.04em]
        [&_em]:text-[var(--color-accent)] [&_em]:[font-style:normal] [&_>_p:last-of-type]:text-[12px]
        [&_>_p:last-of-type]:[line-height:1.7] [&_>_p:last-of-type]:text-[var(--color-text-muted)]
        [@media(max-width:700px)]:p-[24px] [@media(max-width:700px)]:[&_h2_br]:[display:none]"
      >
        <p className="statistics-eyebrow text-[var(--color-accent)] text-[10px] [font-weight:700] [letter-spacing:0.15em]">
          {t("theBiggerPicture")}
        </p>
        <h2>
          {t("smallEfforts")}
          <br />
          <em>{t("visibleProgress")}</em>
        </h2>
        <p>{t("aLookAtEverythingYouVeSetInMotion")}</p>
      </div>
      <div className="statistics-metrics grid grid-cols-[repeat(3,minmax(0,1fr))] items-center p-[28px_8px] [@media(max-width:700px)]:p-[24px_8px]">
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
          <div
            className="statistics-metric [border-right:1px_solid_var(--color-line)] [&:last-child]:[border:0] [&_>_span]:items-center
            [&_>_span]:text-[var(--color-text-muted)] [&_svg]:text-[var(--color-accent)] [&_strong]:m-[12px_0]
            [&_strong]:[font-weight:550] [&_strong]:[letter-spacing:-0.045em] [&_strong]:[line-height:1.2]
            [&_strong]:[font-variant-numeric:tabular-nums] [&_small]:text-[var(--color-text-muted)]"
            key={label}
          >
            <span>
              {createElement(Icon, { size: 15 })}
              {label}
            </span>
            <strong>{number.format(value || 0)}</strong>
            <small>{note}</small>
          </div>
        ))}
      </div>
      <div
        className="statistics-progress col-[1/-1] flex items-center gap-[14px] [border-top:1px_solid_var(--color-line)]
        text-[11px] [&_>_svg]:text-[var(--color-accent)] [&_strong]:[font-weight:600] [&_strong]:whitespace-nowrap
        [&_>_span]:text-[var(--color-text-muted)] [&_>_span]:whitespace-nowrap [&_b]:[font-weight:400]
        [@media(max-width:700px)]:flex-wrap [@media(max-width:700px)]:[&_>_span]:w-full"
      >
        <TrendingUp size={17} />
        <strong>{t("percentComplete", { percent: rate })}</strong>
        <div
          className="statistics-progress-track h-[5px] rounded-[8px] [background:var(--color-surface-muted)] flex-1 overflow-hidden
            [&_i]:block [&_i]:h-full [&_i]:[background:var(--color-accent)] [&_i]:rounded-[inherit]
            [@media(max-width:700px)]:min-w-[60px]"
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
