import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RotateCcw } from "lucide-react";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { DEFAULT_V2_PALETTE, setV2Palette } from "@/shared/theme/v2Palettes";
import {
  isSettingsSectionId,
  type SettingsSectionId,
  type SettingsVersion,
} from "./types";
import SettingsNav from "./components/SettingsNav";
import ProfileSettingsSection from "./components/ProfileSettingsSection";
import AppearanceSettingsSection from "./components/AppearanceSettingsSection";
import NotificationsSettingsSection from "./components/NotificationsSettingsSection";
import WorkspaceSettingsSection from "./components/WorkspaceSettingsSection";
import AgentSettingsSection from "./components/AgentSettingsSection";
import { SettingsFeedbackBanner } from "./components/SettingsPrimitives";
import {
  settingsSecondaryButtonClass,
  settingsTextClass,
} from "./components/settingsStyles";

export default function SettingsWorkspace({
  version,
}: {
  version: SettingsVersion;
}) {
  const { t } = useTranslation("settings");
  const [searchParams, setSearchParams] = useSearchParams();
  const resetSettings = useSettingsStore((state) => state.resetSettings);
  const [resetMessage, setResetMessage] = useState("");

  const paramSection = searchParams.get("section");
  const activeSection: SettingsSectionId = isSettingsSectionId(paramSection)
    ? paramSection
    : "profile";

  const handleSelectSection = (section: SettingsSectionId) => {
    setResetMessage("");
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (section === "profile") {
          next.delete("section");
        } else {
          next.set("section", section);
        }
        return next;
      },
      { replace: true },
    );
  };

  const handleResetPreferences = () => {
    resetSettings();
    if (version === "v2") {
      setV2Palette(DEFAULT_V2_PALETTE);
    }
    setResetMessage(t("resetDone"));
  };

  const isV2 = version === "v2";

  return (
    <div
      data-testid={isV2 ? "v2-settings-page" : "v1-settings-page"}
      className={
        isV2
          ? "flex flex-col gap-6"
          : "ui-page-shell mx-auto flex flex-col gap-6"
      }
    >
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1
            className={
              isV2
                ? "sr-only"
                : "ui-page-title m-0 text-[var(--color-text)] [font-weight:650] text-balance"
            }
          >
            {t("title")}
          </h1>
          <p
            className={`m-0 max-w-[66ch] text-sm sm:text-[15px] leading-relaxed ${settingsTextClass(version, "muted")}`}
          >
            {t("subtitle")}
          </p>
          <p
            className={`m-0 text-xs leading-relaxed ${settingsTextClass(version, "muted")}`}
          >
            {t("localOnlyNote")}
          </p>
        </div>

        <div className="lg:hidden shrink-0">
          <button
            type="button"
            onClick={handleResetPreferences}
            className={settingsSecondaryButtonClass(version)}
          >
            <RotateCcw size={15} aria-hidden="true" />
            <span>{t("resetAll")}</span>
          </button>
        </div>
      </header>

      {resetMessage && (
        <SettingsFeedbackBanner
          version={version}
          tone="success"
          message={resetMessage}
        />
      )}

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[248px_minmax(0,1fr)] lg:items-start">
        <SettingsNav
          version={version}
          activeSection={activeSection}
          onSelectSection={handleSelectSection}
          onResetPreferences={handleResetPreferences}
        />

        <div className="min-w-0">
          {activeSection === "profile" && (
            <ProfileSettingsSection version={version} />
          )}
          {activeSection === "appearance" && (
            <AppearanceSettingsSection version={version} />
          )}
          {activeSection === "notifications" && (
            <NotificationsSettingsSection version={version} />
          )}
          {activeSection === "workspace" && (
            <WorkspaceSettingsSection version={version} />
          )}
          {activeSection === "agent" && (
            <AgentSettingsSection version={version} />
          )}
        </div>
      </div>
    </div>
  );
}
