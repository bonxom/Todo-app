import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BotMessageSquare,
  CalendarDays,
  ChartNoAxesCombined,
  LayoutDashboard,
  LogOut,
  Orbit,
} from "lucide-react";
import { useLogoutMutation } from "@/features/auth/api/authMutations";
import { useAuthStore } from "@/stores/useAuthStore";

export interface V2SidebarProps {
  onNavigate?: () => void;
  className?: string;
  collapsed?: boolean;
  onHoverChange?: (hovered: boolean) => void;
  onFocusChange?: (focused: boolean) => void;
}

const NAV_ITEMS = [
  { to: "/v2/dashboard", label: "dashboard", Icon: LayoutDashboard },
  { to: "/v2/agents", label: "agents", Icon: BotMessageSquare },
  { to: "/v2/calendar", label: "calendar", Icon: CalendarDays },
  { to: "/v2/statistics", label: "statistics", Icon: ChartNoAxesCombined },
] as const;

export default function V2Sidebar({
  onNavigate,
  className = "",
  collapsed = false,
  onHoverChange,
  onFocusChange,
}: V2SidebarProps) {
  const { t } = useTranslation("v2");
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useLogoutMutation();
  const user = useAuthStore((state) => state.user);
  const [brokenAvatarUrl, setBrokenAvatarUrl] = useState("");

  const avatarUrl =
    typeof user?.avatarUrl === "string" ? user.avatarUrl.trim() : "";
  const showAvatarImage = Boolean(avatarUrl) && brokenAvatarUrl !== avatarUrl;
  const userInitial = (user?.name?.trim() || user?.email?.trim() || "U")
    .charAt(0)
    .toUpperCase();
  const displayName = user?.name?.trim() || t("settingsTitle");
  const isSettingsActive = location.pathname.startsWith("/v2/settings");

  const activeTo = NAV_ITEMS.reduce<string | null>((active, item) => {
    if (!location.pathname.startsWith(item.to)) return active;
    if (active && active.length >= item.to.length) return active;
    return item.to;
  }, null);

  const signOut = async () => {
    try {
      await logout.mutateAsync();
    } catch {
      /* Shared mutation clears session. */
    } finally {
      onNavigate?.();
      navigate("/");
    }
  };

  return (
    <aside
      data-collapsed={collapsed ? "true" : "false"}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") onHoverChange?.(true);
      }}
      onPointerLeave={() => {
        onHoverChange?.(false);
      }}
      onFocusCapture={(event) => {
        try {
          if (
            event.target instanceof Element &&
            event.target.matches(":focus-visible")
          ) {
            onFocusChange?.(true);
          }
        } catch {
          onFocusChange?.(true);
        }
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onFocusChange?.(false);
        }
      }}
      className={`v2-navigation [border:1px_solid_var(--v2-glass-border)] rounded-[var(--v2-radius-card)] flex flex-col relative isolate [@media(forced-colors:active)]:[border:1px_solid_ButtonBorder] [@media(forced-colors:active)]:text-[CanvasText] [&::before]:absolute [&::before]:inset-[3px] [&::before]:rounded-[21px] [&::before]:pointer-events-none [&::before]:z-[-1] [&_nav]:gap-[6px] ${className}`}
      aria-label="Orbit"
    >
      <div
        className={`flex items-center ${
          collapsed ? "justify-center" : "justify-start"
        }`}
      >
        <Link
          to="/v2/dashboard"
          className={`v2-brand flex items-center [letter-spacing:-1px] [text-decoration:none] ${
            collapsed ? "justify-center p-0" : "justify-start p-[0_6px]"
          }`}
          onClick={onNavigate}
          aria-label="Orbit"
          title="Orbit"
        >
          <span
            className="v2-brand-symbol grid place-items-center text-[var(--v2-accent)] [background:var(--v2-shell-fill)]
            [box-shadow:var(--v2-shadow-md)] [border:1px_solid_var(--v2-glass-border)] [&_svg]:w-[24px] shrink-0"
          >
            <Orbit size={28} strokeWidth={1.5} />
          </span>
          <span
            className={
              collapsed ? "sr-only" : "whitespace-nowrap overflow-hidden"
            }
          >
            orbit
            <span className="v2-brand-dot text-[var(--v2-accent)]">.</span>
          </span>
        </Link>
      </div>

      <nav aria-label={t("dashboard")}>
        {NAV_ITEMS.map(({ to, label, Icon }) => {
          const isActive = activeTo === to;
          const labelText = t(label);
          return (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              title={collapsed ? labelText : undefined}
              className={`v2-nav-item flex items-center [text-decoration:none] [transition:background_160ms,box-shadow_160ms,padding_200ms] [&_svg]:flex-[0_0_auto] ${
                collapsed ? "justify-center px-0!" : "justify-start"
              }`}
              data-active={isActive}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={21} strokeWidth={1.7} aria-hidden="true" />
              <span className={collapsed ? "sr-only" : "whitespace-nowrap"}>
                {labelText}
              </span>
            </Link>
          );
        })}
      </nav>

      <div
        data-testid="v2-sidebar-footer"
        className={`mt-auto pt-3 border-t border-[var(--v2-border)] flex items-center ${
          collapsed ? "flex-col gap-2" : "gap-1.5"
        }`}
      >
        <Link
          to="/v2/settings"
          onClick={onNavigate}
          data-testid="v2-sidebar-profile-link"
          data-active={isSettingsActive}
          aria-current={isSettingsActive ? "page" : undefined}
          aria-label={`${displayName} — ${t("settingsTitle")}`}
          title={`${displayName} — ${t("settingsTitle")}`}
          className={`rounded-[14px] flex items-center [text-decoration:none] border transition-[background-color,border-color,box-shadow] duration-150 ${
            collapsed
              ? "h-[44px] w-[44px] shrink-0 justify-center p-0"
              : "flex-1 min-w-0 min-h-[46px] px-2 py-1.5 gap-2.5"
          } ${
            isSettingsActive
              ? "text-[var(--v2-accent)] [background:linear-gradient(135deg,var(--v2-glass-fill),var(--v2-shell-fill))] border-[var(--v2-glass-border)] [box-shadow:var(--v2-shadow-md)]"
              : "border-transparent text-[var(--v2-ink)] hover:bg-[var(--v2-shell-fill)]"
          }`}
        >
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--v2-glass-border)] bg-[color-mix(in_srgb,var(--v2-accent)_16%,var(--v2-surface-solid))] text-xs font-bold text-[var(--v2-accent)] [box-shadow:var(--v2-shadow-sm)]">
            {showAvatarImage ? (
              <img
                src={avatarUrl}
                alt={displayName}
                width={36}
                height={36}
                className="h-full w-full object-cover"
                onError={() => setBrokenAvatarUrl(avatarUrl)}
              />
            ) : (
              <span aria-hidden="true">{userInitial}</span>
            )}
          </span>
          <span
            className={
              collapsed
                ? "sr-only"
                : "min-w-0 flex-1 flex flex-col leading-tight"
            }
          >
            <span className="truncate text-[12.5px] font-semibold text-[var(--v2-ink)]">
              {displayName}
            </span>
            <span className="truncate text-[11px] font-medium text-[var(--v2-muted)]">
              {t("settingsTitle")}
            </span>
          </span>
        </Link>

        <button
          type="button"
          className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[14px] border border-transparent text-[var(--v2-muted)] transition-[background-color,color,border-color] duration-150 hover:bg-[var(--v2-shell-fill)] hover:text-[var(--v2-ink)] cursor-pointer disabled:opacity-50"
          onClick={() => void signOut()}
          disabled={logout.isPending}
          aria-label={t("signOut")}
          title={t("signOut")}
        >
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
