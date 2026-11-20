import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, Globe, Moon, Sparkles, Sun, Layers } from "lucide-react";
import { useTheme } from "@/shared/theme/theme";
import { useV2Palette } from "@/shared/theme/v2Palettes";
import { setLanguage } from "@/shared/i18n";
import { savePreferredVersion } from "@/shared/navigation/versionPreference";
import type { SettingsVersion } from "../types";
import { SettingsCard, SettingsSegmentedControl } from "./SettingsPrimitives";
import { settingsBorderClass, settingsTextClass } from "./settingsStyles";

export default function AppearanceSettingsSection({
  version,
}: {
  version: SettingsVersion;
}) {
  const { t, i18n } = useTranslation(["settings", "v2"]);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { palette, setPalette, palettes } = useV2Palette();
  const isV2 = version === "v2";
  const currentLang = i18n.resolvedLanguage === "vi" ? "vi" : "en";

  const handleVersionSelect = (target: SettingsVersion) => {
    savePreferredVersion(target);
    if (target !== version) {
      navigate(
        target === "v2"
          ? "/v2/settings?section=appearance"
          : "/settings?section=appearance",
      );
    }
  };

  return (
    <div className="space-y-5">
      <SettingsCard
        version={version}
        title={t("settings:appearance.heading")}
        description={t("settings:appearance.description")}
      >
        <div className="space-y-5">
          {/* Light / Dark Mode */}
          <div
            className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-5 border-b ${settingsBorderClass(version)}`}
          >
            <div className="space-y-0.5">
              <p
                className={`m-0 text-sm font-semibold ${settingsTextClass(version, "primary")}`}
              >
                {t("settings:appearance.themeLabel")}
              </p>
              <p
                className={`m-0 text-xs sm:text-sm ${settingsTextClass(version, "muted")}`}
              >
                {t("settings:appearance.themeHint")}
              </p>
            </div>
            <SettingsSegmentedControl
              version={version}
              label={t("settings:appearance.themeLabel")}
              value={theme}
              onChange={setTheme}
              options={[
                {
                  value: "light",
                  label: t("settings:appearance.light"),
                  icon: <Sun size={15} aria-hidden="true" />,
                },
                {
                  value: "dark",
                  label: t("settings:appearance.dark"),
                  icon: <Moon size={15} aria-hidden="true" />,
                },
              ]}
            />
          </div>

          {/* V2-Only Color Palette Selector */}
          {isV2 && (
            <div
              data-testid="v2-palette-picker"
              className={`pb-5 border-b ${settingsBorderClass(version)} space-y-3`}
            >
              <div className="space-y-0.5">
                <p
                  className={`m-0 text-sm font-semibold ${settingsTextClass(version, "primary")}`}
                >
                  {t("settings:appearance.paletteLabel")}
                </p>
                <p
                  className={`m-0 text-xs sm:text-sm ${settingsTextClass(version, "muted")}`}
                >
                  {t("settings:appearance.paletteHint")}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {palettes.map((item) => {
                  const isSelected = palette === item.id;
                  const swatch =
                    theme === "dark" ? item.preview.dark : item.preview.light;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-testid={`v2-palette-option-${item.id}`}
                      aria-pressed={isSelected}
                      onClick={() => setPalette(item.id)}
                      className={`group flex flex-col gap-3 rounded-[18px] border p-3.5 text-left cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? "border-[var(--v2-accent)] bg-[color-mix(in_srgb,var(--v2-accent)_10%,var(--v2-surface-solid))] shadow-sm"
                          : "border-[var(--v2-border)] bg-[var(--v2-shell-fill)] hover:bg-[var(--v2-input-fill)]"
                      }`}
                    >
                      {/* Miniature Liquid Glass Preview */}
                      <div
                        className="relative h-20 w-full overflow-hidden rounded-[12px] border border-white/40 p-2.5 flex gap-2"
                        style={{
                          background: `radial-gradient(circle at 85% 15%, ${swatch.accentSoft}, transparent 60%), ${swatch.canvas}`,
                        }}
                        aria-hidden="true"
                      >
                        <div
                          className="w-7 rounded-[7px] border border-white/30"
                          style={{ background: swatch.surface, opacity: 0.88 }}
                        />
                        <div
                          className="flex-1 rounded-[8px] border border-white/30 p-2 flex flex-col justify-between"
                          style={{ background: swatch.surface, opacity: 0.92 }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className="h-2.5 w-10 rounded-full"
                              style={{ background: swatch.accent }}
                            />
                            <span
                              className="h-2 w-6 rounded-full opacity-35"
                              style={{ background: swatch.accent }}
                            />
                          </div>
                          <div className="flex gap-1.5">
                            <span
                              className="h-3 flex-1 rounded-[5px] opacity-25"
                              style={{ background: swatch.accent }}
                            />
                            <span
                              className="h-3 w-7 rounded-[5px]"
                              style={{ background: swatch.accent }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <span className="block text-sm font-semibold text-[var(--v2-ink)]">
                            {t(`v2:${item.labelKey}`)}
                          </span>
                          <span className="block text-xs text-[var(--v2-muted)] leading-snug">
                            {t(`v2:${item.descriptionKey}`)}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--v2-accent)] px-2 py-0.5 text-[11px] font-semibold text-[var(--v2-accent-ink)]">
                            <Check size={12} aria-hidden="true" />
                            <span>
                              {t("settings:appearance.paletteActive")}
                            </span>
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Language */}
          <div
            className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-5 border-b ${settingsBorderClass(version)}`}
          >
            <div className="space-y-0.5">
              <p
                className={`m-0 text-sm font-semibold ${settingsTextClass(version, "primary")}`}
              >
                {t("settings:appearance.languageLabel")}
              </p>
              <p
                className={`m-0 text-xs sm:text-sm ${settingsTextClass(version, "muted")}`}
              >
                {t("settings:appearance.languageHint")}
              </p>
            </div>
            <SettingsSegmentedControl
              version={version}
              label={t("settings:appearance.languageLabel")}
              value={currentLang}
              onChange={(lang) => void setLanguage(lang)}
              options={[
                {
                  value: "en",
                  label: "English",
                  icon: <Globe size={15} aria-hidden="true" />,
                },
                {
                  value: "vi",
                  label: "Tiếng Việt",
                  icon: <Globe size={15} aria-hidden="true" />,
                },
              ]}
            />
          </div>

          {/* Interface Version */}
          <div className="space-y-3">
            <div className="space-y-0.5">
              <p
                className={`m-0 text-sm font-semibold ${settingsTextClass(version, "primary")}`}
              >
                {t("settings:appearance.versionLabel")}
              </p>
              <p
                className={`m-0 text-xs sm:text-sm ${settingsTextClass(version, "muted")}`}
              >
                {t("settings:appearance.versionHint")}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  {
                    id: "v1" as const,
                    title: t("settings:appearance.versionV1"),
                    hint: t("settings:appearance.versionV1Hint"),
                    Icon: Layers,
                  },
                  {
                    id: "v2" as const,
                    title: t("settings:appearance.versionV2"),
                    hint: t("settings:appearance.versionV2Hint"),
                    Icon: Sparkles,
                  },
                ] as const
              ).map(({ id, title, hint, Icon }) => {
                const active = version === id;
                const activeCard = isV2
                  ? "border-[var(--v2-accent)] bg-[color-mix(in_srgb,var(--v2-accent)_10%,var(--v2-surface-solid))]"
                  : "border-[var(--color-accent)] bg-[var(--color-accent-soft)]";
                const idleCard = isV2
                  ? "border-[var(--v2-border)] bg-[var(--v2-shell-fill)] hover:bg-[var(--v2-input-fill)]"
                  : "border-[var(--color-line)] bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface)]";
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleVersionSelect(id)}
                    className={`flex items-start gap-3 rounded-[16px] border p-4 text-left cursor-pointer transition-colors duration-150 ${
                      active ? activeCard : idleCard
                    }`}
                  >
                    <Icon
                      size={18}
                      className={`mt-0.5 shrink-0 ${
                        active
                          ? isV2
                            ? "text-[var(--v2-accent)]"
                            : "text-[var(--color-accent)]"
                          : settingsTextClass(version, "muted")
                      }`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-sm font-semibold ${settingsTextClass(version, "primary")}`}
                      >
                        {title}
                      </span>
                      <span
                        className={`mt-0.5 block text-xs leading-relaxed ${settingsTextClass(version, "muted")}`}
                      >
                        {hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
