import { getLocale } from "@/shared/i18n";
import { useTranslation } from "react-i18next";
const ProfileStats = ({ stats }) => {
  const { t } = useTranslation("account");
  const statItems = [
    {
      label: t("totalTasks"),
      value: stats?.totalTasks || 0,
      tone: "text-[var(--color-accent)]",
    },
    {
      label: t("completed"),
      value: stats?.completedTasks || 0,
      tone: "text-[var(--color-success)]",
    },
    {
      label: t("inProgress"),
      value: stats?.inProgressTasks || 0,
      tone: "text-[var(--color-warning)]",
    },
    {
      label: t("categories"),
      value: stats?.totalCategories || 0,
      tone: "text-[var(--color-text)]",
    },
  ];

  return (
    <section className="ui-section-card ui-card-padding">
      <div className="mb-4">
        <h2 className="m-0 text-lg font-semibold tracking-[-0.02em] text-[var(--color-text)]">
          {t("workspaceSnapshot")}
        </h2>
        <p className="mt-1 mb-0 text-sm text-[var(--color-text-muted)]">
          {t("aQuickViewOfYourCurrentTaskLoadAndStructure")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
        {statItems.map((item) => (
          <div key={item.label} className="ui-compact-stat">
            <span className="ui-compact-stat__label">{item.label}</span>
            <span className={`ui-compact-stat__value ui-tabular ${item.tone}`}>
              {item.value.toLocaleString(getLocale())}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProfileStats;
