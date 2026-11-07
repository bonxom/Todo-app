import i18n, { getLocale } from "@/shared/i18n";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import AvatarUpload from "./AvtUpload";

const memberSinceFormatter = () =>
  new Intl.DateTimeFormat(getLocale(), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const formatMemberSince = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
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

const ProfileHeader = ({ user, onAvatarUpdate }) => {
  const { t } = useTranslation("account");
  const [failedAvatarUrls, setFailedAvatarUrls] = useState(() => new Set());
  const hasAvatarImage =
    Boolean(user?.avatarUrl) && !failedAvatarUrls.has(user.avatarUrl);
  const memberSince = formatMemberSince(user?.createdAt);

  return (
    <section className="ui-section-card ui-card-padding">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative shrink-0">
            {hasAvatarImage ? (
              <img
                src={user.avatarUrl}
                alt={user?.name || t("profileAvatar")}
                width="96"
                height="96"
                className="h-24 w-24 rounded-full border object-cover"
                style={{
                  borderColor: "var(--color-line)",
                  boxShadow: "var(--shadow-xs)",
                }}
                onError={() => {
                  setFailedAvatarUrls((current) => {
                    const next = new Set(current);
                    next.add(user.avatarUrl);
                    return next;
                  });
                }}
              />
            ) : (
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full border text-3xl font-semibold"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--color-accent) 18%, var(--color-line))",
                  backgroundColor: "var(--color-accent-soft)",
                  color: "var(--color-accent)",
                  boxShadow: "var(--shadow-xs)",
                }}
              >
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
            <AvatarUpload onUploadSuccess={onAvatarUpdate} />
          </div>

          <div className="min-w-0 space-y-3">
            <div className="space-y-1">
              <p className="m-0 text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                {t("accountSummary")}
              </p>
              <h2 className="m-0 text-[clamp(1.5rem,2vw,1.875rem)] font-semibold tracking-[-0.02em] text-[var(--color-text)] text-balance">
                {user?.name || t("user")}
              </h2>
              <p className="m-0 break-words text-sm text-[var(--color-text-muted)]">
                {user?.email || "user@example.com"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="ui-badge ui-badge--accent">
                {formatRoleLabel(user?.role)}
              </span>
              {memberSince ? (
                <span className="ui-badge">
                  {t("memberSinceDate", { date: memberSince })}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div
          className="min-w-0 max-w-sm rounded-[var(--radius-xl)] border p-4"
          style={{
            borderColor: "var(--color-line)",
            background:
              "color-mix(in srgb, var(--color-surface) 88%, var(--color-surface-muted))",
            boxShadow: "var(--shadow-xs)",
          }}
        >
          <p className="m-0 text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
            {t("plannerIdentity")}
          </p>
          <p className="mt-2 mb-0 text-sm leading-6 text-[var(--color-text-muted)]">
            {t(
              "keepYourProfileAndSigninDetailsCurrentSoTheWorkspaceStaysPersonalRecognizableAndEasyToTrustAcrossDevices",
            )}
          </p>
        </div>
      </div>
    </section>
  );
};

export default ProfileHeader;
