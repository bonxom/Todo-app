import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, BellRing } from "lucide-react";
import { useSettingsStore } from "@/stores/useSettingsStore";
import {
  DEFAULT_PUSH_PREFS,
  disableBrowserPush,
  enableBrowserPush,
  loadBrowserPushState,
  updateBrowserPushPrefs,
  type BrowserPushState,
} from "@/features/notifications/lib/pushSubscription";
import type { PushPreferences } from "@/shared/types/notification";
import type { SettingsVersion } from "../types";
import {
  SettingsCard,
  SettingsSegmentedControl,
  SettingsToggleRow,
} from "./SettingsPrimitives";
import {
  settingsBorderClass,
  settingsSecondaryButtonClass,
  settingsTextClass,
} from "./settingsStyles";

const INITIAL_PUSH_STATE: BrowserPushState = {
  status: "loading",
  permission: "default",
  serverSupported: false,
  subscribed: false,
  endpoint: null,
  prefs: DEFAULT_PUSH_PREFS,
};

function getPushStatusBadgeStyle(
  status: BrowserPushState["status"],
  version: SettingsVersion,
): string {
  const isV2 = version === "v2";
  if (status === "enabled") {
    return isV2
      ? "bg-[color-mix(in_srgb,var(--v2-accent)_16%,transparent)] text-[var(--v2-accent)] border-[color-mix(in_srgb,var(--v2-accent)_32%,transparent)]"
      : "bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-transparent";
  }
  if (status === "denied") {
    return isV2
      ? "bg-rose-500/12 text-rose-500 border-rose-500/25"
      : "bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-transparent";
  }
  return isV2
    ? "bg-[var(--v2-input-fill)] text-[var(--v2-muted)] border-[var(--v2-border)]"
    : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] border-[var(--color-line)]";
}

