import { useTranslation } from "react-i18next";
import { ChevronRight, Edit, Lock } from "lucide-react";

const ProfileActions = ({ onEditProfile, onChangePassword }) => {
  const { t } = useTranslation("account");
  const actions = [
    {
      label: t("editProfile"),
      icon: Edit,
      onClick: onEditProfile,
      eyebrow: t("profile"),
      description: t("updateYourNameEmailBirthdayAndAvatarDetails"),
    },
    {
      label: t("changePassword"),
      icon: Lock,
      onClick: onChangePassword,
      eyebrow: t("security"),
      description: t("replaceThePasswordYouUseToSignInToYourWorkspace"),
    },
  ];

  return (
    <section className="ui-section-card ui-card-padding p-[clamp(1rem,2vw,1.5rem)]">
      <div className="mb-4">
        <h2 className="m-0 text-lg font-semibold tracking-[-0.02em] text-[var(--color-text)]">
          {t("settingsActions")}
        </h2>
        <p className="mt-1 mb-0 text-sm text-[var(--color-text-muted)]">
          {t("useTheseQuickActionsToKeepYourAccountDetailsCurrent")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className="ui-action-tile flex min-w-[0] items-start justify-between gap-[1rem] p-[1rem_1.125rem]
                [border:1px_solid_var(--color-line)] rounded-[var(--radius-lg)] [background:var(--color-surface)] text-left
                [transition:background-color_160ms_ease,border-color_160ms_ease,box-shadow_160ms_ease,transform_160ms_ease]
                [&:hover]:border-[color-mix(_in_srgb,var(--color-line)_72%,var(--color-text-muted)_)]
                [&:hover]:[background:color-mix(_in_srgb,var(--color-surface)_80%,var(--color-surface-muted)_)]
                [&:hover]:[transform:translateY(-1px)] ui-focus-ring"
            >
              <span
                className="ui-action-tile__icon inline-flex w-[2.5rem] h-[2.5rem] items-center justify-center shrink-0
                [border:1px_solid_color-mix(in_srgb,var(--color-accent)_14%,var(--color-line))] rounded-[var(--radius-md)]
                [background:var(--color-accent-soft)] text-[var(--color-accent)]"
                aria-hidden="true"
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="ui-action-tile__copy flex min-w-[0] flex-1 flex-col gap-[0.25rem]">
                <span className="ui-action-tile__eyebrow text-[var(--color-text-muted)] text-[0.6875rem] [font-weight:700] [letter-spacing:0.06em] [line-height:1.2] uppercase">
                  {action.eyebrow}
                </span>
                <span className="ui-action-tile__title text-[var(--color-text)] text-[0.95rem] [font-weight:600] [line-height:1.3]">
                  {action.label}
                </span>
                <span className="ui-action-tile__description text-[var(--color-text-muted)] text-[0.8125rem] [line-height:1.5]">
                  {action.description}
                </span>
              </span>
              <ChevronRight
                className="mt-1 h-4 w-4 shrink-0 text-[var(--color-text-muted)]"
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default ProfileActions;
