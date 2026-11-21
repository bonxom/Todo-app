import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowUpRight } from "lucide-react";
import { useSettingsStore } from "@/stores/useSettingsStore";
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
          className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t ${settingsBorderClass(version)}`}
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
      </div>
    </SettingsCard>
  );
}
