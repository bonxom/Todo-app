import i18n, { getLocale } from "@/shared/i18n";
import { useTranslation } from "react-i18next";
const birthdayFormatter = () =>
  new Intl.DateTimeFormat(getLocale(), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const memberSinceFormatter = () =>
  new Intl.DateTimeFormat(getLocale(), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const formatDateOnly = (value) => {
  if (!value) {
    return i18n.t("account:notSet");
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? i18n.t("account:notSet")
    : birthdayFormatter().format(date);
};

const formatDateTime = (value) => {
  if (!value) {
    return i18n.t("account:notAvailable");
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? i18n.t("account:notAvailable")
    : memberSinceFormatter().format(date);
};

const formatRoleLabel = (value) => {
  if (!value) {
    return i18n.t("account:user");
  }

  if (value === "admin" || value === "user") return i18n.t(`account:${value}`);
  return value
    .toLowerCase()
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
};

const ProfileInfo = ({ user }) => {
  const { t } = useTranslation("account");
  const fields = [
    {
      label: t("fullName"),
      value: user?.name || t("notSet"),
    },
    {
      label: t("email"),
      value: user?.email || t("notSet"),
    },
    {
      label: t("role"),
      value: formatRoleLabel(user?.role),
    },
    {
      label: t("birthday"),
      value: formatDateOnly(user?.dob),
    },
    {
      label: t("memberSince"),
      value: formatDateTime(user?.createdAt),
    },
  ];

  return (
    <section className="ui-section-card ui-card-padding">
      <div className="mb-4">
        <h2 className="m-0 text-lg font-semibold tracking-[-0.02em] text-[var(--color-text)]">
          {t("personalInformation")}
        </h2>
        <p className="mt-1 mb-0 text-sm text-[var(--color-text-muted)]">
          {t("theseDetailsAreUsedAcrossYourWorkspaceAndAccountScreens")}
        </p>
      </div>

      <div>
        {fields.map((field) => (
          <div key={field.label} className="ui-detail-row">
            <span className="ui-detail-row__label">{field.label}</span>
            <span className="ui-detail-row__value">{field.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProfileInfo;
