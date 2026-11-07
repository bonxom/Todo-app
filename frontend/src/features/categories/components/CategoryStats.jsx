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
    <section className="category-overview" aria-label={t("workspaceOverview")}>
      <div className="category-overview-intro">
        <span className="category-eyebrow">{t("theBigPicture")}</span>
        <h2>
          {t("smallSteps")}
          <br />
          {t("meaningfulProgress")}
        </h2>
        <p>{t("groupsAtAGlance", { groups: entityLabel.toLowerCase() })}</p>
      </div>
      <div className="category-metrics">
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
            <div className="category-metric" key={label}>
              <Icon size={18} />
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          );
        })}
      </div>
      <div className="category-overall-progress">
        <div
          className="category-progress-ring"
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
