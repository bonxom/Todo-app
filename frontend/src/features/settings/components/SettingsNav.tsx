import { useTranslation } from "react-i18next";
import {
  Bell,
  BotMessageSquare,
  FolderKanban,
  Palette,
  RotateCcw,
  UserCircle2,
} from "lucide-react";
import type { SettingsSectionId, SettingsVersion } from "../types";
import { settingsBorderClass, settingsTextClass } from "./settingsStyles";

const SECTION_ITEMS: ReadonlyArray<{
  id: SettingsSectionId;
  Icon: typeof UserCircle2;
}> = [
  { id: "profile", Icon: UserCircle2 },
  { id: "appearance", Icon: Palette },
  { id: "notifications", Icon: Bell },
  { id: "workspace", Icon: FolderKanban },
  { id: "agent", Icon: BotMessageSquare },
];

export interface SettingsNavProps {
  version: SettingsVersion;
  activeSection: SettingsSectionId;
  onSelectSection: (section: SettingsSectionId) => void;
  onResetPreferences: () => void;
}

export default function SettingsNav({
  version,
  activeSection,
  onSelectSection,
  onResetPreferences,
}: SettingsNavProps) {
  const { t } = useTranslation("settings");
  const isV2 = version === "v2";

  const containerClass = isV2
    ? "v2-glass-panel min-w-0 max-w-full overflow-hidden p-2.5 lg:p-3 lg:sticky lg:top-[24px]"
    : "ui-section-card min-w-0 max-w-full overflow-hidden p-2.5 lg:p-3 lg:sticky lg:top-[84px]";

  return (
    <nav aria-label={t("navLabel")} className={containerClass}>
      <div className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {SECTION_ITEMS.map(({ id, Icon }) => {
          const isActive = activeSection === id;
          const activeClass = isV2
            ? "bg-[color-mix(in_srgb,var(--v2-accent)_14%,var(--v2-input-fill))] !text-[var(--v2-accent)] border-[color-mix(in_srgb,var(--v2-accent)_30%,var(--v2-glass-border))] shadow-xs"
            : "bg-[var(--color-accent-soft)] !text-[var(--color-accent)] border-[color-mix(in_srgb,var(--color-accent)_26%,var(--color-line))]";
          const idleClass = isV2
            ? "bg-transparent !text-[var(--v2-ink)] border-transparent hover:bg-[var(--v2-shell-fill)]"
            : "bg-transparent !text-[var(--color-text)] border-transparent hover:bg-[var(--color-surface-muted)]";

          return (
            <button
              key={id}
              type="button"
              data-testid={`settings-tab-${id}`}
              data-active={isActive}
              aria-current={isActive ? "true" : undefined}
              onClick={() => onSelectSection(id)}
              className={`flex min-h-[44px] shrink-0 items-center gap-3 rounded-[14px] border px-3.5 py-2.5 text-left cursor-pointer transition-colors duration-150 lg:w-full ${
                isActive ? activeClass : idleClass
              }`}
            >
              <Icon
                size={18}
                strokeWidth={1.8}
                className="shrink-0"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block whitespace-nowrap lg:whitespace-normal text-sm font-semibold leading-tight">
                  {t(`sections.${id}.label`)}
                </span>
                <span
                  className={`hidden lg:block mt-0.5 text-xs leading-snug ${settingsTextClass(version, "muted")}`}
                >
                  {t(`sections.${id}.description`)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        className={`hidden lg:block mt-3 pt-3 border-t ${settingsBorderClass(version)}`}
      >
        <button
          type="button"
          onClick={onResetPreferences}
          className={`flex min-h-[44px] w-full items-center gap-2.5 rounded-[12px] border border-transparent bg-transparent px-3 py-2 text-xs font-semibold cursor-pointer transition-colors duration-150 ${settingsTextClass(version, "muted")} ${
            isV2
              ? "hover:bg-[var(--v2-shell-fill)] hover:text-[var(--v2-ink)]"
              : "hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
          }`}
        >
          <RotateCcw size={15} aria-hidden="true" />
          <span>{t("resetAll")}</span>
        </button>
      </div>
    </nav>
  );
}
