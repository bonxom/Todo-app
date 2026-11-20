import type { Ref } from "react";
import NotificationBell from "@/features/notifications/components/NotificationBell";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { ChevronRight, Menu, Sun, Moon } from "lucide-react";
import { getLocale, setLanguage } from "@/shared/i18n";
import { useTheme } from "@/shared/theme/theme";
import VersionSwitcher from "@/shared/components/VersionSwitcher";

export interface V2TopbarProps {
  onOpenNavigation: () => void;
  assistantSlotRef?: Ref<HTMLDivElement>;
}

export default function V2Topbar({
  onOpenNavigation,
  assistantSlotRef,
}: V2TopbarProps) {
  const { t, i18n } = useTranslation(["v2", "common"]);
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const sectionTitle = location.pathname.startsWith("/v2/notifications")
    ? t("common:notifications.title")
    : location.pathname.startsWith("/v2/agents")
      ? t("v2:agents")
      : location.pathname.startsWith("/v2/calendar")
        ? t("v2:calendar")
        : location.pathname.startsWith("/v2/statistics")
          ? t("v2:statistics")
          : t("v2:dashboard");

  const isDark = theme === "dark";
  const formattedDate = new Intl.DateTimeFormat(getLocale(), {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date());

  const isVi = i18n.resolvedLanguage === "vi";

  return (
    <header
      className="v2-topbar rounded-[var(--v2-radius-card)] items-center justify-between relative z-5
      [@media(max-width:767px)]:rounded-[20px] [@media(max-width:767px)]:[&_>_div:last-child]:ml-auto
      [@media(forced-colors:active)]:text-[CanvasText] [&::before]:absolute [&::before]:top-[0]
      [&::before]:left-[4%] [&::before]:right-[4%] [&::before]:h-[1px] [&::before]:pointer-events-none
      [&_>_div:first-child_>_div_>_p:first-child]:items-center"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenNavigation}
          className="v2-btn v2-mobile-menu p-2"
          aria-label={t("v2:openMenu")}
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <div>
          <p className="text-base sm:text-lg font-semibold text-[var(--v2-ink)] leading-tight">
            <span className="v2-breadcrumb-root inline-flex items-center gap-[8px] text-[var(--v2-muted)] [font-weight:400] [@media(max-width:767px)]:[display:none]">
              Orbit <ChevronRight size={14} aria-hidden="true" />
            </span>
            {sectionTitle}
          </p>
          <p className="text-xs text-[var(--v2-muted)] font-normal">
            {formattedDate}
          </p>
        </div>
      </div>

      <div className="v2-topbar-actions flex items-center ml-auto flex-wrap">
        <div className="v2-topbar-utilities flex items-center gap-[10px] [@media(max-width:767px)]:gap-[8px]">
          {/* Language switch */}
          <button
            type="button"
            onClick={() => void setLanguage(isVi ? "en" : "vi")}
            className="v2-btn px-2.5 py-1 text-xs font-semibold"
            aria-label={t("common:language")}
          >
            {isVi ? "EN" : "VI"}
          </button>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="v2-btn p-2 min-h-0"
            aria-label={t(isDark ? "common:theme.light" : "common:theme.dark")}
          >
            {isDark ? (
              <Sun size={17} aria-hidden="true" />
            ) : (
              <Moon size={17} aria-hidden="true" />
            )}
          </button>

          {/* Version Switcher */}
          <VersionSwitcher className="v2-btn font-semibold text-xs sm:text-sm" />
        </div>
        <div className="v2-topbar-primary flex items-center gap-[10px] [@media(max-width:767px)]:gap-[8px]">
          <div ref={assistantSlotRef} className="v2-assistant-slot flex" />
          <NotificationBell version="v2" />
        </div>
      </div>
    </header>
  );
}
