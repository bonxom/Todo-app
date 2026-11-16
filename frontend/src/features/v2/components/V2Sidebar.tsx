import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BotMessageSquare,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Orbit,
} from "lucide-react";
import { useLogoutMutation } from "@/features/auth/api/authMutations";

export interface V2SidebarProps {
  onNavigate?: () => void;
  className?: string;
}

const NAV_ITEMS = [
  { to: "/v2/dashboard", label: "dashboard", Icon: LayoutDashboard },
  { to: "/v2/agents", label: "agents", Icon: BotMessageSquare },
  { to: "/v2/calendar", label: "calendar", Icon: CalendarDays },
] as const;

export default function V2Sidebar({
  onNavigate,
  className = "",
}: V2SidebarProps) {
  const { t } = useTranslation("v2");
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useLogoutMutation();

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
    <aside className={`v2-navigation ${className}`} aria-label="Orbit">
      <Link
        to="/v2/dashboard"
        className="v2-brand"
        onClick={onNavigate}
        aria-label="Orbit"
      >
        <span className="v2-brand-symbol">
          <Orbit size={28} strokeWidth={1.5} />
        </span>
        <span>
          orbit<span className="v2-brand-dot">.</span>
        </span>
      </Link>
      <nav aria-label={t("dashboard")}>
        {NAV_ITEMS.map(({ to, label, Icon }) => {
          const isActive = activeTo === to;
          return (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              className="v2-nav-item"
              data-active={isActive}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={21} strokeWidth={1.7} aria-hidden="true" />
              <span>{t(label)}</span>
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        className="v2-nav-item v2-signout"
        onClick={() => void signOut()}
        disabled={logout.isPending}
      >
        <LogOut size={19} aria-hidden="true" />
        <span>{t("signOut")}</span>
      </button>
    </aside>
  );
}
