import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Eye, EyeOff, KeyRound, Save } from "lucide-react";
import { getLocale } from "@/shared/i18n";
import { getApiErrorMessage } from "@/shared/services/apiError";
import { useCurrentUserQuery } from "@/features/profile/api/userQueries";
import {
  useChangePasswordMutation,
  useUpdateProfileMutation,
} from "@/features/profile/api/userMutations";
import { useTasksQuery } from "@/features/tasks/api/taskQueries";
import { useCategoriesQuery } from "@/features/categories/api/categoryQueries";
import type { User } from "@/shared/types/domain";
import type { SettingsVersion } from "../types";
import { SettingsCard, SettingsFeedbackBanner } from "./SettingsPrimitives";
import {
  settingsBorderClass,
  settingsInputClass,
  settingsPrimaryButtonClass,
  settingsSecondaryButtonClass,
  settingsTextClass,
} from "./settingsStyles";

function formatMemberSince(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(getLocale(), {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function toDateInputValue(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

function ProfileDetailsForm({
  version,
  user,
  feedback,
  onFeedback,
}: {
  version: SettingsVersion;
  user: User;
  feedback: { tone: "success" | "error"; message: string } | null;
  onFeedback: (
    next: { tone: "success" | "error"; message: string } | null,
  ) => void;
}) {
  const { t } = useTranslation("settings");
  const updateProfileMutation = useUpdateProfileMutation();
  const [name, setName] = useState(user.name ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [dob, setDob] = useState(toDateInputValue(user.dob));
  const [nationality, setNationality] = useState(user.nationality ?? "");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    onFeedback(null);
    try {
      await updateProfileMutation.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        dob: dob || undefined,
        nationality: nationality.trim() || undefined,
      });
      onFeedback({ tone: "success", message: t("profile.profileSaved") });
    } catch (error) {
      onFeedback({
        tone: "error",
        message: getApiErrorMessage(error, t("profile.profileError")),
      });
    }
  };

  return (
    <SettingsCard
      version={version}
      title={t("profile.detailsHeading")}
      description={t("profile.identityHint")}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="settings-full-name"
              className={`mb-1.5 block text-sm font-medium ${settingsTextClass(version, "primary")}`}
            >
              {t("profile.fullName")}
            </label>
            <input
              id="settings-full-name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              className={settingsInputClass(version)}
            />
          </div>

          <div>
            <label
              htmlFor="settings-email"
              className={`mb-1.5 block text-sm font-medium ${settingsTextClass(version, "primary")}`}
            >
              {t("profile.email")}
            </label>
            <input
              id="settings-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              spellCheck={false}
              required
              className={settingsInputClass(version)}
            />
          </div>

          <div>
            <label
              htmlFor="settings-birthday"
              className={`mb-1.5 block text-sm font-medium ${settingsTextClass(version, "primary")}`}
            >
              {t("profile.birthday")}
            </label>
            <input
              id="settings-birthday"
              name="dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              autoComplete="bday"
              className={settingsInputClass(version)}
            />
          </div>

          <div>
            <label
              htmlFor="settings-nationality"
              className={`mb-1.5 block text-sm font-medium ${settingsTextClass(version, "primary")}`}
            >
              {t("profile.nationality")}
            </label>
            <input
              id="settings-nationality"
              name="nationality"
              type="text"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              placeholder={t("profile.nationalityPlaceholder")}
              className={settingsInputClass(version)}
            />
          </div>
        </div>

        {feedback && (
          <SettingsFeedbackBanner
            version={version}
            tone={feedback.tone}
            message={feedback.message}
          />
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updateProfileMutation.isPending}
            className={settingsPrimaryButtonClass(version)}
          >
            <Save size={16} aria-hidden="true" />
            <span>
              {updateProfileMutation.isPending
                ? t("profile.savingProfile")
                : t("profile.saveProfile")}
            </span>
          </button>
        </div>
      </form>
    </SettingsCard>
  );
}

export default function ProfileSettingsSection({
  version,
}: {
  version: SettingsVersion;
}) {
  const { t } = useTranslation("settings");
  const isV2 = version === "v2";
  const userQuery = useCurrentUserQuery();
  const tasksQuery = useTasksQuery({ pageSize: 100 });
  const categoriesQuery = useCategoriesQuery();
  const updateAvatarMutation = useUpdateProfileMutation();
  const changePasswordMutation = useChangePasswordMutation();

  const user = userQuery.data ?? null;
  const [brokenAvatarUrl, setBrokenAvatarUrl] = useState("");
  const [avatarDraft, setAvatarDraft] = useState<string | null>(null);
  const [avatarFeedback, setAvatarFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [profileFeedback, setProfileFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordFeedback, setPasswordFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const stats = useMemo(() => {
    const rawTasks = tasksQuery.data;
    const tasks = Array.isArray(rawTasks) ? rawTasks : (rawTasks?.data ?? []);
    const categories = categoriesQuery.data ?? [];
    return {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((task) => task.status === "completed")
        .length,
      inProgressTasks: tasks.filter((task) => task.status === "in-progress")
        .length,
      totalCategories: categories.length,
    };
  }, [tasksQuery.data, categoriesQuery.data]);

  if (userQuery.isLoading) {
    return (
      <SettingsCard version={version}>
        <p
          className={`m-0 text-sm ${settingsTextClass(version, "muted")}`}
          role="status"
        >
          {t("profile.loading")}
        </p>
      </SettingsCard>
    );
  }

  if (!user) {
    return (
      <SettingsCard version={version}>
        <div className="space-y-3">
          <SettingsFeedbackBanner
            version={version}
            tone="error"
            message={t("profile.loadError")}
          />
          <button
            type="button"
            onClick={() => void userQuery.refetch()}
            className={settingsSecondaryButtonClass(version)}
          >
            {t("profile.retry")}
          </button>
        </div>
      </SettingsCard>
    );
  }

  const avatarUrl =
    typeof user.avatarUrl === "string" ? user.avatarUrl.trim() : "";
  const effectiveAvatarInput = avatarDraft ?? avatarUrl;
  const hasAvatarImage = Boolean(avatarUrl) && brokenAvatarUrl !== avatarUrl;
  const initial = (user.name?.trim() || user.email?.trim() || "U")
    .charAt(0)
    .toUpperCase();
  const memberSince = formatMemberSince(user.createdAt);

  const handleAvatarSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setAvatarFeedback(null);
    const trimmed = effectiveAvatarInput.trim();
    try {
      await updateAvatarMutation.mutateAsync({ avatarUrl: trimmed });
      setBrokenAvatarUrl("");
      setAvatarDraft(trimmed);
      setAvatarFeedback({ tone: "success", message: t("profile.avatarSaved") });
    } catch (error) {
      setAvatarFeedback({
        tone: "error",
        message: getApiErrorMessage(error, t("profile.avatarError")),
      });
    }
  };

  const handlePasswordSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordFeedback(null);
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        tone: "error",
        message: t("profile.passwordMismatch"),
      });
      return;
    }
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordFeedback({
        tone: "success",
        message: t("profile.passwordSaved"),
      });
    } catch (error) {
      setPasswordFeedback({
        tone: "error",
        message: getApiErrorMessage(error, t("profile.passwordError")),
      });
    }
  };

  const statTileClass = isV2
    ? "rounded-[16px] border border-[var(--v2-border)] bg-[var(--v2-shell-fill)] px-3.5 py-3"
    : "rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-muted)] px-3.5 py-3";

  return (
    <div className="space-y-5">
      <SettingsCard version={version} title={t("profile.identityHeading")}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--v2-glass-border,var(--color-line))] bg-[color-mix(in_srgb,var(--v2-accent,var(--color-accent))_14%,var(--v2-surface-solid,var(--color-surface)))] text-2xl font-bold text-[var(--v2-accent,var(--color-accent))]">
            {hasAvatarImage ? (
              <img
                src={avatarUrl}
                alt={user.name || t("profile.avatarHeading")}
                width={80}
                height={80}
                className="h-full w-full object-cover"
                onError={() => setBrokenAvatarUrl(avatarUrl)}
              />
            ) : (
              <span aria-hidden="true">{initial}</span>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <p
              className={`m-0 text-lg font-semibold truncate ${settingsTextClass(version, "primary")}`}
            >
              {user.name}
            </p>
            <p
              className={`m-0 text-sm break-all ${settingsTextClass(version, "muted")}`}
            >
              {user.email}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isV2
                    ? "bg-[color-mix(in_srgb,var(--v2-accent)_14%,transparent)] text-[var(--v2-accent)]"
                    : "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                }`}
              >
                {user.role || "USER"}
              </span>
              {memberSince && (
                <span
                  className={`text-xs ${settingsTextClass(version, "muted")}`}
                >
                  {t("profile.memberSince", { date: memberSince })}
                </span>
              )}
            </div>
          </div>
        </div>

        <form
          onSubmit={(e) => void handleAvatarSubmit(e)}
          className={`mt-5 pt-4 border-t ${settingsBorderClass(version)} space-y-3`}
        >
          <label
            htmlFor="settings-avatar-url"
            className={`block text-sm font-medium ${settingsTextClass(version, "primary")}`}
          >
            {t("profile.avatarUrlLabel")}
          </label>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <input
              id="settings-avatar-url"
              name="avatarUrl"
              type="url"
              value={effectiveAvatarInput}
              onChange={(e) => setAvatarDraft(e.target.value)}
              placeholder={t("profile.avatarUrlPlaceholder")}
              autoComplete="url"
              spellCheck={false}
              className={`${settingsInputClass(version)} flex-1`}
            />
            <button
              type="submit"
              disabled={updateAvatarMutation.isPending}
              className={`${settingsSecondaryButtonClass(version)} shrink-0`}
            >
              <Camera size={16} aria-hidden="true" />
              <span>
                {updateAvatarMutation.isPending
                  ? t("profile.updatingAvatar")
                  : t("profile.updateAvatar")}
              </span>
            </button>
          </div>
          {avatarFeedback && (
            <SettingsFeedbackBanner
              version={version}
              tone={avatarFeedback.tone}
              message={avatarFeedback.message}
            />
          )}
        </form>

        <div
          className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"
          aria-label={t("profile.statsHeading")}
        >
          {[
            { label: t("profile.totalTasks"), value: stats.totalTasks },
            { label: t("profile.completedTasks"), value: stats.completedTasks },
            {
              label: t("profile.inProgressTasks"),
              value: stats.inProgressTasks,
            },
            {
              label: t("profile.categoriesCount"),
              value: stats.totalCategories,
            },
          ].map((item) => (
            <div key={item.label} className={statTileClass}>
              <p
                className={`m-0 text-xs font-medium ${settingsTextClass(version, "muted")}`}
              >
                {item.label}
              </p>
              <p
                className={`mt-1 mb-0 text-xl font-bold tabular-nums ${settingsTextClass(version, "primary")}`}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </SettingsCard>

      <ProfileDetailsForm
        key={`${user._id ?? user.id ?? user.email}-${user.updatedAt ?? ""}`}
        version={version}
        user={user}
        feedback={profileFeedback}
        onFeedback={setProfileFeedback}
      />

      <SettingsCard
        version={version}
        title={t("profile.securityHeading")}
        description={t("profile.securityHint")}
      >
        <form
          onSubmit={(e) => void handlePasswordSubmit(e)}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                id: "settings-current-password",
                field: "current" as const,
                label: t("profile.currentPassword"),
                value: currentPassword,
                onChange: setCurrentPassword,
                autoComplete: "current-password",
              },
              {
                id: "settings-new-password",
                field: "new" as const,
                label: t("profile.newPassword"),
                value: newPassword,
                onChange: setNewPassword,
                autoComplete: "new-password",
              },
              {
                id: "settings-confirm-password",
                field: "confirm" as const,
                label: t("profile.confirmPassword"),
                value: confirmPassword,
                onChange: setConfirmPassword,
                autoComplete: "new-password",
              },
            ].map((input) => (
              <div key={input.id}>
                <label
                  htmlFor={input.id}
                  className={`mb-1.5 block text-sm font-medium ${settingsTextClass(version, "primary")}`}
                >
                  {input.label}
                </label>
                <div className="relative">
                  <input
                    id={input.id}
                    type={showPasswords[input.field] ? "text" : "password"}
                    value={input.value}
                    onChange={(e) => {
                      input.onChange(e.target.value);
                      if (passwordFeedback) setPasswordFeedback(null);
                    }}
                    autoComplete={input.autoComplete}
                    required
                    className={`${settingsInputClass(version)} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords((prev) => ({
                        ...prev,
                        [input.field]: !prev[input.field],
                      }))
                    }
                    aria-label={
                      showPasswords[input.field]
                        ? t("profile.hidePassword")
                        : t("profile.showPassword")
                    }
                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-[10px] border-0 bg-transparent cursor-pointer ${settingsTextClass(version, "muted")}`}
                  >
                    {showPasswords[input.field] ? (
                      <EyeOff size={16} aria-hidden="true" />
                    ) : (
                      <Eye size={16} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {passwordFeedback && (
            <SettingsFeedbackBanner
              version={version}
              tone={passwordFeedback.tone}
              message={passwordFeedback.message}
            />
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className={settingsSecondaryButtonClass(version)}
            >
              <KeyRound size={16} aria-hidden="true" />
              <span>
                {changePasswordMutation.isPending
                  ? t("profile.changingPassword")
                  : t("profile.changePassword")}
              </span>
            </button>
          </div>
        </form>
      </SettingsCard>
    </div>
  );
}
