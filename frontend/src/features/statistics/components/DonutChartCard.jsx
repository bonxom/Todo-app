import { getLocale } from "@/shared/i18n";
import { useTranslation } from "react-i18next";
import { workspaceTranslate } from "@/features/tasks/utils/workspaceTranslation";
const DonutChartCard = ({
  title,
  description,
  total,
  totalLabel = workspaceTranslate("total"),
  items = [],
  emptyMessage,
}) => {
  const { t } = useTranslation("workspace");

  let offset = 0;
  const segments = items.map((item) => {
    const start = offset;
    offset += total ? (item.value / total) * 100 : 0;
    return `${item.color} ${start}% ${offset}%`;
  });
  return (
    <section
      className="statistics-card [background:var(--color-surface)] [border:1px_solid_var(--color-line)] rounded-[14px] p-[24px]
      min-w-[0] [&_h2]:text-[15px] [&_h2]:[font-weight:600] [&_h2]:[letter-spacing:-0.015em] [&_h3]:text-[15px]
      [&_h3]:[font-weight:600] [&_h3]:[letter-spacing:-0.015em]
      [@media(max-width:700px)]:p-[20px]"
    >
      <div className="statistics-card-header flex items-start justify-between gap-[20px]">
        <div>
          <h2>{title}</h2>
          {description && (
            <p className="statistics-card-description mt-[5px] text-[var(--color-text-muted)] text-[12px]">
              {description}
            </p>
          )}
        </div>
        <span className="statistics-small-label text-[10px] text-[var(--color-text-muted)] [background:var(--color-surface-muted)] rounded-[5px] p-[4px_8px] whitespace-nowrap">
          {t("allTime")}
        </span>
      </div>
      <div className="statistics-donut-layout grid grid-cols-[145px_1fr] items-center gap-[24px] mt-[26px] [@media(max-width:700px)]:gap-[16px] [@media(max-width:700px)]:grid-cols-[120px_1fr]">
        <div
          className="statistics-donut w-[145px] h-[145px] rounded-[50%] grid place-items-center [@media(max-width:700px)]:w-[120px] [@media(max-width:700px)]:h-[120px]"
          style={{
            background: total
              ? `conic-gradient(${segments.join(",")})`
              : "var(--color-surface-muted)",
          }}
          aria-hidden="true"
        >
          <div
            className="statistics-donut-center w-[115px] h-[115px] rounded-[50%] [background:var(--color-surface)] flex items-center
            justify-center flex-col [&_strong]:text-[30px] [&_strong]:[font-weight:550]
            [&_strong]:[letter-spacing:-0.04em] [&_span]:text-[10px] [&_span]:text-[var(--color-text-muted)]
            [@media(max-width:700px)]:w-[94px] [@media(max-width:700px)]:h-[94px]"
          >
            <strong>{total.toLocaleString(getLocale())}</strong>
            <span>{totalLabel}</span>
          </div>
        </div>
        {total ? (
          <div className="statistics-legend grid gap-[16px] max-h-[240px] overflow-auto">
            {items.map((item) => (
              <div
                className="statistics-legend-row flex items-center gap-[8px] text-[11px] [&_i]:w-[7px] [&_i]:h-[7px] [&_i]:rounded-[50%]
                [&_i]:shrink-0 [&_>_span]:flex-1 [&_>_span]:wrap-anywhere [&_strong]:[font-weight:600] [&_small]:w-[38px]
                [&_small]:text-right [&_small]:text-[var(--color-text-muted)]"
                key={item.label}
              >
                <i style={{ background: item.color }} />
                <span>{item.label}</span>
                <strong>{item.value.toLocaleString(getLocale())}</strong>
                <small>{Math.round(Number(item.percentage))}%</small>
              </div>
            ))}
          </div>
        ) : (
          <p className="statistics-empty-note text-[12px] text-[var(--color-text-muted)] [line-height:1.7]">
            {emptyMessage}
          </p>
        )}
      </div>
    </section>
  );
};
export default DonutChartCard;
