import { getLocale } from "@/shared/i18n";
import { useTranslation } from "react-i18next";
const ProfileStats = ({ stats }) => {
  const { t } = useTranslation("account");
  const statItems = [
    {
      label: t("totalTasks"),
      value: stats?.totalTasks || 0,
    },
    {
      label: t("completed"),
      value: stats?.completedTasks || 0,
    },
    {
      label: t("inProgress"),
      value: stats?.inProgressTasks || 0,
    },
    {
      label: t("categories"),
      value: stats?.totalCategories || 0,
    },
  ];

  return (
    <section className="ui-section-card ui-card-padding p-[clamp(1rem,2vw,1.5rem)]">
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
          <div
            key={item.label}
            className="ui-compact-stat flex flex-col gap-[0.375rem] p-[1rem] [border:1px_solid_var(--color-line)]
            rounded-[var(--radius-lg)]
            [background:color-mix(_in_srgb,var(--color-surface)_88%,var(--color-surface-muted)_)]"
          >
            <span className="ui-compact-stat__label text-[var(--color-text-muted)] text-[0.75rem] [font-weight:600] [line-height:1.2]">
              {item.label}
            </span>
            <span className="ui-compact-stat__value ui-tabular font-mono text-[1.5rem] font-[650] leading-none text-[var(--color-text)] tabular-nums">
              {item.value.toLocaleString(getLocale())}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProfileStats;