export default function NotificationsSettingsSection({
  version,
}: {
  version: SettingsVersion;
}) {
  const { t } = useTranslation("settings");
  const notifications = useSettingsStore((state) => state.notifications);
  const updateNotifications = useSettingsStore(
    (state) => state.updateNotifications,
  );
  const historyPath = version === "v2" ? "/v2/notifications" : "/notifications";

  const [pushState, setPushState] =
    useState<BrowserPushState>(INITIAL_PUSH_STATE);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadBrowserPushState()
      .then((nextState) => {
        if (!cancelled) {
          setPushState(nextState);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPushState({
            ...INITIAL_PUSH_STATE,
            status: "disabled",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggleMasterPush = async (nextEnabled: boolean) => {
    setPushBusy(true);
    setPushError(null);
    try {
      if (nextEnabled) {
        const res = await enableBrowserPush(pushState.prefs);
        setPushState({
          status: "enabled",
          permission: "granted",
          serverSupported: true,
          subscribed: true,
          endpoint: res.endpoint,
          prefs: res.prefs,
        });
      } else {
        await disableBrowserPush(pushState.endpoint);
        setPushState((prev) => ({
          ...prev,
          status: "disabled",
          subscribed: false,
          endpoint: null,
        }));
      }
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "push_permission_denied") {
        setPushState((prev) => ({
          ...prev,
          status: "denied",
          permission: "denied",
          subscribed: false,
          endpoint: null,
        }));
      } else if (code === "push_not_configured") {
        setPushState((prev) => ({
          ...prev,
          status: "unconfigured",
          serverSupported: false,
          subscribed: false,
        }));
      } else if (code === "push_unsupported") {
        setPushState((prev) => ({
          ...prev,
          status: "unsupported",
          permission: "unsupported",
          subscribed: false,
        }));
      } else {
        setPushError(t("notifications.pushErrorGeneric"));
      }
    } finally {
      setPushBusy(false);
    }
  };

  const handleToggleCategory = async (
    key: keyof PushPreferences,
    value: boolean,
  ) => {
    if (!pushState.endpoint || !pushState.subscribed) return;
    setPushBusy(true);
    setPushError(null);
    try {
      const res = await updateBrowserPushPrefs(pushState.endpoint, {
        [key]: value,
      });
      setPushState((prev) => ({
        ...prev,
        prefs: res.prefs ?? { ...prev.prefs, [key]: value },
      }));
    } catch {
      setPushError(t("notifications.pushErrorGeneric"));
    } finally {
      setPushBusy(false);
    }
  };

  const statusLabelKey: Record<BrowserPushState["status"], string> = {
    loading: "notifications.pushStatusLoading",
    enabled: "notifications.pushStatusEnabled",
    disabled: "notifications.pushStatusDisabled",
    denied: "notifications.pushStatusDenied",
    unconfigured: "notifications.pushStatusUnconfigured",
    unsupported: "notifications.pushStatusUnsupported",
  };

  const masterDisabled =
    pushBusy ||
    pushState.status === "loading" ||
    pushState.status === "unsupported" ||
    pushState.status === "unconfigured" ||
    pushState.status === "denied";

  const categoriesDisabled = pushBusy || !pushState.subscribed;

  const blockerHint =
    pushState.status === "denied"
      ? t("notifications.pushDeniedHint")
      : pushState.status === "unconfigured"
        ? t("notifications.pushUnconfiguredHint")
        : pushState.status === "unsupported"
          ? t("notifications.pushUnsupportedHint")
          : null;

  return (
    <SettingsCard
      version={version}
      title={t("notifications.heading")}
      description={t("notifications.description")}
      action={
        <Link
          to={historyPath}
          className={`${settingsSecondaryButtonClass(version)} [text-decoration:none]`}
        >
          <span>{t("notifications.openHistory")}</span>
          <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      }
    >
      <div className="space-y-1">
        <SettingsToggleRow
          version={version}
          id="settings-notif-badge"
          label={t("notifications.showBadgeLabel")}
          description={t("notifications.showBadgeHint")}
          checked={notifications.showUnreadBadge}
          onChange={(showUnreadBadge) =>
            updateNotifications({ showUnreadBadge })
          }
        />

        <SettingsToggleRow
          version={version}
          id="settings-notif-autorefresh"
          label={t("notifications.autoRefreshLabel")}
          description={t("notifications.autoRefreshHint")}
          checked={notifications.autoRefresh}
          onChange={(autoRefresh) => updateNotifications({ autoRefresh })}
        />

        <div
          className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4 border-t ${settingsBorderClass(version)}`}
        >
          <div className="space-y-0.5">
            <p
              className={`m-0 text-sm font-semibold ${settingsTextClass(version, "primary")}`}
            >
              {t("notifications.defaultFilterLabel")}
            </p>
            <p
              className={`m-0 text-xs sm:text-sm ${settingsTextClass(version, "muted")}`}
            >
              {t("notifications.defaultFilterHint")}
            </p>
          </div>

          <SettingsSegmentedControl
            version={version}
            label={t("notifications.defaultFilterLabel")}
            value={notifications.defaultFilter}
            onChange={(defaultFilter) => updateNotifications({ defaultFilter })}
            options={[
              { value: "all", label: t("notifications.filterAll") },
              { value: "unread", label: t("notifications.filterUnread") },
            ]}
          />
        </div>

        <div
          className={`pt-4 border-t space-y-2 ${settingsBorderClass(version)}`}
          data-testid="settings-push-section"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
            <div className="flex items-center gap-2 min-w-0">
              <BellRing
                size={16}
                className={settingsTextClass(version, "muted")}
                aria-hidden="true"
              />
              <h3
                className={`m-0 text-sm font-semibold ${settingsTextClass(version, "primary")}`}
              >
                {t("notifications.pushHeading")}
              </h3>
            </div>
            <span
              data-testid="settings-push-status-badge"
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getPushStatusBadgeStyle(pushState.status, version)}`}
            >
              {t(statusLabelKey[pushState.status])}
            </span>
          </div>

          <p
            className={`m-0 text-xs sm:text-sm leading-relaxed ${settingsTextClass(version, "muted")}`}
          >
            {t("notifications.pushDescription")}
          </p>

          <SettingsToggleRow
            version={version}
            id="settings-notif-push-master"
            label={t("notifications.pushMasterLabel")}
            description={t("notifications.pushMasterHint")}
            checked={pushState.subscribed}
            disabled={masterDisabled}
            onChange={(checked) => void handleToggleMasterPush(checked)}
          />

          <div className={categoriesDisabled ? "opacity-65" : undefined}>
            <SettingsToggleRow
              version={version}
              id="settings-notif-push-deadlines"
              label={t("notifications.pushDeadlinesLabel")}
              description={t("notifications.pushDeadlinesHint")}
              checked={pushState.prefs.taskDeadlines}
              disabled={categoriesDisabled}
              onChange={(checked) =>
                void handleToggleCategory("taskDeadlines", checked)
              }
            />

            <SettingsToggleRow
              version={version}
              id="settings-notif-push-agent"
              label={t("notifications.pushAgentRepliesLabel")}
              description={t("notifications.pushAgentRepliesHint")}
              checked={pushState.prefs.agentReplies}
              disabled={categoriesDisabled}
              onChange={(checked) =>
                void handleToggleCategory("agentReplies", checked)
              }
            />
          </div>

          {blockerHint ? (
            <p
              role="status"
              className={`m-0 rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm ${settingsBorderClass(version)} ${settingsTextClass(version, "muted")}`}
            >
              {blockerHint}
            </p>
          ) : null}

          {pushError ? (
            <p
              role="alert"
              className="m-0 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs sm:text-sm text-rose-500"
            >
              {pushError}
            </p>
          ) : null}
        </div>
      </div>
    </SettingsCard>
  );
}
