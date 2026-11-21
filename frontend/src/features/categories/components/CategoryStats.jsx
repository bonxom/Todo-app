import { useTranslation } from "react-i18next";
import { workspaceTranslate } from "@/features/tasks/utils/workspaceTranslation";
import { CheckCheck, Layers, ListTodo } from "lucide-react";

const CategoryStats = ({
  stats,
  entityLabel = workspaceTranslate("categories"),
}) => {
  const { t } = useTranslation("workspace");

  const rate = stats.totalTasks
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;
  return (
    <section
      className="category-overview grid [border:1px_solid_var(--color-line)] rounded-[18px] overflow-hidden [background:var(--color-surface)]"
      aria-label={t("workspaceOverview")}
    >
      <div
        className="category-overview-intro [background:var(--color-accent-soft)] [&_h2]:[font-weight:550]
        [&_h2]:[letter-spacing:-0.035em] [&_h2]:[line-height:1.3] [&_p]:text-[var(--color-text-muted)]"
      >
        <span className="category-eyebrow text-[10px] [font-weight:700] [letter-spacing:0.15em] text-[var(--color-accent)]">
          {t("theBigPicture")}
        </span>
        <h2>
          {t("smallSteps")}
          <br />
          {t("meaningfulProgress")}
        </h2>
        <p>{t("groupsAtAGlance", { groups: entityLabel.toLowerCase() })}</p>
      </div>
      <div className="category-metrics grid grid-cols-[repeat(3,1fr)] items-center">
        {[
          { label: entityLabel, value: stats.totalGroups, Icon: Layers },
          { label: t("visibleTasks"), value: stats.totalTasks, Icon: ListTodo },
          {
            label: t("completed"),
            value: stats.completedTasks,
            Icon: CheckCheck,
          },
        ].map((item) => {
          const { label, value, Icon } = item;
          return (
            <div
              className="category-metric flex flex-col gap-[9px] p-[0_24px] [border-right:1px_solid_var(--color-line)]
              [&:last-child]:[border:0] [&_svg]:text-[var(--color-accent)] [&_strong]:[line-height:1.1]
              [&_strong]:[font-weight:550] [&_strong]:[font-variant-numeric:tabular-nums]
              [&_strong]:[letter-spacing:-0.04em] [&_span]:text-[var(--color-text-muted)]
              [@media(max-width:600px)]:p-[0_16px] [@media(max-width:600px)]:gap-[6px]"
              key={label}
            >
              <Icon size={18} />
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          );
        })}
      </div>
      <div
        className="category-overall-progress [&_p]:text-[12px] [&_p]:text-[var(--color-text-muted)] col-[1_/_-1] flex
        items-center gap-[14px] [border-top:1px_solid_var(--color-line)] [&_strong]:text-[12px]
        [&_strong]:[font-weight:600] [&_>_svg]:ml-auto [&_>_svg]:text-[var(--color-accent)]
        [@media(min-width:1500px)]:col-auto [@media(min-width:1500px)]:[border-top:0]
        [@media(min-width:1500px)]:[border-left:1px_solid_var(--color-line)]
        [@media(min-width:1500px)]:[&_>_svg]:[display:none]"
      >
        <div
          className="category-progress-ring w-[42px] h-[42px] shrink-0 rounded-[50%]
            [background:conic-gradient(_var(--color-accent)_var(--progress),var(--color-surface-muted)_0_)] grid
            place-items-center [&_>_span]:w-[34px] [&_>_span]:h-[34px] [&_>_span]:flex [&_>_span]:items-center
            [&_>_span]:justify-center [&_>_span]:[background:var(--color-surface)] [&_>_span]:rounded-[50%]
            [&_>_span]:text-[11px] [&_>_span]:[font-weight:650] [&_small]:text-[8px]"
          style={{ "--progress": `${rate}%` }}
        >
          <span>
            {rate}
            <small>%</small>
          </span>
        </div>
        <div>
          <strong>
            {stats.totalTasks && rate === 100
              ? t("allCaughtUp")
              : t("makingRoomForProgress")}
          </strong>
          <p>
            {stats.totalTasks
              ? t("messages.v0VisibleTasksNotYetCompleted", {
                  v0: stats.totalTasks - stats.completedTasks,
                })
              : t("yourNextChapterStartsWithATask")}
          </p>
        </div>
      </div>
    </section>
  );
};
export default CategoryStats;
